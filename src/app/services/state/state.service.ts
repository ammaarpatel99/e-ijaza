import {Injectable, OnDestroy} from '@angular/core';
import {
  AppType,
  InitialisationState,
  Master,
  MasterProposal, ProposalType,
  Subject,
  SubjectProposal,
  UpdateRes
} from '@project-types/interface-api'
import {
  AsyncSubject,
  BehaviorSubject,
  filter,
  firstValueFrom,
  forkJoin,
  interval,
  lastValueFrom,
  of,
  ReplaySubject,
  switchMap,
  takeUntil
} from "rxjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class StateService implements OnDestroy {
  private static TIMESTAMP_NOW() {
    return new Date().getTime()
  }
  private static readonly AUTO_FETCH_TIME = 5 * 1000

  private readonly destroy$ = new AsyncSubject<void>()

  private innerTimestamp = 0
  private serverTimestamp = 0
  private readonly fetching$ = new BehaviorSubject(false)
  private waiting = false

  private readonly _initialisationState$ = new ReplaySubject<InitialisationState>(1)
  readonly initialisationState$ = this._initialisationState$.asObservable()

  private readonly _did$ = new ReplaySubject<string>(1)
  readonly did$ = this._did$.asObservable()

  private readonly _appType$ = new ReplaySubject<AppType>(1)
  readonly appType$ = this._appType$.asObservable()

  private readonly _masters$ = new ReplaySubject<Master[]>(1)
  readonly masters$ = this._masters$.asObservable()

  private readonly _masterProposals$ = new ReplaySubject<MasterProposal[]>(1)
  readonly masterProposals$ = this._masterProposals$.asObservable()

  private readonly _subjects$ = new ReplaySubject<Subject[]>(1)
  readonly subjects$ = this._subjects$.asObservable()

  private readonly _subjectProposals$ = new ReplaySubject<SubjectProposal[]>(1)
  readonly subjectProposals$ = this._subjectProposals$.asObservable()

  constructor() {
    this.regularlyUpdate()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  async update() {
    if (!this.fetching$.value) {
      await this.fetchState()
    } else {
      this.waiting = true
      const obs$ = this.fetching$.pipe(
        filter(value => !value)
      )
      await firstValueFrom(obs$)
    }
  }

  private async fetchState() {
    const recursiveCall = this.fetching$.value
    if (!recursiveCall) this.fetching$.next(true)
    // TODO: replace dummy observable with actual server call
    const dummyRes: UpdateRes = {
      state: InitialisationState.COMPLETE,
      did: 'my_did',
      appType: AppType.USER,
      timestamp: 0,
      masters: true,
      masterProposals: true,
      subjects: true
    } as UpdateRes
    const obs$ = of(dummyRes).pipe(
      switchMap(value => {
        this.innerTimestamp = StateService.TIMESTAMP_NOW()
        this._initialisationState$.next(value.state)
        if ("did" in value) this._did$.next(value.did)
        if ('appType' in value) this._appType$.next(value.appType)

        if (value.state !== InitialisationState.COMPLETE) return of(undefined)

        this.serverTimestamp = value.timestamp
        return forkJoin([
          // TODO: replace calls with calls to server to fetch updates
          !value.masters ? of(undefined) : this.fetchMasters$(),
          !value.masterProposals ? of(undefined) : this.fetchMasterProposals$(),
          !value.subjects ? of(undefined) : this.fetchSubjects$(),
          !value.subjectProposals ? of(undefined) : of(undefined),
          !value.heldCredentials ? of(undefined) : of(undefined),
          !value.issuedCredentials ? of(undefined) : of(undefined),
          !value.outgoingProofRequests ? of(undefined) : of(undefined),
          !value.incomingProofRequests ? of(undefined) : of(undefined),
          !value.incomingProofRequestHandlers ? of(undefined) : of(undefined)
        ]).pipe(map(() => {}))
      })
    )
    await lastValueFrom(obs$)
    if (recursiveCall) return
    while (this.waiting) {
      this.waiting = false
      await this.fetchState()
    }
    this.fetching$.next(false)
  }

  private regularlyUpdate() {
    interval(StateService.AUTO_FETCH_TIME / 2).pipe(
      filter(() => {
        return !this.fetching$.value &&
          StateService.TIMESTAMP_NOW() - this.innerTimestamp >= StateService.AUTO_FETCH_TIME
      }),
      map(() => { this.fetchState()}),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  private fetchMasters$() {
    const dummyValue = [{
      did: 'a_did',
      subjects: ['subject1', 'subject2', 'subject3']
    }]
    dummyValue.forEach(item => item.subjects.sort())
    dummyValue.sort((a, b) => {
      if (a.did < b.did) return 1
      else if (b.did < a.did) return -1
      else return 0
    })
    this._masters$.next(dummyValue)
    return of(undefined)
  }

  private fetchMasterProposals$() {
    const dummyValue: MasterProposal[] = [{
      did: 'a_did',
      subject: 'subject',
      proposalType: ProposalType.ADD,
      votes: {
        for: 1,
        against: 1,
        total: 4
      }
    }]
    dummyValue.sort((a, b) => {
      if (a.did < b.did) return 1
      else if (b.did < a.did) return -1
      else if (a.subject < b.subject) return 1
      else if (b.subject < a.subject) return -1
      else if (a.proposalType < b.proposalType) return 1
      else if (b.proposalType < a.proposalType) return -1
      else return 0
    })
    this._masterProposals$.next(dummyValue)
    return of(undefined)
  }

  private fetchSubjects$() {
    const dummyValue: Subject[] = [{
      name: 'subject1',
      children: [],
      componentSets: []
    }]
    dummyValue.sort((a, b) => {
      if (a.name < b.name) return 1
      else if (b.name < a.name) return -1
      else return 0
    })
    this._subjects$.next(dummyValue)
    return of(undefined)
  }
}
