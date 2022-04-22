import {
  catchError,
  debounceTime,
  forkJoin,
  merge,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {Server} from '@project-types'
import {Immutable, voidObs$} from "@project-utils";
import {MasterVoteProtocol, OntologyProposalStoreProtocol, OntologyVoteProtocol} from "../aries-based-protocols";
import {map} from "rxjs/operators";
import {State} from "../state";
import {SubjectOntology} from "./subject-ontology";
import {SubjectOntologyManager} from "./subject-ontology-manager";

export class OntologyProposalManager {
  static readonly instance = new OntologyProposalManager()
  private constructor() { }

  static proposalToID(proposal: Immutable<Server.OntologyProposal>) {
    const changeTxt = proposal.change.type === Server.SubjectProposalType.CHILD
      ? proposal.change.child
      : [...proposal.change.component_set].sort().join(';')
    return `${proposal.subject}-${proposal.proposalType}-${proposal.change.type}-${changeTxt}`
  }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerOntologyProposals>>(1)
  readonly state$ = this._state$.asObservable()

  initialise$() {
    return voidObs$.pipe(
      map(() => {
        this.watchVotes()
        this.watchMastersAndOntology()
      }),
      switchMap(() => OntologyProposalStoreProtocol.instance.getFromStore$()),
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
    return forkJoin(arr).pipe(map(() => undefined as void))
  }

  private static actionProposal$(proposal: Immutable<Server.ControllerOntologyProposal>) {
    if (proposal.proposalType === Server.ProposalType.ADD) {
      if (proposal.change.type === Server.SubjectProposalType.CHILD) {
        return SubjectOntologyManager.instance.addChild$(proposal.subject, proposal.change.child)
      } else {
        return SubjectOntologyManager.instance.addComponentSet$(proposal.subject, proposal.change.component_set)
      }
    } else {
      if (proposal.change.type === Server.SubjectProposalType.CHILD) {
        return SubjectOntologyManager.instance.removeChild$(proposal.subject, proposal.change.child)
      } else {
        return SubjectOntologyManager.instance.removeComponentSet$(proposal.subject, proposal.change.component_set)
      }
    }
  }

  private getVoters$(subjects: Set<string>) {
    return State.instance.controllerMasters$.pipe(
      map(masters => [...masters].map(([did, subjectMap]) => {
        const startingSubjects = new Set([...subjectMap].map(([subject, _]) => subject))
        return SubjectOntology.instance.standardSearch$(startingSubjects, subjects).pipe(
          map(searcher => {
            const results = [...subjects].map(subject => !!searcher.getSearchPath(subject) ? did : null)
            if (results.length > 0 && results.every(did => !!did)) return results[0] as string
            return null
          })
        )
      })),
      mergeMap(data => forkJoin(data)),
      map(data =>
        new Set(data.filter(did => !!did) as string[])
      )
    )
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

        return forkJoin(toRevoke).pipe(
          switchMap(() => forkJoin(toIssue)),
          map(voteDetails => voteDetails.forEach(x => votes.set(x.did, x.data))),
          map(() => ({...proposal, votes}))
        )
      })
    )
  }

  private watchMastersAndOntology() {
    const obs$: Observable<void> = merge([
      State.instance.controllerMasters$,
      State.instance.subjectOntology$]
    ).pipe(
      debounceTime(100),
      withLatestFrom(this._state$),
      map(([_, proposals]) => proposals),
      map(proposals => [...proposals.values()]
        .map(proposal =>
          this.updateProposal$(proposal)
            .pipe(map(_new => ({old: proposal, new: _new})))
        )
      ),
      mergeMap(updates => forkJoin(updates)),
      withLatestFrom(this._state$),
      switchMap(([updates, state]) => {
        let changed = false
        const newState = new Map(state)
        const arr: Observable<void>[] = []
        updates.forEach(update => {
          if (update.new === null) return
          changed = true
          if (typeof update.new !== "boolean") {
            newState.set(OntologyProposalManager.proposalToID(update.old), update.new)
            return
          }
          arr.push(this.revokeAllVotes$(update.old))
          newState.delete(OntologyProposalManager.proposalToID(update.old))
          if (update.new === true) arr.push(OntologyProposalManager.actionProposal$(update.old))
          return
        })
        if (changed) this._state$.next(newState)
        return forkJoin(arr)
      }),
      map(() => undefined as void),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
