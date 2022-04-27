import {Schemas, Server} from '@project-types'
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {
  catchError,
  from,
  last,
  mergeMap,
  Observable,
  ReplaySubject,
  switchMap,
  tap
} from "rxjs";
import {
  connectToSelf$,
  deleteCredential,
  deleteSelfConnections$,
  getHeldCredentials,
  issueCredential
} from "../aries-api";
import {subjectDataSchema, subjectsListSchema} from "../schemas";
import {map} from "rxjs/operators";
import {WebhookMonitor} from "../webhook";
import {State} from "../state";

interface ChangeData {
  state: Immutable<Server.Subjects>
  deleted: string[]
  edited: string[]
  subjectsListChanged: boolean
}

export class OntologyStoreProtocol {
  private static _instance: OntologyStoreProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new OntologyStoreProtocol()
    return this._instance
  }
  private constructor() { }

  private static schemasToState(subjectList: Schemas.SubjectsSchema, subjects: Schemas.SubjectSchema[]): Server.Subjects {
    const foundSubjects = new Set<string>()

    const fullData = subjectList.subjects.map(subjectName => {
      const subjectData = subjects
        .filter(subjectData => subjectData.subject.name === subjectName)
        .map(subjectData => subjectData.subject)
        .shift()
      if (!subjectData) throw new Error(`Attempting to form subject data from store but missing ${subjectName}`)

      const children = new Set(subjectData.children)
      subjectData.children.forEach(child => foundSubjects.add(child))

      const componentSets = new Set(subjectData.componentSets.map(componentSet => new Set(componentSet)))
      subjectData.componentSets.forEach(set => set.forEach(child => foundSubjects.add(child)))

      const dataObj = {children, componentSets}
      return [subjectName, dataObj] as [typeof subjectName, typeof dataObj]
    })

    const map = new Map(fullData) as Server.Subjects

    if (![...foundSubjects].every(subject => map.has(subject))) {
      throw new Error(`Attempting to load subject ontology from store but store is inconsistent`)
    }

    return map
  }

  private readonly _changes$ = new ReplaySubject<Immutable<ChangeData>>(1)
  readonly changes$ = this._changes$.asObservable()

  private previous: Immutable<Server.Subjects> | undefined

  initialiseController$() {
    return voidObs$.pipe(
      map(() => this.watchState()),
      switchMap(() => this.getFromStore$())
    )
  }

  private getFromStore$() {
    const subjectListData$ = this.getStoredSubjectsList$().pipe(
      map(creds => creds.shift()),
      map(store => {
        if (!store) return {subjects: []}
        const subjects = JSON.parse(store.attrs!['subjects']) as Schemas.SubjectsSchema['subjects']
        return {subjects}
      })
    )
    const subjectsData$ = this.getStoredSubjects$().pipe(
      map(creds => creds.map(cred => {
        const subject = JSON.parse(cred.attrs!['subject']) as Schemas.SubjectSchema['subject']
        return {subject}
      }))
    )
    return forkJoin$([subjectListData$, subjectsData$]).pipe(
      map(([subjectListData, subjectsData]) => OntologyStoreProtocol.schemasToState(subjectListData, subjectsData)),
      tap(state => this.previous = state),
      switchMap(state => this.clean$(state).pipe(map(() => state)))
    )
  }

  private clean$(state: Immutable<Server.Subjects>) {
    const arr = [...state.keys()].map(subject => this.storeSubject$(state, subject))
    arr.push(this.storeSubjectList$(state))
    return forkJoin$([this.deleteStoredSubjects$(), this.deleteStoredSubjectsList$()]).pipe(
      switchMap(() => forkJoin$(arr))
    )
  }

  private getStoredSubjectsList$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectsListSchema.schemaID}"}`})
      )),
      map(result => result.results || [])
    )
  }

  private deleteStoredSubjectsList$() {
    return this.getStoredSubjectsList$().pipe(
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin$(creds || []))
    )
  }

  private getStoredSubjects$(subject?: string) {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectDataSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      map(creds => {
        if (!subject) return creds
        return creds
          .filter(cred => {
            const data = (JSON.parse(cred.attrs!['subject']) as Schemas.SubjectSchema['subject'])
            return data.name === subject
          })
      })
    )
  }

  private deleteStoredSubjects$(subject?: string) {
    return this.getStoredSubjects$(subject).pipe(
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin$(creds || []))
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance.subjectOntology$.pipe(
      map(state => this.findChanges(state)),
      tap(changeData => this._changes$.next(changeData)),
      mergeMap(({state, deleted, edited, subjectsListChanged}) => {
        const arr = [
          ...deleted.map(subject => this.deleteStoredSubjects$(subject)),
          ...edited.map(subject => this.storeSubject$(state, subject))
        ]
        if (subjectsListChanged) arr.push(this.storeSubjectList$(state))
        return forkJoin$(arr).pipe(
          map(() => state)
        )
      }),
      map(state => {this.previous = state}),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private findChanges(state: Immutable<Server.Subjects>): ChangeData {
    const previous = this.previous || new Map()
    const subjectsListChanged = ![...previous.keys(), ...state.keys()]
      .every(key => previous.has(key) && state.has(key))
    const deleted = [...previous.keys()].filter(subject => !state.has(subject))
    const edited = [...state]
      .filter(([subject, data]) => previous.get(subject) !== data)
      .map(([subject]) => subject)
    return {deleted, edited, state, subjectsListChanged}
  }

  private storeSubjectList$(state: Immutable<Server.Subjects>) {
    return this.deleteStoredSubjectsList$().pipe(
      switchMap(() => connectToSelf$()),
      switchMap(connections =>
        from(issueCredential({
          cred_def_id: subjectsListSchema.credID,
          connection_id: connections[0],
          auto_remove: true,
          credential_proposal: {
            attributes: [{
              name: 'subjects',
              value: JSON.stringify([...state.keys()] as Schemas.SubjectsSchema['subjects'])
            }]
          }
        })).pipe(
          switchMap(({credential_exchange_id}) => WebhookMonitor.instance.monitorCredential$(credential_exchange_id!)),
          last(),
          map(() => connections)
        )
      ),
      switchMap(connections => deleteSelfConnections$(connections))
    )
  }

  private storeSubject$(state: Immutable<Server.Subjects>, subject: string) {
    const getData$ = voidObs$.pipe(
      map(() => {
        const data = state.get(subject)
        if (data) return data
        throw Error(`Can't store non existent subject`)
      }),
      map((data): Schemas.SubjectSchema => ({
        subject: {
          name: subject,
          children: [...data.children],
          componentSets: [...data.componentSets].map(set => [...set])
        }
      }))
    )
    return this.deleteStoredSubjects$(subject).pipe(
      switchMap(() => connectToSelf$()),
      switchMap(connections => getData$.pipe(switchMap(data =>
        from(issueCredential({
          cred_def_id: subjectDataSchema.credID,
          connection_id: connections[0],
          auto_remove: true,
          credential_proposal: {
            attributes: [{
              name: 'subject',
              value: JSON.stringify(data.subject)
            }]
          }
        })).pipe(
          switchMap(({credential_exchange_id}) => WebhookMonitor.instance.monitorCredential$(credential_exchange_id!)),
          last(),
          map(() => connections)
        )
      ))),
      switchMap(connections => deleteSelfConnections$(connections))
    )
  }
}
