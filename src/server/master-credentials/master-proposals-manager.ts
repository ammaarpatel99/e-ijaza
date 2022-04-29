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
      }),
      tap({
        next: () => State.instance.stopUpdating(),
        error: () => State.instance.stopUpdating()
      })
    )
  }

  private watchNewProposals() {
    const obs$: Observable<void> = MasterVoteProtocol.instance.newProposals$.pipe(
      mergeMap(proposal =>
        this.addProposal$(proposal)
      ),
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
        const newProposal = {...proposal, votes: newVotes}
        const newState = new Map(state)
        newState.set(proposalID, newProposal)
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
          map(newState => {
            const res = this.actionProposals(newState || state!)
            if (res) return res
            return {newState, actions: []}
          }),
          switchMap(({newState, actions}) => {
            if (!oldState) return of({newState, actions})
            return this.issueAndRevokeVotes$(oldState, newState || state!).pipe(
              map(_newState => _newState || newState),
              map(newState => ({newState, actions}))
            )
          }),
          switchMap(({newState, actions}) => {
            if (newState) this._state$.next(newState)
            return forkJoin$(actions)
          })
        )
      }),
      map(() => undefined as void),
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
        if (heldSubjects.size === 0) return of(null)
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
          if (newProposal) changed = true
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
      }
      return MasterCredentialsManager.instance.removeMaster$(proposal.did, proposal.subject)
    } else if (against >= boundary) return voidObs$
    return
  }

  private actionProposals(state: Immutable<Server.ControllerMasterProposals>) {
    const actions: Observable<void>[] = []
    const updates = [...state]
      .map(([id, proposal]) => {
        const action$ = this.actionProposal$(proposal)
        if (!action$) return [id, proposal] as [typeof id, typeof proposal]
        actions.push(action$)
        return null
      })
      .filter(data => data !== null)
      .map(data => data as Exclude<typeof data, null>)

    const newState = new Map(updates)
    if (newState.size === state.size) return
    return {actions, newState}
  }

  private issueAndRevokeVotes$(
    oldState: Immutable<Server.ControllerMasterProposals>,
    state: Immutable<Server.ControllerMasterProposals>
  ) {
    const revoke$ = forkJoin$(
      [...oldState].flatMap(([id, proposal]) => {
        const newVotes = state.get(id)?.votes
        return [...proposal.votes].map(([did, oldVote]) => {
          const newVote = newVotes?.get(did)
          if (typeof oldVote !== 'boolean' && (!newVote || typeof newVote === 'boolean')) {
            return MasterVoteProtocol.instance.revokeVote$(oldVote, proposal)
          }
          return voidObs$
        })
      })
    )

    let changed = false
    const newState$ = [...state].map(([id, proposal]) => {
      const votes = [...proposal.votes].map(([did, vote]) => {
        if (typeof vote !== 'boolean' && vote.connection_id === '') {
          changed = true
          return MasterVoteProtocol.instance.issueVote$(did, proposal).pipe(
            map(newVote => [did, newVote] as [typeof did, typeof newVote])
          )
        }
        return of([did, vote] as [typeof did, typeof vote])
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
