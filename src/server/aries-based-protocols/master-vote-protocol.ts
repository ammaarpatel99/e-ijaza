import {Server, Schemas, API} from '@project-types'
import {
  connectToController$,
  connectViaPublicDID$, deleteCredential,
  getHeldCredentials,
  issueCredential, presentProof,
  proposeProof, rejectProof, requestProof,
  revokeCredential$
} from "../aries-api";
import {
  catchError,
  filter,
  first,
  from,
  last,
  mergeMap,
  Observable,
  ReplaySubject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {masterVoteSchema, teachingSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {Immutable, voidObs$} from "@project-utils";
import {MasterProposalsManager} from "../master-credentials";
import {State} from "../state";

interface NewProposal {
  proposal: API.MasterProposalData
  conn_id: string
}

export class MasterVoteProtocol {
  static readonly instance = new MasterVoteProtocol()
  private constructor() { }

  private static VOTE_PROOF_NAME = 'Vote on Master Proposal'
  private static CREATION_PROOF_NAME = 'Create Master Proposal'
  private static IS_MASTER_PROOF_NAME = `Is Master For Creating Master Proposal`

  // CONTROLLER

  private readonly _controllerVotes$ = new ReplaySubject<Immutable<Server.ControllerMasterVote>>(1)
  private readonly _newProposals$ = new ReplaySubject<NewProposal>(1)
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
      map(proof => {
        const conn_id = proof.connection_id!
        const proposal = JSON.parse(
          proof.presentation!.requested_proof!.self_attested_attrs!['proposal']
        ) as API.MasterProposalData
        const data = {proposal, conn_id}
        this._newProposals$.next(data)
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  validateNewProposal$(connectionID: string) {
    return voidObs$.pipe(
      switchMap(() => from(requestProof({
        connection_id: connectionID,
        comment: MasterVoteProtocol.IS_MASTER_PROOF_NAME,
        proof_request: {
          name: MasterVoteProtocol.IS_MASTER_PROOF_NAME,
          version: '1.0',
          non_revoked: {from: Date.now(), to: Date.now()},
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
    return voidObs$.pipe(
      map(() => {
        this.watchIssuing()
        this.watchRevocations()
      }),
      switchMap(() => this.getVotes$())
    )
  }

  sendVote$(vote: API.MasterProposalVote) {
    const id = MasterProposalsManager.proposalToID(vote)
    return this._userVotes$.pipe(
      first(),
      map(votes => {
        const _vote = votes.get(id)
        if (!_vote) throw new Error(`Voting using invalid vote`)
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
              {name: 'proposal', value: JSON.stringify(proposal)}
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
        if (!data) return voidObs$
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

  private getMasterCredID$() {
    return State.instance.heldCredentials$.pipe(
      withLatestFrom(State.instance.controllerDID$),
      first(),
      map(([creds, controllerDID]) =>
        [...creds]
          .filter(cred => cred.issuerDID === controllerDID)
          .map(cred => cred.credentialID)
          .shift()
      )
    )
  }
}
