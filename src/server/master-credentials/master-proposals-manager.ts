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
import {MasterProposalStoreProtocol, MasterVoteProtocol} from "../aries-based-protocols";
import {map} from "rxjs/operators";
import {MasterCredentialsManager} from "./master-credentials-manager";
import {State} from "../state";
import {SubjectOntology} from "../subject-ontology";

export class MasterProposalsManager {
  static readonly instance = new MasterProposalsManager()
  private constructor() { }

  static proposalToID(proposal: Server.MasterProposal) {
    return `${proposal.did}-${proposal.proposalType}-${proposal.subject}`
  }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerMasterProposals>>(1)
  readonly state$ = this._state$.asObservable()

  initialise$() {
    return voidObs$.pipe(
      map(() => {
        this.watchVotes()
        this.watchMastersAndOntology()
      }),
      switchMap(() => MasterProposalStoreProtocol.instance.getFromStore$()),
      map(state => this._state$.next(state))
    )
  }

  private watchVotes() {
    const obs$: Observable<void> = MasterVoteProtocol.instance.controllerVotes$.pipe(
      withLatestFrom(this._state$),
      mergeMap(([vote, state]) => {
        const proposalID = MasterProposalsManager.proposalToID(vote);
        const proposal = state.get(proposalID)
        if (!proposal) throw Error(`received vote for non existent proposal`)
        const voterData = proposal.votes.get(vote.voterDID)
        if (!voterData || typeof voterData === 'boolean') throw new Error(`Received vote but voter can't vote`)

        const newVotes = new Map(proposal.votes)
        newVotes.set(vote.voterDID, vote.vote)

        const proposalResult = MasterProposalsManager.proposalResult(newVotes)
        const newState = new Map(state)
        if (proposalResult === null) {
          const newProposal = {...proposal, votes: newVotes}
          newState.set(proposalID, newProposal)
        } else {
          newState.delete(proposalID)
        }
        this._state$.next(newState)
        if (proposalResult === null) return MasterVoteProtocol.instance.revokeVote$(voterData, vote)
        return this.revokeAllVotes$(proposal).pipe(
          switchMap(() => {
            if (proposalResult) return MasterProposalsManager.actionProposal$(proposal)
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

  private static proposalResult(votes: Immutable<Server.ControllerMasterProposal['votes']>) {
    const _votes = [...votes].map(([_, vote]) => vote)
    const totalVotes = _votes.length
    const votesFor = _votes.filter(vote => vote === true).length
    const votesAgainst = _votes.filter(vote => vote === false).length
    if (votesFor > totalVotes / 2) return true
    else if (votesAgainst >= totalVotes / 2) return false
    else return null
  }

  private revokeAllVotes$(proposal: Immutable<Server.ControllerMasterProposal>) {
    const arr = [...proposal.votes]
      .filter(([_,data]) => typeof data !== 'boolean')
      .map(([_, data ]) => data as Exclude<typeof data, boolean>)
      .map(vote => MasterVoteProtocol.instance.revokeVote$(vote, proposal))
    return forkJoin(arr).pipe(map(() => undefined as void))
  }

  private static actionProposal$(proposal: Immutable<Server.ControllerMasterProposal>) {
    if (proposal.proposalType === Server.ProposalType.ADD) {
      return MasterCredentialsManager.instance.addMaster$(proposal.did, proposal.subject)
    } else {
      return MasterCredentialsManager.instance.removeMaster$(proposal.did, proposal.subject)
    }
  }

  private getVoters$(subject: string) {
    return State.instance.controllerMasters$.pipe(
      map(masters => [...masters].map(([did, subjectMap]) => {
        const subjects = new Set([...subjectMap].map(([subject, _]) => subject))
        return SubjectOntology.instance.standardSearch$(subjects, new Set([subject])).pipe(
          map(searcher => !!searcher.getSearchPath(subject) ? did : null)
        )
      })),
      mergeMap(data => forkJoin(data)),
      map(data => new Set(data.filter(did => !!did) as string[]))
    )
  }

  private updateProposal$(proposal: Immutable<Server.ControllerMasterProposal>) {
    return this.getVoters$(proposal.subject).pipe(
      switchMap(voters => {
        const oldVoters = new Set(proposal.votes.keys())
        const deleted = [...oldVoters].filter(did => !voters.has(did))
        const added = [...voters].filter(did => !oldVoters.has(did))

        if (deleted.length === 0 && added.length === 0) return of(null)

        const votes = new Map(proposal.votes)
        deleted.forEach(did => votes.delete(did))
        added.forEach(did => votes.set(did, {cred_rev_id: '', rev_reg_id: '', connection_id: ''}))
        const proposalResult = MasterProposalsManager.proposalResult(votes)
        if (proposalResult !== null) return of(proposalResult)

        const toRevoke = deleted.map(did => proposal.votes.get(did))
          .filter(credData => !!credData && typeof credData !== "boolean")
          .map(credData => credData as Exclude<typeof credData, boolean | undefined>)
          .map(credData => MasterVoteProtocol.instance.revokeVote$(credData, proposal))
        const toIssue = added.map(did => MasterVoteProtocol.instance.issueVote$(did, proposal)
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
            newState.set(MasterProposalsManager.proposalToID(update.old), update.new)
            return
          }
          arr.push(this.revokeAllVotes$(update.old))
          newState.delete(MasterProposalsManager.proposalToID(update.old))
          if (update.new === true) arr.push(MasterProposalsManager.actionProposal$(update.old))
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
