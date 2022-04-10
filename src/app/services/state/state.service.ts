import {Injectable, OnDestroy} from '@angular/core';
import {
  AppType, HeldCredential, IncomingProofRequest,
  InitialisationState, IssuedCredential,
  Master, MasterProposal,
  OutgoingProofRequest, ReachableSubject,
  Subject, SubjectProposal,
  SubjectProposalType, UpdateReq
} from '@project-types/interface-api'
import {Immutable} from '@project-utils'
import {
  AsyncSubject,
  BehaviorSubject,
  filter,
  first,
  forkJoin,
  interval,
  Observable,
  of,
  ReplaySubject,
  switchMap, switchMapTo,
  takeUntil, tap, withLatestFrom
} from "rxjs";
import {map} from "rxjs/operators";
import {ApiService} from "../api/api.service";
import {LoadingService} from "../loading/loading.service";

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
  private waiting = false
  private readonly fetching$ = new BehaviorSubject(false)

  private readonly _initialisationState$ = new ReplaySubject<Immutable<InitialisationState>>(1)
  readonly initialisationState$ = this._initialisationState$.asObservable()

  private readonly _did$ = new ReplaySubject<string>(1)
  readonly did$ = this._did$.asObservable()

  private readonly _appType$ = new ReplaySubject<AppType>(1)
  readonly appType$ = this._appType$.asObservable()

  private readonly _masters$ = new ReplaySubject<Immutable<Master[]>>(1)
  readonly masters$ = this._masters$.asObservable()

  private readonly _masterProposals$ = new ReplaySubject<Immutable<MasterProposal[]>>(1)
  readonly masterProposals$ = this._masterProposals$.asObservable()

  private readonly _subjects$ = new ReplaySubject<Immutable<Subject[]>>(1)
  readonly subjects$ = this._subjects$.asObservable()
  readonly subjectNames$ = this.subjects$.pipe(
    map(arr => arr.map(subject => subject.name) as Immutable<string[]>)
  )

  private readonly _subjectProposals$ = new ReplaySubject<Immutable<SubjectProposal[]>>(1)
  readonly subjectProposals$ = this._subjectProposals$.asObservable()

  private readonly _heldCredentials$ = new ReplaySubject<Immutable<HeldCredential[]>>(1)
  readonly heldCredentials$ = this._heldCredentials$.asObservable()

  private readonly _issuedCredentials$ = new ReplaySubject<Immutable<IssuedCredential[]>>(1)
  readonly issuedCredentials$ = this._issuedCredentials$.asObservable()

  private readonly _outgoingProofRequests$ = new ReplaySubject<Immutable<OutgoingProofRequest[]>>(1)
  readonly outgoingProofRequests$ = this._outgoingProofRequests$.asObservable()

  private readonly _incomingProofRequests$ = new ReplaySubject<Immutable<IncomingProofRequest[]>>(1)
  readonly incomingProofRequests$ = this._incomingProofRequests$.asObservable()

  private readonly _reachableSubjects$ = new ReplaySubject<Immutable<ReachableSubject[]>>(1)
  readonly reachableSubjects$ = this._reachableSubjects$.asObservable()

  readonly reachableFromMasterCreds$ = this.reachableSubjects$.pipe(
    map(data => data.filter(subject => subject.reachableByMasterCredentials)),
    map(data => data.map(subject => subject.name) as Immutable<string[]>)
  )

  readonly update$ =
    this.fetching$.pipe(
      first(),
      switchMap(fetching => {
        if (!fetching) return this.fetchState$
        this.waiting = true
        return this.fetching$.pipe(
          filter(fetching => !fetching),
          first(),
          map(() => undefined)
        )
      }),
      this.loadingService.rxjsOperator()
    )

  private readonly _fetchState$: Observable<void> =
    of(undefined).pipe(
      map((): UpdateReq => ({timestamp: this.serverTimestamp})),
      this.api.getStateUpdate,
      tap(data => {
        this.innerTimestamp = StateService.TIMESTAMP_NOW()
        this._initialisationState$.next(data.state)
        if ("did" in data) this._did$.next(data.did)
        if ('appType' in data) this._appType$.next(data.appType)
        if (data.state === InitialisationState.COMPLETE) this.serverTimestamp = data.timestamp
      }),
      switchMap(data => {
        if (data.state !== InitialisationState.COMPLETE) return of(undefined)
        return forkJoin([
          !data.masters ? of(undefined) : this.fetchMasters$,
          !data.masterProposals ? of(undefined) : this.fetchMasterProposals$,
          !data.subjects ? of(undefined) : this.fetchSubjects$,
          !data.subjectProposals ? of(undefined) : this.fetchSubjectProposals$,
          !data.heldCredentials ? of(undefined) : this.fetchHeldCredentials$,
          !data.issuedCredentials ? of(undefined) : this.fetchIssuedCredentials$,
          !data.outgoingProofRequests ? of(undefined) : this.fetchOutgoingProofRequests$,
          !data.incomingProofRequests ? of(undefined) : this.fetchIncomingProofRequests$,
          !data.reachableSubjects ? of(undefined) : this.fetchReachableSubjects$
        ]).pipe(
          switchMapTo(of(undefined))
        )
      }),
      switchMap(() => {
        if (this.waiting) {
          this.waiting = false
          return this._fetchState$
        } else return of(undefined)
      })
    )

  private readonly fetchState$ =
    this.fetching$.pipe(
      filter(fetching => !fetching),
      first(),
      tap(() => this.fetching$.next(true)),
      switchMapTo(this._fetchState$),
      tap(() => this.fetching$.next(false)),
      this.loadingService.rxjsOperator()
    )

  private readonly fetchMasters$ =
    this.api.getMasters$.pipe(
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

  private readonly fetchMasterProposals$ =
    this.api.getMasterProposals$.pipe(
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

  private readonly fetchSubjects$ =
    this.api.getSubjects$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.name < b.name) return 1
          else if (b.name < a.name) return -1
          else return 0
        })
        this._subjects$.next(data)
      })
    )

  private readonly fetchSubjectProposals$ =
    this.api.getSubjectProposals$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.subject < b.subject) return 1
          else if (b.subject < a.subject) return -1
          else if (a.change.type < b.change.type) return 1
          else if (b.change.type < a.change.type) return -1
          else if (a.proposalType < b.proposalType) return 1
          else if (b.proposalType < a.proposalType) return -1
          else if (a.change.type === SubjectProposalType.CHILD) {
            if (a.change.child < (b.change as any).child) return 1
            else if ((b.change as any).child < a.change.child) return -1
            else return 0
          } else {
            if (a.change.componentSet.length < (b.change as any).componentSet.length) return 1
            else if ((b.change as any).componentSet.length < a.change.componentSet.length) return -1
            else {
              const aSet = a.change.componentSet
              const bSet = (b.change as any).componentSet as string[]
              for (let i = 0; i < aSet.length; i++) {
                if (aSet[i] < bSet[i]) return 1
                else if (bSet[i] < aSet[i]) return -1
              }
              return 0
            }
          }
        })
        this._subjectProposals$.next(data)
      })
    )

  private readonly fetchHeldCredentials$ =
    this.api.getHeldCredentials$.pipe(
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

  private readonly fetchIssuedCredentials$ =
    this.api.getIssuedCredentials$.pipe(
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

  private readonly fetchOutgoingProofRequests$ =
    this.api.getOutgoingProofRequests$.pipe(
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

  private readonly fetchIncomingProofRequests$ =
    this.api.getIncomingProofRequests$.pipe(
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

  private readonly fetchReachableSubjects$ =
    this.api.getReachableSubjects$.pipe(
      map(data => {
        data.sort((a, b) => {
          if (a.name < b.name) return 1
          else if (b.name < a.name) return -1
          else return 0
        })
        this._reachableSubjects$.next(data)
      })
    )

  constructor(
    private readonly api: ApiService,
    private readonly loadingService: LoadingService
  ) {
    this.update$.subscribe()
    this.regularlyUpdate()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private regularlyUpdate() {
    interval(StateService.AUTO_FETCH_TIME / 2).pipe(
      withLatestFrom(this.fetching$),
      filter(([_, fetching]) => {
        return !fetching &&
          StateService.TIMESTAMP_NOW() - this.innerTimestamp >= StateService.AUTO_FETCH_TIME
      }),
      switchMapTo(this.fetchState$),
      takeUntil(this.destroy$)
    ).subscribe()
  }
}
