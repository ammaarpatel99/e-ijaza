import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {map, mergeMap, shareReplay, startWith} from "rxjs/operators";
import {
  BehaviorSubject,
  catchError,
  defer,
  filter,
  first,
  from,
  last,
  Observable, pairwise,
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
import {Schemas, Server} from '@project-types'
import {OntologyStoreProtocol} from "./ontology-store-protocol";
import {SubjectOntology} from "../subject-ontology";

type SubjectDataWithOptional = Server.Subjects extends Map<infer K, infer V> ? Map<K, Immutable<V>|null> : never

export class OntologyShareProtocol {
  private static _instance: OntologyShareProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new OntologyShareProtocol()
    return this._instance
  }
  private constructor() { }

  // CONTROLLER

  initialiseController$() {
    return voidObs$.pipe(
      map(() => {
        this.handleSubjectListRequests()
        this.handleSubjectDataRequests()
        this.revokeSharedOnUpdate()
      }),
      switchMap(() => forkJoin$([this.revokeLists$(), this.revokeSubjects$()])),
      map(() => undefined as void)
    )
  }

  private revokeIssued$(credData: Set<Server.CredentialInfo>, comment?: string) {
    return voidObs$.pipe(
      map(() => [...credData]),
      switchMap(creds => forkJoin$(creds.map(cred =>
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

  private revokeLists$() {
    return defer(() => from(
      getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
    )).pipe(
      map(results => results.results || []),
      switchMap(results => {
        const lists = results
          .filter(cred => cred.schema_id === subjectsListSchema.schemaID)
          .map((cred): Server.CredentialInfo => ({
            connection_id: cred.connection_id!,
            rev_reg_id: cred.revoc_reg_id!,
            cred_rev_id: cred.revocation_id!
          }))
        return this.revokeIssued$(new Set(lists))
      })
    )
  }

  private revokeSubjects$(): Observable<void>
  private revokeSubjects$(subject: string, deleted: boolean): Observable<void>
  private revokeSubjects$(subject?: string, deleted?: boolean) {
    return defer(() => from(
      getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
    )).pipe(
      map(results => results.results || []),
      switchMap(results => {
        const subjects = new Map<string, Set<Server.CredentialInfo>>()
        results
          .filter(cred => cred.schema_id === subjectDataSchema.schemaID)
          .map(cred => ({
            connection_id: cred.connection_id!,
            rev_reg_id: cred.revoc_reg_id!,
            cred_rev_id: cred.revocation_id!,
            subject: JSON.parse(cred.credential_proposal_dict!.credential_proposal!.attributes[0].value).name
          }))
          .filter(cred => !subject ? true : cred.subject === subject)
          .forEach(cred => {
            // let set = this.issuedSubject.get(cred.subject)
            let set = subjects.get(cred.subject)
            if (!set) {
              set = new Set()
              // this.issuedSubject.set(cred.subject, set)
              subjects.set(cred.subject, set)
            }
            set.add(cred)
          })

        return forkJoin$([
          ...[...subjects].map(([subject, creds]) =>
            this.revokeIssued$(creds, `${deleted ? 'deleted' : 'edited'}:${subject}`)
          )
        ])
      }),
      map(() => undefined as void)
    )
  }

  private handleSubjectListRequests() {
    const obs$: Observable<void> = WebhookMonitor.instance.credentials$.pipe(
      filter(cred =>
        cred.credential_proposal_dict?.schema_id === subjectsListSchema.schemaID
        && cred.state === 'proposal_received'
      ),
      map(cred => cred.credential_exchange_id!),
      withLatestFrom(State.instance.subjectOntology$),
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
        WebhookMonitor.instance.monitorCredential$(cred_ex_id)
          .pipe(last())
      ),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private handleSubjectDataRequests() {
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
      withLatestFrom(State.instance.subjectOntology$),
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
        })).pipe(map(() => ({cred_ex_id, subject: data.subject.name})))
      ),
      switchMap(({cred_ex_id, subject}) =>
        WebhookMonitor.instance.monitorCredential$(cred_ex_id).pipe(
          last()
        )
      ),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs$
      })
    ) as Observable<void>
    obs$.subscribe()
  }

  private revokeSharedOnUpdate() {
    const obs$: Observable<void> = State.instance.subjectOntology$.pipe(
      startWith(null),
      pairwise(),
      mergeMap(([oldState, state]) => {
        if (!oldState) return voidObs$
        const {deleted, edited, subjectsListChanged} =
          OntologyStoreProtocol.findChanges(state!, oldState)
        return forkJoin$([
          ...deleted.map(subject => this.revokeSubjects$(subject, true)),
          ...edited.map(subject => this.revokeSubjects$(subject, false)),
          subjectsListChanged ? this.revokeLists$() : voidObs$
        ])
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

  private readonly _userState$ = new BehaviorSubject<Immutable<SubjectDataWithOptional>>(new Map())
  readonly userState$ = this.exposedUserState$()

  initialiseUser$() {
    return this.refreshData$().pipe(
      map(() => {
        this.watchRevocations()
      })
    )
  }

  private exposedUserState$() {
    return this._userState$.pipe(
      filter(state => [...state].every(([_, value]) => value !== null)),
      map(state => state as Server.Subjects),
      filter(state => this.allSubjectsExist(state)),
      mergeMap(state => SubjectOntology.instance.update$(state)),
      shareReplay(1)
    )
  }

  private allSubjectsExist(subjects: Server.Subjects) {
    const set = new Set<string>()
    subjects.forEach(data => {
      data.children.forEach(x => set.add(x))
      data.componentSets.forEach(x => x.forEach(y => set.add(y)))
    })
    return [...set].every(subject => subjects.has(subject))
  }

  private refreshData$() {
    return forkJoin$([this.clearSubjectsList$(), this.clearSubjects$()]).pipe(
      switchMap(() => this.getSubjectsList$())
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
      switchMap(([res, oldState]) => {
        const state = new Map() as SubjectDataWithOptional
        const requests: Observable<void>[] = []
        res.forEach(subject => {
          const data = oldState.get(subject)
          if (data !== undefined) state.set(subject, data)
          else {
            state.set(subject, null)
            requests.push(this.getSubject$(subject))
          }
        })
        this._userState$.next(state)
        return forkJoin$(requests)
      }),
      map(() => undefined as void)
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
    return defer(() => from(
      getHeldCredentials({wql: `{"schema_id": "${subjectsListSchema.schemaID}"}`})
    )).pipe(
      map(result => result.results || []),
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin$(creds))
    )
  }

  private clearSubjects$(subject?: string) {
    return defer(() => from(
      getHeldCredentials({wql: `{"schema_id": "${subjectDataSchema.schemaID}"}`})
    )).pipe(
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
      switchMap(creds => forkJoin$(creds))
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
      mergeMap(data => {
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
