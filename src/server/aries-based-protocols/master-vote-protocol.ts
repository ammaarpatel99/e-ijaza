import {Server, Schemas, API} from '@project-types'
import {
  connectToController$,
  connectViaPublicDID$,
  getHeldCredentials,
  issueCredential,
  proposeProof,
  revokeCredential$
} from "../aries-api";
import {catchError, filter, first, from, last, Observable, ReplaySubject, switchMap, withLatestFrom} from "rxjs";
import {masterVoteSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {Immutable, voidObs$} from "@project-utils";
import {MasterProposalsManager} from "../master-credentials";

export class MasterVoteProtocol {
  static readonly instance = new MasterVoteProtocol()
  private constructor() { }

  // CONTROLLER

  private readonly _controllerVotes$ = new ReplaySubject<Immutable<Server.ControllerMasterVote>>(1)
  readonly controllerVotes$ = this._controllerVotes$.asObservable()

  controllerInitialisation$() {
    return voidObs$.pipe(
      map(() => {
        this.watchVotes()
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

  watchVotes() {
    WebhookMonitor.instance.proofs$.pipe(
      filter(proof => proof.state === 'verified' && proof.presentation_proposal_dict?.comment === 'Vote on Master Proposal'),
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
      map(({voteDetails, voteChoice}) => ({
        subject: voteDetails.subject,
        vote: voteChoice,
        did: voteDetails.did,
        proposalType: voteDetails.action,
        voterDID: voteDetails.voterDID
      }) as Server.ControllerMasterVote),
      map(data => {
        this._controllerVotes$.next(data)
      })
    )
  }

  // USER

  private readonly _userVotes$ = new ReplaySubject<Immutable<Server.UserMasterVotes>>(1)
  readonly userVotes$ = this._userVotes$.asObservable()

  userInitialisation$() {
    return voidObs$.pipe(
      map(() => {
        this.watchIssuing()
        this.watchRevocations()
      })
    )
  }

  getVotes$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${masterVoteSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      map(creds => creds.map(({attrs, referent, cred_def_id}) =>({
        credentialID: referent!,
        cred_def_id,
        ...JSON.parse(attrs!['voteDetails']) as
          Schemas.MasterProposalVoteSchema['voteDetails']
      }))),
      map(creds => creds.map(cred => ({
        subject: cred.subject,
        voterDID: cred.voterDID,
        did: cred.did,
        proposalType: cred.action,
        credentialID: cred.credentialID,
        cred_def_id: cred.cred_def_id
      }) as Server.UserMasterVote)),
      map(creds => creds.map(cred => {
        const id = MasterProposalsManager.proposalToID(cred)
        return [id, cred] as [typeof id, typeof cred]
      })),
      map(creds => new Map(creds))
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
      map(data => ({
        subject: data.subject,
        voterDID: data.voterDID,
        did: data.did,
        proposalType: data.action,
        credentialID: data.credentialID,
        cred_def_id: data.cred_def_id
      }) as Server.UserMasterVote),
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
      map(([proposalID, votes]) => {
        const map = new Map(votes)
        map.delete(proposalID)
        this._userVotes$.next(map)
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
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
            comment: 'Vote on Master Proposal',
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
      )
    )
  }
}
