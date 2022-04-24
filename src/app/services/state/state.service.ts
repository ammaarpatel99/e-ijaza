import {Inject, Injectable, OnDestroy, PLATFORM_ID} from '@angular/core';
import {API} from '@project-types'
import {Immutable, Mutex, voidObs$} from '@project-utils'
import {
  AsyncSubject, delay,
  filter,
  first,
  forkJoin,
  interval,
  mergeMap,
  Observable,
  ReplaySubject,
  switchMap,
  takeUntil,
  tap
} from "rxjs";
import {map, shareReplay} from "rxjs/operators";
import {ApiService} from "../api/api.service";
import {LoadingService} from "../loading/loading.service";
import {isPlatformBrowser} from "@angular/common";
import {environment} from 'src/environments/environment'

@Injectable({
  providedIn: 'root'
})
export class StateService implements OnDestroy {
  private readonly _initialisationState$ = new ReplaySubject<Immutable<API.InitialisationState>>(1)
  readonly initialisationState$ = this._initialisationState$.asObservable()

  private readonly _did$ = new ReplaySubject<Immutable<string>>(1)
  readonly did$ = this._did$.asObservable()

  private readonly _appType$ = new ReplaySubject<Immutable<API.AppType>>(1)
  readonly appType$ = this._appType$.asObservable()

  private readonly _masters$ = new ReplaySubject<Immutable<API.Master[]>>(1)
  readonly masters$ = this._masters$.asObservable()

  private readonly _masterProposals$ = new ReplaySubject<Immutable<API.MasterProposal[]>>(1)
  readonly masterProposals$ = this._masterProposals$.asObservable()

  private readonly _subjects$ = new ReplaySubject<Immutable<API.Subject[]>>(1)
  readonly subjects$ = this._subjects$.asObservable()
  readonly subjectNames$ = this._subjectNames$()

  private readonly _subjectProposals$ = new ReplaySubject<Immutable<API.SubjectProposal[]>>(1)
  readonly subjectProposals$ = this._subjectProposals$.asObservable()

  private readonly _heldCredentials$ = new ReplaySubject<Immutable<API.HeldCredential[]>>(1)
  readonly heldCredentials$ = this._heldCredentials$.asObservable()

  private readonly _issuedCredentials$ = new ReplaySubject<Immutable<API.IssuedCredential[]>>(1)
  readonly issuedCredentials$ = this._issuedCredentials$.asObservable()

  private readonly _outgoingProofRequests$ = new ReplaySubject<Immutable<API.OutgoingProofRequest[]>>(1)
  readonly outgoingProofRequests$ = this._outgoingProofRequests$.asObservable()

  private readonly _incomingProofRequests$ = new ReplaySubject<Immutable<API.IncomingProofRequest[]>>(1)
  readonly incomingProofRequests$ = this._incomingProofRequests$.asObservable()

  private readonly _reachableSubjects$ = new ReplaySubject<Immutable<API.ReachableSubject[]>>(1)
  readonly reachableSubjects$ = this._reachableSubjects$.asObservable()
  readonly reachableFromMasterCreds$ = this._reachableFromMasterCreds$()

  private readonly fetchMasters$ = this._fetchMasters$()
  private readonly fetchMasterProposals$ = this._fetchMasterProposals$()
  private readonly fetchSubjects$ = this._fetchSubjects$()
  private readonly fetchSubjectProposals$ = this._fetchSubjectProposals$()
  private readonly fetchHeldCredentials$ = this._fetchHeldCredentials$()
  private readonly fetchIssuedCredentials$ = this._fetchIssuedCredentials$()
  private readonly fetchOutgoingProofRequests$ = this._fetchOutgoingProofRequests$()
  private readonly fetchIncomingProofRequests$ = this._fetchIncomingProofRequests$()
  private readonly fetchReachableSubjects$ = this._fetchReachableSubjects$()

  private readonly destroy$ = new AsyncSubject<void>()

  private innerTimestamp = 0
  private serverTimestamp = 0

  private waiting = false
  private readonly fetching = new Mutex()
  private readonly fetchState$ = this._fetchState$()
  readonly update$ = this._update$()

