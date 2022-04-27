import {
  catchError, combineLatestWith,
  first, mergeMap,
  Observable,
  of, pairwise,
  ReplaySubject,
  switchMap, tap,
  withLatestFrom
} from "rxjs";
import {Server, API} from '@project-types'
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {MasterProposalStoreProtocol, MasterVoteProtocol} from "../aries-based-protocols";
import {map, startWith} from "rxjs/operators";
import {MasterCredentialsManager} from "./master-credentials-manager";
import {State} from "../state";
import {SubjectOntology} from "../subject-ontology";

export class MasterProposalsManager {
  private static _instance: MasterProposalsManager | undefined
  static get instance() {
    if (!this._instance) this._instance = new MasterProposalsManager()
    return this._instance
  }
  private constructor() { }

  static proposalToID(proposal: Server.MasterProposal) {
    return `${proposal.did}-${proposal.proposalType}-${proposal.subject}`
  }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerMasterProposals>>(1)
  readonly state$ = this._state$.asObservable()

  initialiseController$() {
    return MasterProposalStoreProtocol.instance.initialiseController$().pipe(
      map(state => {
        this._state$.next(state)
        this.watchState()
        this.watchNewProposals()
        this.watchVotes()
      }),
      switchMap(() => MasterVoteProtocol.instance.initialiseController$())
    )
  }

  controllerCreateProposal$(proposal: API.MasterProposalData) {
    return State.instance.controllerMasters$.pipe(
      first(),
      tap(() => State.instance.startUpdating()),
      switchMap(masters => {
        if (masters.size > 0) throw new Error(`controller can't create master`)
        return this.addProposal$(proposal)
      })
    )
  }

