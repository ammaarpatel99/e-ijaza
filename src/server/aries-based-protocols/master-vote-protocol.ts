import {Server, Schemas, API} from '@project-types'
import {
  connectToController$,
  connectViaPublicDID$, deleteCredential,
  getHeldCredentials, isCredentialRevoked,
  issueCredential, presentProof,
  proposeProof, rejectProof, requestProof,
  revokeCredential$
} from "../aries-api";
import {
  catchError, defer,
  filter,
  first,
  from,
  last,
  mergeMap,
  Observable, of,
  ReplaySubject, Subject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {masterVoteSchema, teachingSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {MasterProposalsManager} from "../master-credentials";
import {State} from "../state";

export class MasterVoteProtocol {
  private static _instance: MasterVoteProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new MasterVoteProtocol()
    return this._instance
  }
  private constructor() { }

  private static VOTE_PROOF_NAME = 'Vote on Master Proposal'
  private static CREATION_PROOF_NAME = 'Create Master Proposal'
  private static IS_MASTER_PROOF_NAME = `Is Master For Creating Master Proposal`

  // CONTROLLER

  private readonly _controllerVotes$ = new Subject<Immutable<Server.ControllerMasterVote>>()
  private readonly _newProposals$ = new Subject<Server.MasterProposal>()
  readonly controllerVotes$ = this._controllerVotes$.asObservable()
  readonly newProposals$ = this._newProposals$.asObservable()

  initialiseController$() {
    return voidObs$.pipe(
      map(() => {
        this.watchVotes()
        this.watchNewProposals()
      })
    )
  }

  issueVote$(voterDID: string, proposal: Server.MasterProposal) {
    const data: Schemas.MasterProposalVoteSchema = {
      voteDetails: {
        did: proposal.did,
        action: proposal.proposalType,
        subject: proposal.subject,
        voterDID
      }
    }
    return connectViaPublicDID$({their_public_did: voterDID}).pipe(
      switchMap(connectionID => from(issueCredential({
        connection_id: connectionID,
        auto_remove: false,
        cred_def_id: masterVoteSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'voteDetails',
            value: JSON.stringify(data.voteDetails)
          }]
        }
      }))),
      switchMap(({credential_exchange_id}) => WebhookMonitor.instance.monitorCredential$(credential_exchange_id!)),
      last(),
      map(({connection_id, revocation_id, revoc_reg_id}): Server.CredentialInfo => ({
        connection_id: connection_id!,
        rev_reg_id: revoc_reg_id!,
        cred_rev_id: revocation_id!
      }))
    )
  }

  revokeVote$(credInfo: Server.CredentialInfo, proposal: Server.MasterProposal) {
    return revokeCredential$(credInfo, MasterProposalsManager.proposalToID(proposal))
  }

  private watchVotes() {
    const obs$: Observable<void> = WebhookMonitor.instance.proofs$.pipe(
      filter(proof => proof.state === 'verified' && proof.presentation_proposal_dict?.comment === MasterVoteProtocol.VOTE_PROOF_NAME),
      map(proof => {
        const voteDetailsID = Object.entries(proof.presentation_request!.requested_attributes)
          .filter(([_, data]) => data.name === 'voteDetails')
          .map(([id, _]) => id).shift()!
        const voteChoiceID = Object.entries(proof.presentation_request!.requested_attributes)
          .filter(([_, data]) => data.name === 'voteChoice')
          .map(([id, _]) => id).shift()!
        const voteDetails = JSON.parse(proof.presentation!.requested_proof!.revealed_attrs![voteDetailsID].raw!) as Schemas.MasterProposalVoteSchema['voteDetails']
        const voteChoice = JSON.parse(proof.presentation!.requested_proof!.revealed_attrs![voteChoiceID].raw!) as boolean
        return {voteDetails, voteChoice}
      }),
      map(({voteDetails, voteChoice}): Server.ControllerMasterVote => ({
        subject: voteDetails.subject,
        vote: voteChoice,
        did: voteDetails.did,
        proposalType: voteDetails.action,
        voterDID: voteDetails.voterDID
      })),
      map(data => this._controllerVotes$.next(data)),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchNewProposals() {
    const obs$: Observable<void> = WebhookMonitor.instance.proofs$.pipe(
      filter(proof =>
        proof.presentation_proposal_dict?.comment === MasterVoteProtocol.CREATION_PROOF_NAME
        && proof.state === 'verified'
      ),
      mergeMap(proof => {
        const conn_id = proof.connection_id!
        const proposal = JSON.parse(
          proof.presentation!.requested_proof!.self_attested_attrs!['proposal']
        ) as Server.MasterProposal
        return this.validateNewProposal$(conn_id).pipe(
          map(() => this._newProposals$.next(proposal))
        )
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private validateNewProposal$(connectionID: string) {
    const date = Date.now()
    return voidObs$.pipe(
      switchMap(() => from(requestProof({
        connection_id: connectionID,
        comment: MasterVoteProtocol.IS_MASTER_PROOF_NAME,
        proof_request: {
          name: MasterVoteProtocol.IS_MASTER_PROOF_NAME,
          version: '1.0',
          non_revoked: {from: date, to: date},
          requested_predicates: {},
          requested_attributes: {
            credential: {
              name: 'subject',
              restrictions: [{
                cred_def_id: teachingSchema.credID
              }]
            }
          }
        }
      }))),
      switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
      last(),
      map(() => undefined as void)
    )
  }

  // USER

  private readonly _userVotes$ = new ReplaySubject<Immutable<Server.UserMasterVotes>>(1)
  readonly userVotes$ = this._userVotes$.asObservable()

  initialiseUser$() {
    return this.getVotes$().pipe(
      map(() => {
        this.watchIssuing()
        this.watchRevocations()
      })
    )
  }

  sendVote$(vote: API.MasterProposalVote) {
    const id = MasterProposalsManager.proposalToID(vote)
    return this._userVotes$.pipe(
      first(),
      map(votes => {
        const _vote = votes.get(id)
        if (!_vote) throw new Error(`Voting on master using invalid vote`)
        return {credentialID: _vote.credentialID, cred_def_id: _vote.cred_def_id, voteChoice: vote.vote}
      }),
      switchMap(data =>
        connectToController$().pipe(
          switchMap(connectionID => from(proposeProof({
            connection_id: connectionID,
            comment: MasterVoteProtocol.VOTE_PROOF_NAME,
            auto_present: true,
            presentation_proposal: {
              attributes: [{
                name: 'voteDetails',
                referent: data.credentialID,
                cred_def_id: data.cred_def_id
              }, {
                name: 'voteChoice',
                value: JSON.stringify(data.voteChoice)
              }],
              predicates: []
            }
          }))),
          switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
          last()
        )
      ),
      map(() => undefined as void)
    )
  }

  createProposal$(proposal: API.MasterProposalData) {
    const _proposal: Server.MasterProposal = proposal
    return this.getMasterCredID$().pipe(
      switchMap(cred => {
        if (!cred) throw new Error(`Trying to create master proposal but not a master of anything`)
        return connectToController$()
      }),
      switchMap(connectionID =>
        from(proposeProof({
          auto_present: false,
          connection_id: connectionID,
          comment: MasterVoteProtocol.CREATION_PROOF_NAME,
          presentation_proposal: {
            predicates: [],
            attributes: [
              {name: 'proposal', value: JSON.stringify(_proposal)}
            ]
          }
        })).pipe(map(() => connectionID))
      ),
      switchMap(connectionID => this.watchForIsMaster$(connectionID)),
      map(() => undefined as void)
    )
  }

  private getVotes$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${masterVoteSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      switchMap(creds => this.removeDeleted$(creds)),
      map(creds => creds.map(({attrs, referent, cred_def_id}) =>({
        credentialID: referent!,
        cred_def_id: cred_def_id!,
        ...JSON.parse(attrs!['voteDetails']) as
          Schemas.MasterProposalVoteSchema['voteDetails']
      }))),
      map(creds => creds.map((cred): Server.UserMasterVote => ({
        subject: cred.subject,
        voterDID: cred.voterDID,
        did: cred.did,
        proposalType: cred.action,
        credentialID: cred.credentialID,
        cred_def_id: cred.cred_def_id
      }))),
      map(creds => creds.map(cred => {
        const id = MasterProposalsManager.proposalToID(cred)
        return [id, cred] as [typeof id, typeof cred]
      })),
      map(creds => new Map(creds)),
      map(data => this._userVotes$.next(data))
    )
  }

  private removeDeleted$<T extends {referent?: string}>(creds : T[]) {
    return forkJoin$(creds.map(cred =>
      this.deleteIfRevoked$(cred.referent!).pipe(
        map(revoked => revoked ? undefined : cred)
      )
    )).pipe(
      map(creds => creds.filter(cred => !!cred) as T[])
    )
  }

  private deleteIfRevoked$(credentialID: string) {
    const now = Date.now().toString()
    return defer(() => from(
      isCredentialRevoked({credential_id: credentialID}, {from: now, to: now})
    )).pipe(
      switchMap(({revoked}) => {
        if (!revoked) return of(false)
        return from(deleteCredential({credential_id: credentialID}))
          .pipe(map(() => true))
      })
    )
  }

  private getMasterCredID$() {
    return State.instance.heldCredentials$.pipe(
      first(),
      withLatestFrom(State.instance._controllerDID$),
      map(([creds, controllerDID]) =>
        [...creds]
          .filter(cred => cred.issuerDID === controllerDID)
          .map(cred => cred.credentialID)
          .shift()
      )
    )
  }

  private watchForIsMaster$(connectionID: string) {
    return WebhookMonitor.instance.proofs$.pipe(
      filter(({state, presentation_request, connection_id}) =>
        connection_id === connectionID
        && state === 'request_received'
        && presentation_request?.name === MasterVoteProtocol.IS_MASTER_PROOF_NAME
      ),
      first(),
      withLatestFrom(this.getMasterCredID$()),
      switchMap(([{presentation_exchange_id}, masterCredID]) => {
        if (!masterCredID) {
          return from(rejectProof({pres_ex_id: presentation_exchange_id!}, {description: "Not a master"}))
            .pipe(map(() => undefined as void))
        }
        return from(presentProof({pres_ex_id: presentation_exchange_id!}, {
          self_attested_attributes: {},
          requested_predicates: {},
          requested_attributes: {
            credential: {
              cred_id: masterCredID,
              revealed: true
            }
          }
        })).pipe(map(({presentation_exchange_id}) => presentation_exchange_id!))
      }),
      switchMap(pres_ex_id => {
        if (!pres_ex_id) return voidObs$
        return WebhookMonitor.instance.monitorProof$(pres_ex_id)
      }),
      last(),
      map(() => undefined as void)
    )
  }

  private watchIssuing() {
    const obs$: Observable<void> = WebhookMonitor.instance.credentials$.pipe(
      filter(cred => cred.schema_id === masterVoteSchema.schemaID && cred.state === 'credential_acked'),
      map(({credential, credential_id, credential_definition_id}) => ({
        credentialID: credential_id!,
        cred_def_id: credential_definition_id!,
        ...JSON.parse(credential?.attrs!['voteDetails']!) as
          Schemas.MasterProposalVoteSchema['voteDetails']
      })),
      map((data): Server.UserMasterVote => ({
        subject: data.subject,
        voterDID: data.voterDID,
        did: data.did,
        proposalType: data.action,
        credentialID: data.credentialID,
        cred_def_id: data.cred_def_id
      })),
      withLatestFrom(this._userVotes$),
      map(([vote, votes]) => {
        const map = new Map(votes)
        map.set(MasterProposalsManager.proposalToID(vote), vote)
        this._userVotes$.next(map)
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private watchRevocations() {
    const obs$: Observable<void> = WebhookMonitor.instance.revocations$.pipe(
      filter(data => data.thread_id.includes(masterVoteSchema.name)),
      map(data => data.comment),
      withLatestFrom(this._userVotes$),
      mergeMap(([proposalID, votes]) => {
        const map = new Map(votes)
        const data = map.get(proposalID)
        if (!data) return this.getVotes$()
        map.delete(proposalID)
        this._userVotes$.next(map)
        return from(deleteCredential({credential_id: data.credentialID}))
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