  constructor(
    private readonly api: ApiService,
    private readonly loading: LoadingService,
    @Inject(PLATFORM_ID) platformID: string
  ) {
    if (isPlatformBrowser(platformID)) this.regularlyUpdate()
    this.update$.subscribe()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private fetchData$(updateData: API.State.UpdateRes) {
    if (updateData.state !== API.InitialisationState.COMPLETE) return voidObs$
    const arr: Observable<void>[] = []
    if (updateData.masters) arr.push(this.fetchMasters$)
    if (updateData.masterProposals) arr.push(this.fetchMasterProposals$)
    if (updateData.subjects) arr.push(this.fetchSubjects$)
    if (updateData.subjectProposals) arr.push(this.fetchSubjectProposals$)
    if (updateData.heldCredentials) arr.push(this.fetchHeldCredentials$)
    if (updateData.issuedCredentials) arr.push(this.fetchIssuedCredentials$)
    if (updateData.outgoingProofRequests) arr.push(this.fetchOutgoingProofRequests$)
    if (updateData.incomingProofRequests) arr.push(this.fetchIncomingProofRequests$)
    if (updateData.reachableSubjects) arr.push(this.fetchReachableSubjects$)
    return forkJoin(arr).pipe(
      this.loading.wrapObservable({waitForFree: false}),
      map(() => undefined as void)
    )
  }

  private regularlyUpdate() {
    const obs$: Observable<void> = voidObs$.pipe(
      delay(environment.webAutoFetchStateInterval),
      switchMap(() => this.fetching.waitForFree$),
      switchMap(() => {
        if (Date.now() - this.innerTimestamp >= environment.webAutoFetchStateInterval) return this.fetchState$
        return voidObs$
      }),
      switchMap(() => obs$)
    )
    obs$.pipe(
      takeUntil(this.destroy$)
    ).subscribe()
  }

  private _subjectNames$() {
    return this.subjects$.pipe(
      map(arr => arr.map(subject => subject.name) as Immutable<string[]>),
      shareReplay(1))
  }

  private _reachableFromMasterCreds$() {
    return this.reachableSubjects$.pipe(
      map(data => data.filter(subject => subject.reachableByMasterCredentials)),
      map(data => data.map(subject => subject.name) as Immutable<string[]>),
      shareReplay(1)
    )
  }

  private _fetchState$() {
    const obs$: Observable<void> =
      this.api.getStateUpdate$({timestamp: this.serverTimestamp}).pipe(
        tap(() => this.innerTimestamp = Date.now()),
        tap(data => {
          this._initialisationState$.next(data.state)
          if ("did" in data) this._did$.next(data.did)
          if ('appType' in data) this._appType$.next(data.appType)
          if (data.state === API.InitialisationState.COMPLETE) this.serverTimestamp = data.timestamp
        }),
        switchMap(data => this.fetchData$(data)),
        switchMap(() => {
          if (this.waiting) {
            this.waiting = false
            return obs$
          } else return voidObs$
        })
      )
    return obs$.pipe(
      this.fetching.wrapObservable()
    )
  }

  private _update$() {
    return this.fetching.isHeld$.pipe(
      first(),
      switchMap(fetching => {
        if (!fetching) return this.fetchState$
        this.waiting = true
        return this.fetching.waitForFree$
      }),
      this.loading.wrapObservable()
    )
  }

  private _fetchMasters$() {
    return this.api.getMasters$.pipe(
      map(data => {
        data.forEach(item => item.subjects.sort())
        data.sort((a, b) => {
          if (a.did < b.did) return 1
          else if (b.did < a.did) return -1
          else return 0
        })
        this._masters$.next(data)
      })
    )
  }

  private _fetchMasterProposals$() {
    return this.api.getMasterProposals$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.did < b.did) return 1
          else if (b.did < a.did) return -1
          else if (a.subject < b.subject) return 1
          else if (b.subject < a.subject) return -1
          else if (a.proposalType < b.proposalType) return 1
          else if (b.proposalType < a.proposalType) return -1
          else return 0
        })
        this._masterProposals$.next(data)
      })
    )
  }

  private _fetchSubjects$() {
    return this.api.getSubjects$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.name < b.name) return 1
          else if (b.name < a.name) return -1
          else return 0
        })
        this._subjects$.next(data)
      })
    )
  }

  private _fetchSubjectProposals$() {
    return this.api.getSubjectProposals$.pipe(
      map(data => {
        data.forEach(proposal => {
          if (proposal.change.type === API.SubjectProposalType.COMPONENT_SET) {
            proposal.change.componentSet.sort()
          }
        })
        data.sort((a, b) => {
          if (a.subject < b.subject) return 1
          if (b.subject < a.subject) return -1

          if (a.change.type < b.change.type) return 1
          if (b.change.type < a.change.type) return -1

          if (a.proposalType < b.proposalType) return 1
          if (b.proposalType < a.proposalType) return -1

          if (a.change.type === API.SubjectProposalType.CHILD) {
            if (a.change.child < (b.change as any).child) return 1
            if ((b.change as any).child < a.change.child) return -1
            return 0
          }

          if (a.change.componentSet.length < (b.change as any).componentSet.length) return 1
          if ((b.change as any).componentSet.length < a.change.componentSet.length) return -1
          const aSet = a.change.componentSet
          const bSet = (b.change as any).componentSet as string[]
          for (let i = 0; i < aSet.length; i++) {
            if (aSet[i] < bSet[i]) return 1
            if (bSet[i] < aSet[i]) return -1
          }
          return 0
        })
        this._subjectProposals$.next(data)
      })
    )
  }

  private _fetchHeldCredentials$() {
    return this.api.getHeldCredentials$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.subject < b.subject) return 1
          else if (b.subject < a.subject) return -1
          else if (a.did < b.did) return 1
          else if (b.did < a.did) return -1
          else return 0
        })
        this._heldCredentials$.next(data)
      })
    )
  }

  private _fetchIssuedCredentials$() {
    return this.api.getIssuedCredentials$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.did < b.did) return 1
          else if (b.did < a.did) return -1
          else if (a.subject < b.subject) return 1
          else if (b.subject < a.subject) return -1
          else return 0
        })
        this._issuedCredentials$.next(data)
      })
    )
  }

  private _fetchOutgoingProofRequests$() {
    return this.api.getOutgoingProofRequests$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.did < b.did) return 1
          else if (b.did < a.did) return -1
          else if (a.subject < b.subject) return 1
          else if (b.subject < a.subject) return -1
          else return 0
        })
        this._outgoingProofRequests$.next(data)
      })
    )
  }

  private _fetchIncomingProofRequests$() {
    return this.api.getIncomingProofRequests$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.did < b.did) return 1
          else if (b.did < a.did) return -1
          else if (a.subject < b.subject) return 1
          else if (b.subject < a.subject) return -1
          else return 0
        })
        this._incomingProofRequests$.next(data)
      })
    )
  }

  private _fetchReachableSubjects$() {
    return this.api.getReachableSubjects$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.name < b.name) return 1
          else if (b.name < a.name) return -1
          else return 0
        })
        this._reachableSubjects$.next(data)
      })
    )
}
}
