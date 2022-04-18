import {Schemas, Server} from '@project-types'
import {Immutable, voidObs$} from "@project-utils";
import {catchError, debounceTime, forkJoin, from, last, ReplaySubject, switchMap, tap} from "rxjs";
import {
  connectToSelf$,
  deleteCredential,
  deleteSelfConnections$,
  getHeldCredentials,
  issueCredential
} from "../aries-api";
import {subjectSchema, subjectsSchema} from "../schemas";
import {map} from "rxjs/operators";
import {WebhookMonitor} from "../webhook";
import {State} from "../state";

interface ChangeData {
  state: Immutable<Server.Subjects>
  deleted: string[]
  edited: string[]
  subjectsListChanged: boolean
}

export class SubjectsStoreProtocol {
  static readonly instance = new SubjectsStoreProtocol()
  private constructor() { }

  private readonly _changes$ = new ReplaySubject<Immutable<ChangeData>>(1)
  readonly changes$ = this._changes$.asObservable()

  private previous: Immutable<Server.Subjects> | undefined

  initialise$() {
    return voidObs$.pipe(
      map(() => this.watchState())
    )
  }

  getFromStore$() {
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
    return forkJoin([subjectListData$, subjectsData$]).pipe(
      map(([subjectListData, subjectsData]) => SubjectsStoreProtocol.schemasToState(subjectListData, subjectsData)),
      tap(state => this.previous = state),
      switchMap(state => this.clean$(state).pipe(map(() => state)))
    )
  }

  private clean$(state: Immutable<Server.Subjects>) {
    const arr = [...state.keys()].map(subject => this.storeSubject$(state, subject))
    arr.push(this.storeSubjectList$(state))
    return this.deleteStoredSubjects$().pipe(
      switchMap(() => forkJoin(arr))
    )
  }

  private watchState() {
    const obs$ = State.instance.subjectOntology$.pipe(
      debounceTime(1000),
      map(state => {
        const previous = this.previous || new Map()
        const subjectsListChanged = ![...previous.keys(), ...state.keys()]
          .every(key => previous.has(key) && state.has(key))
        const deleted = [...previous.keys()].filter(subject => !state.has(subject))
        const edited = [...state]
          .filter(([subject, data]) => previous.get(subject) !== data)
          .map(([subject]) => subject)
        return {deleted, edited, state, subjectsListChanged} as ChangeData
      }),
      tap(changeData => this._changes$.next(changeData)),
      switchMap(({state, deleted, edited, subjectsListChanged}) => {
        const arr = [
          ...deleted.map(subject => this.deleteStoredSubjects$(subject)),
          ...edited.map(subject => this.storeSubject$(state, subject))
        ]
        if (subjectsListChanged) arr.push(this.storeSubjectList$(state))
        return forkJoin(arr).pipe(map(() => state))
      }),
      map(state => this.previous = state)
    )
    obs$.pipe(
      catchError(e => {
        console.error(e)
        return obs$
      })
    ).subscribe()
  }

  private getStoredSubjectsList$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectsSchema.schemaID}"}`})
      )),
      map(result => result.results || [])
    )
  }

  private deleteStoredSubjectsList$() {
    return this.getStoredSubjectsList$().pipe(
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin(creds || []))
    )
  }

  private getStoredSubjects$(subject?: string) {
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
      })
    )
  }

  private deleteStoredSubjects$(subject?: string) {
    return this.getStoredSubjects$(subject).pipe(
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin(creds || []))
    )
  }

  private storeSubjectList$(state: Immutable<Server.Subjects>) {
    return this.deleteStoredSubjectsList$().pipe(
      switchMap(() => connectToSelf$()),
      switchMap(connections =>
        from(issueCredential({
          cred_def_id: subjectsSchema.credID,
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
      map(data => ({
        subject: {
          name: subject,
          children: [...data.children],
          componentSets: [...data.componentSets].map(set => [...set])
        }
      } as Schemas.SubjectSchema))
    )
    return this.deleteStoredSubjects$(subject).pipe(
      switchMap(() => connectToSelf$()),
      switchMap(connections => getData$.pipe(switchMap(data =>
        from(issueCredential({
          cred_def_id: subjectSchema.credID,
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

  private static schemasToState(subjectList: Schemas.SubjectsSchema, subjects: Schemas.SubjectSchema[]) {
    const usedSubjects = new Set<string>()
     const fullData = subjectList.subjects.map(subjectName => {
       const data = subjects
         .filter(subjectData => subjectData.subject.name === subjectName)
         .map(subjectData => subjectData.subject)
         .shift()
       if (!data) throw new Error(`Attempting to form subject data from store but missing ${subjectName}`)
       const children = new Set(data.children)
       data.children.forEach(child => usedSubjects.add(child))
       const componentSets = new Set(data.componentSets.map(componentSet => new Set(componentSet)))
       data.componentSets.forEach(set => set.forEach(child => usedSubjects.add(child)))
       const dataObj = {children, componentSets}
       return [subjectName, dataObj] as [typeof subjectName, typeof dataObj]
    })
    const map = new Map(fullData) as Server.Subjects
    if (![...usedSubjects].every(subject => map.has(subject))) {
      throw new Error(`Attempting to load subject ontology from store but store is incosistent`)
    }
    return map
  }
}
