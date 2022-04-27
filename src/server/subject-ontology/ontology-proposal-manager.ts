import {
  catchError, combineLatestWith,
  first,
  mergeMap,
  Observable,
  of, pairwise,
  ReplaySubject,
  switchMap, tap,
  withLatestFrom
} from "rxjs";
import {Server} from '@project-types'
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {
  OntologyProposalStoreProtocol,
  OntologyVoteProtocol
} from "../aries-based-protocols";
import {map, startWith} from "rxjs/operators";
import {State} from "../state";
import {SubjectOntology} from "./subject-ontology";
import {OntologyManager} from "./ontology-manager";

export class OntologyProposalManager {
  private static _instance: OntologyProposalManager | undefined
  static get instance() {
    if (!this._instance) this._instance = new OntologyProposalManager()
    return this._instance
  }
  private constructor() { }

  static proposalToID(proposal: Immutable<Server.OntologyProposal>) {
    const changeTxt = proposal.change.type === Server.SubjectProposalType.CHILD
      ? proposal.change.child
      : [...proposal.change.component_set].sort().join(';')
    return `${proposal.subject}-${proposal.proposalType}-${proposal.change.type}-${changeTxt}`
  }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerOntologyProposals>>(1)
  readonly state$ = this._state$.asObservable()

  initialiseController$() {
    return OntologyProposalStoreProtocol.instance.initialiseController$().pipe(
      map(state => {
        this._state$.next(state)
        this.watchState()
        this.watchNewProposals()
        this.watchVotes()
      }),
      switchMap(() => OntologyVoteProtocol.instance.initialiseController$())
    )
  }

