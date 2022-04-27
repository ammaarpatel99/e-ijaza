import {
  catchError, combineLatestWith, defaultIfEmpty,
  first,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap, tap,
  withLatestFrom
} from "rxjs";
import {Server} from '@project-types'
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {MasterVoteProtocol, OntologyProposalStoreProtocol, OntologyVoteProtocol} from "../aries-based-protocols";
import {map} from "rxjs/operators";
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
    return voidObs$.pipe(
      map(() => {
        this._state$.next(new Map())
        this.watchVotes()
        this.watchMastersAndOntology()
        this.watchNewProposals()
      }),
      switchMap(() => OntologyVoteProtocol.instance.initialiseController$()),
      switchMap(() => OntologyProposalStoreProtocol.instance.initaliseController$()),
      map(state => this._state$.next(state))
    )
  }

  private watchVotes() {
    const obs$: Observable<void> = OntologyVoteProtocol.instance.controllerVotes$.pipe(
      withLatestFrom(this._state$),
      mergeMap(([vote, state]) => {
        const proposalID = OntologyProposalManager.proposalToID(vote);
        const proposal = state.get(proposalID)
        if (!proposal) throw Error(`received vote for non existent proposal`)
        const voterData = proposal.votes.get(vote.voterDID)
        if (!voterData || typeof voterData === 'boolean') throw new Error(`Received vote but voter can't vote`)

        const newVotes = new Map(proposal.votes)
        newVotes.set(vote.voterDID, vote.vote)

        const proposalResult = OntologyProposalManager.proposalResult(newVotes)
        const newState = new Map(state)
        if (proposalResult === null) {
          const newProposal = {...proposal, votes: newVotes}
          newState.set(proposalID, newProposal)
        } else {
          newState.delete(proposalID)
        }
        this._state$.next(newState)
        if (proposalResult === null) return OntologyVoteProtocol.instance.revokeVote$(voterData, vote)
        return this.revokeAllVotes$(proposal).pipe(
          switchMap(() => {
            if (proposalResult) return OntologyProposalManager.actionProposal$(proposal)
            else return voidObs$
          })
        )
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private static proposalResult(votes: Immutable<Server.ControllerOntologyProposal['votes']>) {
    const _votes = [...votes].map(([_, vote]) => vote)
    const totalVotes = _votes.length
    const votesFor = _votes.filter(vote => vote === true).length
    const votesAgainst = _votes.filter(vote => vote === false).length
    if (votesFor > totalVotes / 2) return true
    else if (votesAgainst >= totalVotes / 2) return false
    else return null
  }

  private revokeAllVotes$(proposal: Immutable<Server.ControllerOntologyProposal>) {
    const arr = [...proposal.votes]
      .filter(([_,data]) => typeof data !== 'boolean')
      .map(([_, data ]) => data as Exclude<typeof data, boolean>)
      .map(vote => OntologyVoteProtocol.instance.revokeVote$(vote, proposal))
    return forkJoin$(arr).pipe(
      map(() => undefined as void)
    )
  }

  private static actionProposal$(proposal: Immutable<Server.ControllerOntologyProposal>) {
    if (proposal.proposalType === Server.ProposalType.ADD) {
      if (proposal.change.type === Server.SubjectProposalType.CHILD) {
        return OntologyManager.instance.addChild$(proposal.subject, proposal.change.child)
      } else {
        return OntologyManager.instance.addComponentSet$(proposal.subject, proposal.change.component_set)
      }
    } else {
      if (proposal.change.type === Server.SubjectProposalType.CHILD) {
        return OntologyManager.instance.removeChild$(proposal.subject, proposal.change.child)
      } else {
        return OntologyManager.instance.removeComponentSet$(proposal.subject, proposal.change.component_set)
      }
    }
  }

  private getVoters$(subjects: Set<string>) {
    return State.instance._controllerMasters$.pipe(
      first(),
      map(masters => [...masters].map(([did, subjectMap]) => {
        const heldSubjects = new Set([...subjectMap].map(([subject, _]) => subject))
        return this.areSubjectsReachable$(subjects, heldSubjects).pipe(
          map(reached => reached ? did : null)
        )
      })),
      mergeMap(data => forkJoin$(data)),
      map(data => new Set(data.filter(did => !!did) as string[]))
    )
  }

  private areSubjectsReachable$(subjects: Set<string>, heldSubjects: Set<string>) {
    const obs$: Observable<boolean> = SubjectOntology.instance
      .standardSearch$(heldSubjects, subjects).pipe(
        switchMap(searcher => {
          const results = [...subjects].map(subject => searcher.getSearchPath(subject))
          searcher.deleteSearch()
          if (results.includes(undefined)) return obs$
          if (results.includes(null)) return of(false)
          return of(true)
        })
      )
    return obs$
  }

  private updateProposal$(proposal: Immutable<Server.ControllerOntologyProposal>) {
    const subjects = new Set<string>()
    subjects.add(proposal.subject)
    if (proposal.change.type === Server.SubjectProposalType.CHILD) subjects.add(proposal.change.child)
    else proposal.change.component_set.forEach(subject => subjects.add(subject))

    return this.getVoters$(subjects).pipe(
      switchMap(voters => {
        const oldVoters = new Set(proposal.votes.keys())
        const deleted = [...oldVoters].filter(did => !voters.has(did))
        const added = [...voters].filter(did => !oldVoters.has(did))

        if (deleted.length === 0 && added.length === 0) return of(null)

        const votes = new Map(proposal.votes)
        deleted.forEach(did => votes.delete(did))
        added.forEach(did => votes.set(did, {cred_rev_id: '', rev_reg_id: '', connection_id: ''}))
        const proposalResult = OntologyProposalManager.proposalResult(votes)
        if (proposalResult !== null) return of(proposalResult)

        const toRevoke = deleted.map(did => proposal.votes.get(did))
          .filter(credData => !!credData && typeof credData !== "boolean")
          .map(credData => credData as Exclude<typeof credData, boolean | undefined>)
          .map(credData => OntologyVoteProtocol.instance.revokeVote$(credData, proposal))
        const toIssue = added.map(did => OntologyVoteProtocol.instance.issueVote$(did, proposal)
          .pipe(map(data => ({data, did}))))

        return forkJoin$(toRevoke).pipe(
          switchMap(() => forkJoin$(toIssue)),
          map(voteDetails => voteDetails.forEach(x => votes.set(x.did, x.data))),
          map(() => ({...proposal, votes}))
        )
      })
    )
  }

  private removeInvalidated$(subjectOntology: Immutable<Server.Subjects>, proposals: Immutable<Server.ControllerOntologyProposals>) {
    const remainingProposals = new Map();
    const arr = [...proposals].map(([key, proposal]) => {
      if (!subjectOntology.has(proposal.subject)) return of(undefined)
      if (proposal.proposalType === Server.ProposalType.ADD) {
        if (proposal.change.type === Server.SubjectProposalType.CHILD) {
          const exists = subjectOntology.get(proposal.subject)?.children.has(proposal.change.child)
          if (!exists) remainingProposals.set(key, proposal)
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
        if (remainingProposals.size === proposals.size) return proposals
        else return remainingProposals as typeof proposals
      })
    )
  }

  private watchMastersAndOntology() {
    const obs$: Observable<void> = State.instance._controllerMasters$.pipe(
      combineLatestWith(State.instance._subjectOntology$),
      tap(() => State.instance.startUpdating()),
      withLatestFrom(this._state$),
      mergeMap(([[_, subjects], proposals]) => this.removeInvalidated$(subjects, proposals)),
      map(proposals => [...proposals.values()]
        .map(proposal =>
          this.updateProposal$(proposal)
            .pipe(map(_new => ({old: proposal, new: _new})))
        )
      ),
      switchMap(updates => forkJoin$(updates)),
      withLatestFrom(this._state$),
      switchMap(([updates, state]) => {
        let changed = false
        const newState = new Map(state)
        const arr: Observable<void>[] = []
        updates.forEach(update => {
          if (update.new === null) return
          changed = true
          if (typeof update.new !== "boolean") {
            newState.set(OntologyProposalManager.proposalToID(update.new), update.new)
            return
          }
          arr.push(this.revokeAllVotes$(update.old))
          newState.delete(OntologyProposalManager.proposalToID(update.old))
          if (update.new === true) arr.push(OntologyProposalManager.actionProposal$(update.old))
          return
        })
        if (changed) this._state$.next(newState)
        return forkJoin$(arr)
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
    ) as Observable<void>
    obs$.subscribe()
  }

  private watchNewProposals() {
    const obs$: Observable<void> = OntologyVoteProtocol.instance.newProposals$.pipe(
      map(({proposal, conn_id}): {proposal: Server.OntologyProposal, conn_id: string} => ({
        conn_id,
        proposal: {
          subject: proposal.subject,
          proposalType: proposal.proposalType,
          change: proposal.change.type === Server.SubjectProposalType.CHILD
            ? {type: Server.SubjectProposalType.CHILD, child: proposal.change.child}
            : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: new Set(proposal.change.componentSet)}
        }
      })),
      mergeMap(({proposal, conn_id}) => {
        return this.isValidProposal$(proposal).pipe(
          map(() => ({proposal, conn_id}))
        )
      }),
      switchMap(({proposal, conn_id}) =>
        MasterVoteProtocol.instance.validateNewProposal$(conn_id).pipe(
          switchMap(() => this.createProposal$(proposal))
        )
      ),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private isValidProposal$(proposal: Server.OntologyProposal) {
    return this._state$.pipe(
      withLatestFrom(State.instance.subjectOntology$),
      first(),
      switchMap(([state, subjects]) => {
        const proposalID = OntologyProposalManager.proposalToID(proposal)
        if (state.has(proposalID)) return of(false)
        if (!subjects.has(proposal.subject)) return of(false)
        if (proposal.proposalType === Server.ProposalType.ADD) {
          if (proposal.change.type === Server.SubjectProposalType.CHILD) {
            const exists  = subjects.get(proposal.subject)?.children.has(proposal.change.child)
            return of(!exists)
          } else {
            if (![...proposal.change.component_set].every(x => subjects.has(x))) return of(false)
            return SubjectOntology.instance.canAddComponentSet$(proposal.subject, proposal.change.component_set)
          }
        } else {
          if (proposal.change.type === Server.SubjectProposalType.CHILD) {
            if (!subjects.has(proposal.change.child)) return of(false)
            return SubjectOntology.instance.canRemoveChild$(proposal.subject, proposal.change.child)
          } else {
            const set = proposal.change.component_set
            if (![...set].every(x => subjects.has(x))) return of(false)
            const sets = [...subjects.get(proposal.subject)?.componentSets || []].filter(_set => {
              if (set.size !== _set.size) return of(false)
              return of(!![...set].every(x => _set.has(x)))
            })
            if (sets.length > 0) return of(true)
            return of(false)
          }
        }
      }),
      map(valid => {
        if (!valid) throw new Error(`Invalid proposal: ${JSON.stringify(proposal)}`)
      })
    )
  }

  private createProposal$(proposal: Server.OntologyProposal) {
    const _proposal: Server.ControllerOntologyProposal = {...proposal, votes: new Map()}
    return this.updateProposal$(_proposal).pipe(
      switchMap(result => {
        if (result === true) return OntologyProposalManager.actionProposal$(_proposal)
        if (result === false) return voidObs$
        if (result === null) throw new Error(`impossible state reached in creating ontology proposal`)
        return of(result)
      }),
      withLatestFrom(this._state$),
      first(),
      map(([proposal, state]) => {
        if (!proposal) return
        const newState = new Map(state)
        newState.set(OntologyProposalManager.proposalToID(proposal), proposal)
        this._state$.next(newState)
      })
    )
  }
}