  private watchNewProposals() {
    const obs$: Observable<void> = MasterVoteProtocol.instance.newProposals$.pipe(
      map(proposal => {
        this.addProposal$(proposal)
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private addProposal$(proposal: Immutable<Server.MasterProposal>) {
    return this._state$.pipe(
      first(),
      tap(() => State.instance.startUpdating()),
      map(state => {
        const id = MasterProposalsManager.proposalToID(proposal)
        if (state.has(id)) throw new Error(`Trying to create master proposal but already exists`)
        const newMap = new Map(state)
        newMap.set(id, {...proposal, votes: new Map()})
        this._state$.next(newMap)
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      })
    )
  }

  private watchVotes() {
    const obs$: Observable<void> = MasterVoteProtocol.instance.controllerVotes$.pipe(
      withLatestFrom(this._state$),
      tap(() => State.instance.startUpdating()),
      map(([vote, state]) => {
        const proposalID = MasterProposalsManager.proposalToID(vote);
        const proposal = state.get(proposalID)
        if (!proposal) throw Error(`received vote for non existent proposal`)
        const voterData = proposal.votes.get(vote.voterDID)
        if (!voterData || typeof voterData === 'boolean') throw new Error(`Received vote but voter can't vote`)

        const newVotes = new Map(proposal.votes)
        newVotes.set(vote.voterDID, vote.vote)

        const newState = new Map(state)
        this._state$.next(newState)
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchState() {
    const obs$: Observable<void> = this._state$.pipe(
      startWith(null),
      pairwise(),
      combineLatestWith(State.instance._subjectOntology$, State.instance._controllerMasters$),
      tap(() => State.instance.startUpdating()),
      mergeMap(([[oldState, state], subjects, masters]) => {
        let newState = this.removeInvalidated(state!, subjects, masters)
        return this.updateVoters$(newState || state!, masters).pipe(
          map(_newState => _newState || newState),
          switchMap(newState =>
            this.actionProposals$(newState || state!).pipe(
              map(_newState => _newState || newState)
            )
          ),
          switchMap(newState => {
            if (!oldState) return of(newState)
            return this.issueAndRevokeVotes$(oldState, newState || state!).pipe(
              map(_newState => _newState || newState)
            )
          }),
          map(newState => {
            if (newState) this._state$.next(newState)
          })
        )
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private removeInvalidated(
    state: Immutable<Server.ControllerMasterProposals>,
    subjects: Immutable<Server.Subjects>,
    masters: Immutable<Server.ControllerMasters>
  ) {
    let changed = false
    const newState = [...state]
      .filter(([_, proposal]) => {
        const credExists = masters.get(proposal.did)?.has(proposal.subject) || false
        if ((credExists && proposal.proposalType === Server.ProposalType.ADD) ||
          (!credExists && proposal.proposalType === Server.ProposalType.REMOVE) ||
          !subjects.has(proposal.subject)
        ) {
          changed = true
          return false
        }
        return true
      })
    if (!changed) return
    return new Map(newState) as typeof state
  }

  private getVoters$(subject: string, masters: Immutable<Server.ControllerMasters>) {
    return forkJoin$(
      [...masters].map(([did, subjectMap]) => {
        const heldSubjects = new Set([...subjectMap].map(([subject, _]) => subject))
        return SubjectOntology.instance.canReachFromSubjects$(heldSubjects, subject).pipe(
          map(reached => reached ? did : null)
        )
      })
    ).pipe(
      map(voters => voters.filter(did => did !== null) as string[]),
      map(voters => new Set(voters))
    )
  }

  private _updateVoters(voters: Set<string>, proposal: Immutable<Server.ControllerMasterProposal>) {
    let changed = false
    const newVotes = [...proposal.votes]
      .filter(([did, _]) => {
        if (voters.has(did)) return true
        changed = true
        return false
      })
    voters.forEach(voter => {
      if (proposal.votes.has(voter)) return
      changed = true
      newVotes.push([voter, {connection_id: '', cred_rev_id: '', rev_reg_id: ''}])
    })
    if (!changed) return
    changed = true
    return {...proposal, votes: new Map(newVotes)} as typeof proposal
  }

  private updateVoters$(
    state: Immutable<Server.ControllerMasterProposals>,
    masters: Immutable<Server.ControllerMasters>
  ) {
    let changed = false
    const updates$ = [...state].map(([id, proposal]) =>
      this.getVoters$(proposal.subject, masters).pipe(
        map(voters => {
          const newProposal = this._updateVoters(voters, proposal)
          return [id, newProposal || proposal] as [typeof id, typeof proposal]
        })
      )
    )
    return forkJoin$(updates$).pipe(
      map(newStateData => {
        if (!changed) return
        return new Map(newStateData) as typeof state
      })
    )
  }

  private actionProposal$(proposal: Immutable<Server.ControllerMasterProposal>) {
    const votes = [...proposal.votes].map(([_, vote]) => vote)
    const total = votes.length
    const boundary = total / 2
    const inFavour = votes.filter(vote => vote === true).length
    const against = votes.filter(vote => vote === false).length
    if (total === 0 || inFavour > boundary) {
      if (proposal.proposalType === Server.ProposalType.ADD) {
        return MasterCredentialsManager.instance.addMaster$(proposal.did, proposal.subject)
          .pipe(map(() => true))
      }
      return MasterCredentialsManager.instance.removeMaster$(proposal.did, proposal.subject)
        .pipe(map(() => true))
    } else if (against > boundary) return of(true)
    return of(false)
  }

  private actionProposals$(state: Immutable<Server.ControllerMasterProposals>) {
    const updates$ = [...state].map(([id, proposal]) =>
      this.actionProposal$(proposal).pipe(
        map(actioned => {
          if (actioned) return null
          return [id, proposal] as [typeof id, typeof proposal]
        })
      )
    )
    return forkJoin$(updates$).pipe(
      map(state =>
        state.filter(proposal => proposal !== null) as [string, Immutable<Server.ControllerMasterProposal>][]
      ),
      map(state => new Map(state)),
      map(newState => {
        if (newState.size === state.size) return
        return newState as typeof state
      })
    )
  }

  private issueAndRevokeVotes$(
    oldState: Immutable<Server.ControllerMasterProposals>,
    state: Immutable<Server.ControllerMasterProposals>
  ) {
    const revoke$ = forkJoin$(
      [...oldState].flatMap(([id, proposal]) => {
        const newVotes = state.get(id)?.votes || new Map()
        return [...proposal.votes].map(([did, vote]) => {
          const newVote = newVotes.get(did)
          if (vote === newVote || typeof vote === "boolean") return voidObs$
          return MasterVoteProtocol.instance.revokeVote$(vote, proposal)
        })
      })
    )
    let changed = false
    const newState$ = [...state].map(([id, proposal]) => {
      const oldVotes = oldState.get(id)?.votes || new Map()
      const votes = [...proposal.votes].map(([did, vote]) => {
        const oldVote = oldVotes.get(did)
        if (vote === oldVote || typeof vote === "boolean") {
          return of([did, vote] as [typeof did, typeof vote])
        }
        changed = true
        return MasterVoteProtocol.instance.issueVote$(did, proposal).pipe(
          map(vote => [did, vote] as [typeof did, typeof vote])
        )
      })
      return forkJoin$(votes).pipe(
        map(votes =>
          [id, {...proposal, votes: new Map(votes)}] as [typeof id, typeof proposal]
        )
      )
    })
    return revoke$.pipe(
      switchMap(() => forkJoin$(newState$)),
      map(newState => {
        if (!changed) return
        return new Map(newState)
      })
    )
  }
}
