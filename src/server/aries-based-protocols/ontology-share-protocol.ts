import {Immutable, voidObs$} from "@project-utils";
import {bufferTime, map, mergeMap, shareReplay, tap} from "rxjs/operators";
import {
  catchError,
  filter,
  first,
  forkJoin,
  from,
  last,
  Observable,
  ReplaySubject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {
  connectToController$,
  deleteCredential,
  getHeldCredentials,
  getIssuedCredentials,
  offerCredentialFromProposal,
  proposeCredential,
  revokeCredential
} from "../aries-api";
import {subjectDataSchema, subjectsListSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {State} from "../state";
import {Server, Schemas} from '@project-types'
import {OntologyStoreProtocol} from "./ontology-store-protocol";
import {environment} from "../../environments/environment";

type SubjectDataWithOptional = Server.Subjects extends Map<infer K, infer V> ? Map<K, Immutable<V>|null> : never

export class OntologyShareProtocol {
  static readonly instance = new OntologyShareProtocol()
  private constructor() { }

  // CONTROLLER

  private readonly issuedList = new Set<Immutable<Server.CredentialInfo>>()
  private readonly issuedSubject = new Map<string, Set<Immutable<Server.CredentialInfo>>>()

  controllerInitialise$() {
    return this.getIssued$().pipe(
      map(() => {
        this.handleSubjectListRequests()
        this.handleSubjectRequests()
        this.revokeSharedOnUpdate()
      })
    )
  }

  private getIssued$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
      )),
      map(results => results.results!),
      map(results => {
        // SUBJECT LISTS
        results
          .filter(cred => cred.schema_id === subjectsListSchema.schemaID)
          .map((cred): Server.CredentialInfo => ({
            connection_id: cred.connection_id!,
            rev_reg_id: cred.revoc_reg_id!,
            cred_rev_id: cred.revocation_id!
          }))
          .forEach(cred => this.issuedList.add(cred))
        // INDIVIDUAL SUBJECTS
        results
          .filter(cred => cred.schema_id === subjectDataSchema.schemaID)
          .map(cred => ({
            connection_id: cred.connection_id!,
            rev_reg_id: cred.revoc_reg_id!,
            cred_rev_id: cred.revocation_id!,
            subject: JSON.parse(cred.credential!.attrs!['subject']).name
          }))
          .forEach(cred => {
            let set = this.issuedSubject.get(cred.subject)
            if (!set) {
              set = new Set()
              this.issuedSubject.set(cred.subject, set)
            }
            set.add(cred)
          })
      })
    )
  }

  private handleSubjectListRequests() {
    const obs$ = WebhookMonitor.instance.credentials$.pipe(
      filter(cred =>
        cred.credential_proposal_dict?.schema_id === subjectsListSchema.schemaID
        && cred.state === 'proposal_received'
      ),
      map(cred => cred.credential_exchange_id!),
      withLatestFrom(State.instance._subjectOntology$),
      map(([cred_ex_id, subjectOntology]) =>
        [cred_ex_id, {subjects: [...subjectOntology.keys()]}] as
          [string, Schemas.SubjectsSchema]
      ),
      mergeMap(([cred_ex_id, data]) =>
        from(offerCredentialFromProposal({cred_ex_id}, {
          counter_proposal: {
            cred_def_id: subjectsListSchema.credID,
            credential_proposal: {
              attributes: [{
                name: 'subjects',
                value: JSON.stringify(data.subjects)
              }]
            }
          }
        })).pipe(map(() => cred_ex_id))
      ),
      switchMap(cred_ex_id =>
        WebhookMonitor.instance.monitorCredential$(cred_ex_id).pipe(last())
      )
    )
    obs$.pipe(
      catchError(e => {
        console.error(e)
        return obs$
      })
    ).subscribe()
  }

  private handleSubjectRequests() {
    const obs$: Observable<void> = WebhookMonitor.instance.credentials$.pipe(
      filter(cred =>
        cred.credential_proposal_dict?.schema_id === subjectDataSchema.schemaID
        && cred.state === 'proposal_received'
      ),
      map(cred => {
        const cred_ex_id = cred.credential_exchange_id!
        const subject = cred.credential_proposal_dict?.credential_proposal?.attributes
          .filter(attr => attr.name === 'subject')
          .map(attr => attr.value)
          .shift()
        if (!subject) throw new Error(`Request received for subject data but not subject specified`)
        return [cred_ex_id, subject] as [string, string]
      }),
      withLatestFrom(State.instance._subjectOntology$),
      map(([[cred_ex_id, subject], subjectOntology]) => {
        const subjectData = subjectOntology.get(subject)
        if (!subjectData) throw new Error(`Request received for subject data but subject doesn't exist`)
        return [cred_ex_id, subject, subjectData] as [typeof cred_ex_id, typeof subject, typeof subjectData]
      }),
      map(([cred_ex_id, subject, subjectData]) => {
        const schema: Schemas.SubjectSchema = {
          subject: {
            name: subject,
            children: [...subjectData.children],
            componentSets: [...subjectData.componentSets].map(set => [...set])
          }
        }
        return [cred_ex_id, schema] as [typeof cred_ex_id, typeof schema]
      }),
      mergeMap(([cred_ex_id, data]) =>
        from(offerCredentialFromProposal({cred_ex_id}, {
          counter_proposal: {
            cred_def_id: subjectDataSchema.credID,
            credential_proposal: {
              attributes: [{
                name: 'subject',
                value: JSON.stringify(data.subject)
              }]
            }
          }
        })).pipe(map(() => cred_ex_id))
      ),
      switchMap(cred_ex_id =>
        WebhookMonitor.instance.monitorCredential$(cred_ex_id)
      ),
      last(),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs$
      })
    ) as Observable<void>
    obs$.subscribe()
  }

  private revokeIssued$(credData: Set<Server.CredentialInfo>, comment?: string) {
    return voidObs$.pipe(
      map(() => [...credData]),
      switchMap(creds => forkJoin(creds.map(cred =>
        from(revokeCredential({
          publish: true,
          notify: true,
          cred_rev_id: cred.cred_rev_id,
          rev_reg_id: cred.rev_reg_id,
          connection_id: cred.connection_id,
          comment: comment || `edited subject list`
        })).pipe(
          catchError(e => {
            console.error(`Failed to revoke subject ontology related credential: ${e}`)
            return voidObs$
          })
        )
      )))
    )
  }

  private revokeSharedOnUpdate() {
    const obs$: Observable<void> = OntologyStoreProtocol.instance.changes$.pipe(
      bufferTime(environment.timeToUpdateShared),
      map(x => {
        if (x.length === 0) return
        let data: Omit<typeof x[number], 'state'> = {edited: [], deleted: [], subjectsListChanged: false}
        for (const newData of x) {
          if (newData.subjectsListChanged) data = {...data, subjectsListChanged: true}
          const deleted = new Set(data.deleted)
          const edited = new Set(data.edited)
          newData.deleted.forEach(subject => {edited.delete(subject); deleted.add(subject)})
          newData.edited.forEach(subject => {deleted.delete(subject); edited.add(subject)})
          data = {...data, deleted: [...deleted], edited: [...edited]}
        }
        return data
      }),
      filter(x => !!x),
      map(x => x!),
      mergeMap(({deleted, edited, subjectsListChanged}) => {
        const arr = [
          ...deleted.map(subject => {
            const set = this.issuedSubject.get(subject) || new Set()
            return this.revokeIssued$(set, `deleted:${subject}`)
              .pipe(tap(() => this.issuedSubject.delete(subject)))
          }),
          ...edited.map(subject => {
            const set = this.issuedSubject.get(subject) || new Set()
            return this.revokeIssued$(set, `edited:${subject}`)
              .pipe(tap(() => set.clear()))
          })
        ]
        if (subjectsListChanged) arr.push(
          this.revokeIssued$(this.issuedList)
            .pipe(tap(() => this.issuedList.clear()))
        )
        return forkJoin(arr)
      }),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  // USER

  userInitialise$() {
    return voidObs$.pipe(
      map(() => this.watchRevocations()),
      switchMap(() => this.refreshData$())
    )
  }

  private readonly _userState$ = new ReplaySubject<Immutable<SubjectDataWithOptional>>(1)
  readonly userState$ = this.consistentUserState$()

  private consistentUserState$() {
    return this._userState$.pipe(
      filter(state => [...state].every(([_, value]) => value !== null)),
      map(state => state as Server.Subjects),
      shareReplay(1)
    )
  }

  private refreshData$() {
    return forkJoin([this.clearSubjectsList$(), this.clearSubjects$()]).pipe(
      switchMap(() => this.getSubjectsList$()),
      switchMap(subjects => forkJoin(subjects.map(subject => this.getSubject$(subject)))),
      map(() => undefined as void)
    )
  }

  private getSubjectsList$() {
    return connectToController$().pipe(
      switchMap(connection_id => from(proposeCredential({
        connection_id,
        auto_remove: false,
        schema_id: subjectsListSchema.schemaID,
        credential_proposal: {
          attributes: [{
            name: 'subjects',
            value: ''
          }]
        }
      }))),
      switchMap(credData => WebhookMonitor.instance.monitorCredential$(credData.credential_exchange_id!)),
      last(),
      map(res => JSON.parse(res.credential!.attrs!['subjects']) as Schemas.SubjectsSchema['subjects']),
      withLatestFrom(this._userState$),
      first(),
      map(([res, oldState]) => {
        const state = new Map() as SubjectDataWithOptional
        let changed = state.size !== oldState.size
        res.forEach(subject => {
          const data = oldState.get(subject)
          if (data === undefined) {
            state.set(subject, null)
            changed = true
          } else {
            state.set(subject, data)
          }
        })
        if (changed) this._userState$.next(state)
        return res
      })
    )
  }

  private getSubject$(subject: string) {
    return connectToController$().pipe(
      switchMap(connection_id => from(proposeCredential({
        connection_id,
        auto_remove: false,
        schema_id: subjectDataSchema.schemaID,
        credential_proposal: {
          attributes: [{
            name: 'subject',
            value: subject
          }]
        }
      }))),
      switchMap(credData => WebhookMonitor.instance.monitorCredential$(credData.credential_exchange_id!)),
      last(),
      map(res => JSON.parse(res.credential!.attrs!['subject']) as Schemas.SubjectSchema['subject']),
      withLatestFrom(this._userState$),
      first(),
      map(([res, oldState]) => {
        const state = new Map() as SubjectDataWithOptional
        oldState.forEach((value, key) => {
          if (key !== res.name) state.set(key, value)
        })
        state.set(res.name, {
          children: new Set(res.children),
          componentSets: new Set([...res.componentSets].map(set => new Set(set)))
        })
        this._userState$.next(state)
      })
    )
  }

  private clearSubjectsList$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectsListSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin(creds || []))
    )
  }

  private clearSubjects$(subject?: string) {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectDataSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      map(creds => {
        if (!subject) return creds
        return creds.filter(cred => {
          const data = (JSON.parse(cred.attrs!['subject']) as Schemas.SubjectSchema['subject'])
          return data.name === subject
        })
      }),
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin(creds || []))
    )
  }

  private watchRevocations() {
    const obs1$: Observable<void> = WebhookMonitor.instance.revocations$.pipe(
      filter(data => data.thread_id.includes(subjectsListSchema.name)),
      mergeMap(() => this.clearSubjectsList$()),
      switchMap(() => this.getSubjectsList$()),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs1$
      })
    )
    obs1$.subscribe()

    const obs2$: Observable<void> = WebhookMonitor.instance.revocations$.pipe(
      filter(data => data.thread_id.includes(subjectDataSchema.name)),
      switchMap(data => {
        const info = data.comment.split(':')
        if (info.length < 2 || !['deleted', 'edited'].includes(info[0]) || !info[1]) {
          console.error(`Subject revocation has invalid comment: "${data.comment}"`)
          console.error(`Falling back on full refresh mechanism`)
          return this.refreshData$()
        }
        const subject = info[1]
        const deleted = info[0] === 'deleted'
        return this.clearSubjects$(subject).pipe(
          switchMap(() => {
            if (!deleted) return this.getSubject$(subject)
            return this._userState$.pipe(
              first(),
              map(oldState => {
                const state = new Map() as SubjectDataWithOptional
                let changed = false
                oldState.forEach((value, key) => {
                  if (key !== subject) state.set(key, value)
                  else {
                    changed = true
                    state.set(subject, null)
                  }
                })
                if (changed) this._userState$.next(state)
              })
            )
          })
        )
      }),
      catchError(e => {
        console.error(e)
        return obs2$
      })
    )
    obs2$.subscribe()
  }
}
