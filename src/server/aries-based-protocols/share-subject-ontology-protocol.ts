import {Immutable, voidObs$} from "@project-utils";
import {bufferTime, map, shareReplay, tap} from "rxjs/operators";
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
  connectViaPublicDID$,
  deleteCredential,
  getHeldCredentials,
  getIssuedCredentials,
  offerCredentialFromProposal,
  proposeCredential,
  revokeCredential
} from "../aries-api";
import {subjectSchema, subjectsSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {State} from "../state";
import {Server, Schemas} from '@project-types'
import {SubjectsStoreProtocol} from "./subjects-store-protocol";

type SubjectDataWithOptional = Server.Subjects extends Map<infer K, infer V> ? Map<K, Immutable<V>|null> : never

export class ShareSubjectOntologyProtocol {
  static readonly instance = new ShareSubjectOntologyProtocol()
  private constructor() { }

  // CONTROLLER

  private readonly issuedList = new Set<Immutable<Server.CredentialInfo>>()
  private readonly issuedSubject = new Map<string, Set<Immutable<Server.CredentialInfo>>>()

  controllerInitialise$() {
    return forkJoin([
      this.getIssuedSubjects$(),
      this.getIssuedSubjectList$()
    ]).pipe(
      map(() => {
        this.handleSubjectListRequests()
        this.handleSubjectRequests()
        this.revokeSharedOnUpdate()
      })
    )
  }

  private getIssuedSubjectList$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
      )),
      map(results => results.results!),
      map(results => results.filter(cred => cred.schema_id === subjectsSchema.schemaID)),
      map(results => results.map(cred => ({
        connection_id: cred.connection_id!,
        rev_reg_id: cred.revoc_reg_id!,
        cred_rev_id: cred.revocation_id!
      } as Server.CredentialInfo))),
      map(results => results.forEach(cred => this.issuedList.add(cred)))
    )
  }

  private getIssuedSubjects$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
      )),
      map(results => results.results!),
      map(results => results.filter(cred => cred.schema_id === subjectSchema.schemaID)),
      map(results => results.map(cred => ({
        connection_id: cred.connection_id!,
        rev_reg_id: cred.revoc_reg_id!,
        cred_rev_id: cred.revocation_id!,
        subject: JSON.parse(cred.credential!.attrs!['subject']).name
      }))),
      map(results => results.forEach(cred => {
        let set = this.issuedSubject.get(cred.subject)
        if (!set) {
          set = new Set()
          this.issuedSubject.set(cred.subject, set)
        }
        set.add(cred)
      }))
    )
  }

  private handleSubjectListRequests() {
    const obs$ = WebhookMonitor.instance.credentials$.pipe(
      filter(cred =>
        cred.credential_proposal_dict?.schema_id === subjectsSchema.schemaID
        && cred.state === 'proposal_received'
      ),
      map(cred => cred.credential_exchange_id!),
      withLatestFrom(State.instance.subjectOntology$),
      map(([cred_ex_id, subjectOntology]) =>
        [cred_ex_id, {subjects: [...subjectOntology.keys()]}] as
          [string, Schemas.SubjectsSchema]
      ),
      switchMap(([cred_ex_id, data]) =>
        from(offerCredentialFromProposal({cred_ex_id}, {
          counter_proposal: {
            cred_def_id: subjectsSchema.credID,
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
        cred.credential_proposal_dict?.schema_id === subjectSchema.schemaID
        && cred.state === 'proposal_received'
      ),
      map(cred => [
        cred.credential_exchange_id!,
        cred.credential_proposal_dict?.credential_proposal?.attributes
          .filter(attr => attr.name === 'subject')
          .map(attr => attr.value).shift()
      ] as [string, string | undefined]),
      map(data => {
        if (!data[1]) throw new Error(`Request received for subject data but not subject specified`)
        return data as [string, string]
      }),
      withLatestFrom(State.instance.subjectOntology$),
      map(([[cred_ex_id, subject], subjectOntology]) => {
        const subjectData = subjectOntology.get(subject)
        if (!subjectData) throw new Error(`Request received for subject data but subject doesn't exist`)
        return [cred_ex_id, subject, subjectData] as [typeof cred_ex_id,typeof subject, typeof subjectData]
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
      switchMap(([cred_ex_id, data]) =>
        from(offerCredentialFromProposal({cred_ex_id}, {
          counter_proposal: {
            cred_def_id: subjectSchema.credID,
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
            console.error(`Failed to revoke public master credentials list: ${e}`)
            return voidObs$
          })
        )
      )))
    )
  }

  private revokeSharedOnUpdate() {
    const obs$: Observable<void> = SubjectsStoreProtocol.instance.changes$.pipe(
      bufferTime(1000),
      map(x => {
        if (x.length === 0) return
        let data: typeof x[number] = {state: x[x.length - 1].state, edited: [], deleted: [], subjectsListChanged: false}
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
      switchMap(({deleted,edited,subjectsListChanged}) => {
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
      switchMap(this.refreshData$)
    )
  }

  private readonly _userState$ = new ReplaySubject<Immutable<SubjectDataWithOptional>>(1)
  readonly userState$ = this._userState$.pipe(
    filter(state => [...state].every(([_, value]) => value !== null)),
    map(state => state as Server.Subjects),
    shareReplay(1)
  )

  private refreshData$() {
    return forkJoin([this.clearSubjectsList$(), this.clearSubjects$()]).pipe(
      switchMap(() => this.getSubjectsList$()),
      switchMap(subjects => forkJoin(subjects.map(subject => this.getSubject$(subject)))),
      map(() => undefined as void)
    )
  }

  private getSubjectsList$() {
    return State.instance.controllerDID$.pipe(
      first(),
      switchMap(controllerDID => connectViaPublicDID$({their_public_did: controllerDID})),
      switchMap(connection_id => from(proposeCredential({
        connection_id,
        auto_remove: false,
        schema_id: subjectsSchema.schemaID,
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
        let changed = false
        res.forEach(subject => {
          const data = oldState.get(subject)
          if (data !== undefined) state.set(subject, data)
          else {
            state.set(subject, null)
            changed = true
          }
        })
        if (state.size !== oldState.size) changed = true
        if (changed) this._userState$.next(state)
        return res
      })
    )
  }

  private getSubject$(subject: string) {
    return State.instance.controllerDID$.pipe(
      first(),
      switchMap(controllerDID => connectViaPublicDID$({their_public_did: controllerDID})),
      switchMap(connection_id => from(proposeCredential({
        connection_id,
        auto_remove: false,
        schema_id: subjectSchema.schemaID,
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
        getHeldCredentials({wql: `{"schema_id": "${subjectsSchema.schemaID}"}`})
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
        getHeldCredentials({wql: `{"schema_id": "${subjectSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      map(creds => {
        if (!subject) return creds
        return creds.filter(cred =>
          (JSON.parse(cred.attrs!['subject']) as Schemas.SubjectSchema['subject'])
            .name === subject
        )
      }),
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin(creds || []))
    )
  }

  private watchRevocations() {
    const obs1$: Observable<void> = WebhookMonitor.instance.revocations$.pipe(
      filter(data => data.thread_id.includes(subjectsSchema.name)),
      switchMap(() => this.clearSubjectsList$()),
      switchMap(() => this.getSubjectsList$()),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs1$
      })
    )
    obs1$.subscribe()

    const obs2$: Observable<void> = WebhookMonitor.instance.revocations$.pipe(
      filter(data => data.thread_id.includes(subjectSchema.name)),
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