  private watchNewProposals() {
    const obs$: Observable<void> = OntologyVoteProtocol.instance.newProposals$.pipe(
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

  private addProposal$(proposal: Immutable<Server.OntologyProposal>) {
    return this._state$.pipe(
      first(),
      tap(() => State.instance.startUpdating()),
      map(state => {
        const id = OntologyProposalManager.proposalToID(proposal)
        if (state.has(id)) throw new Error(`Trying to create ontology proposal but already exists`)
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
    const obs$: Observable<void> = OntologyVoteProtocol.instance.controllerVotes$.pipe(
      withLatestFrom(this._state$),
      tap(() => State.instance.startUpdating()),
      map(([vote, state]) => {
        const proposalID = OntologyProposalManager.proposalToID(vote);
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
        return this.removeInvalidated$(subjects, state!).pipe(
          switchMap(newState =>
            this.updateVoters$(newState || state!, subjects, masters).pipe(
              map(_newState => _newState || newState)
            )
          ),
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

  private removeInvalidated$(subjectOntology: Immutable<Server.Subjects>, proposals: Immutable<Server.ControllerOntologyProposals>) {
    const remainingProposals = new Map();
    const arr = [...proposals].map(([key, proposal]) => {
      if (!subjectOntology.has(proposal.subject)) return of(undefined)
      if (proposal.proposalType === Server.ProposalType.ADD) {
        if (proposal.change.type === Server.SubjectProposalType.CHILD) {
          remainingProposals.set(key, proposal)
        } else {
          if (![...proposal.change.component_set].every(x => subjectOntology.has(x))) return of(undefined)
          return SubjectOntology.instance.canAddComponentSet$(proposal.subject, proposal.change.component_set).pipe(
            map(valid => {if (valid) remainingProposals.set(key, proposal)})
          )
        }
      } else {
        if (proposal.change.type === Server.SubjectProposalType.CHILD) {
          if (!subjectOntology.has(proposal.change.child)) return of(undefined)
          return SubjectOntology.instance.canRemoveChild$(proposal.subject, proposal.change.child).pipe(
            map(valid => {if (valid) remainingProposals.set(key, proposal)})
          )
        } else {
          const set = proposal.change.component_set
          if (![...set].every(x => subjectOntology.has(x))) return of(undefined)
          const sets = [...subjectOntology.get(proposal.subject)?.componentSets || []].filter(_set => {
            if (set.size !== _set.size) return false
            return !![...set].every(x => _set.has(x))
          })
          if (sets.length > 0) remainingProposals.set(key, proposal)
        }
      }
      return of(undefined)
    })
    return forkJoin$(arr).pipe(
      map(() => {
        if (remainingProposals.size === proposals.size) return
        else return remainingProposals as typeof proposals
      })
    )
  }

  private getVoters$(subjects: ReadonlySet<string>, masters: Immutable<Server.ControllerMasters>) {
    return forkJoin$(
      [...masters].map(([did, subjectMap]) => {
        const heldSubjects = new Set([...subjectMap].map(([subject, _]) => subject))
        return SubjectOntology.instance.canReachAllFromSubjects$(heldSubjects, subjects).pipe(
          map(reached => reached ? did : null)
        )
      })
    ).pipe(
      map(voters => voters.filter(did => did !== null) as string[]),
      map(voters => new Set(voters))
    )
  }

  private _updateVoters(voters: Set<string>, proposal: Immutable<Server.ControllerOntologyProposal>) {
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

  private requiredSubjects(proposal: Immutable<Server.ControllerOntologyProposal>, subjects: Immutable<Server.Subjects>) {
    const set = new Set<string>()
    set.add(proposal.subject)
    if (proposal.change.type === Server.SubjectProposalType.CHILD) {
      if (proposal.proposalType === Server.ProposalType.REMOVE || subjects.has(proposal.change.child)) {
        set.add(proposal.change.child)
      }
    } else {
      proposal.change.component_set.forEach(subject => set.add(subject))
    }
    return set
  }

  private updateVoters$(
    state: Immutable<Server.ControllerOntologyProposals>,
    subjects: Immutable<Server.Subjects>,
    masters: Immutable<Server.ControllerMasters>
  ) {
    let changed = false
    const updates$ = [...state].map(([id, proposal]) => {
      return this.getVoters$(this.requiredSubjects(proposal, subjects), masters).pipe(
        map(voters => {
          const newProposal = this._updateVoters(voters, proposal)
          return [id, newProposal || proposal] as [typeof id, typeof proposal]
        })
      );
    })
    return forkJoin$(updates$).pipe(
      map(newStateData => {
        if (!changed) return
        return new Map(newStateData) as typeof state
      })
    )
  }

  private actionProposal$(proposal: Immutable<Server.ControllerOntologyProposal>) {
    const votes = [...proposal.votes].map(([_, vote]) => vote)
    const total = votes.length
    const boundary = total / 2
    const inFavour = votes.filter(vote => vote === true).length
    const against = votes.filter(vote => vote === false).length
    if (total === 0 || inFavour > boundary) {
      if (proposal.proposalType === Server.ProposalType.ADD) {
        if (proposal.change.type === Server.SubjectProposalType.CHILD) {
          return OntologyManager.instance.addChild$(proposal.subject, proposal.change.child)
            .pipe(map(() => true))
        } else {
          return OntologyManager.instance.addComponentSet$(proposal.subject, proposal.change.component_set)
            .pipe(map(() => true))
        }
      } else {
        if (proposal.change.type === Server.SubjectProposalType.CHILD) {
          return OntologyManager.instance.removeChild$(proposal.subject, proposal.change.child)
            .pipe(map(() => true))
        } else {
          return OntologyManager.instance.removeComponentSet$(proposal.subject, proposal.change.component_set)
            .pipe(map(() => true))
        }
      }
    } else if (against > boundary) return of(true)
    return of(false)
  }

  private actionProposals$(state: Immutable<Server.ControllerOntologyProposals>) {
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
        state.filter(proposal => proposal !== null) as
          [string, Immutable<Server.ControllerOntologyProposal>][]
      ),
      map(state => new Map(state)),
      map(newState => {
        if (newState.size === state.size) return
        return newState as typeof state
      })
    )
  }

  private issueAndRevokeVotes$(
    oldState: Immutable<Server.ControllerOntologyProposals>,
    state: Immutable<Server.ControllerOntologyProposals>
  ) {
    const revoke$ = forkJoin$(
      [...oldState].flatMap(([id, proposal]) => {
        const newVotes = state.get(id)?.votes || new Map()
        return [...proposal.votes].map(([did, vote]) => {
          const newVote = newVotes.get(did)
          if (vote === newVote || typeof vote === "boolean") return voidObs$
          return OntologyVoteProtocol.instance.revokeVote$(vote, proposal)
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
        return OntologyVoteProtocol.instance.issueVote$(did, proposal).pipe(
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
