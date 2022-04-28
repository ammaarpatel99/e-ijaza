import {API, Schemas, Server} from '@project-types'
import {
  connectToController$,
  connectViaPublicDID$,
  deleteCredential,
  getHeldCredentials, isCredentialRevoked,
  issueCredential,
  presentProof,
  proposeProof,
  rejectProof,
  requestProof,
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
  ReplaySubject,
  Subject,
  switchMap, tap,
  withLatestFrom
} from "rxjs";
import {subjectVoteSchema, teachingSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {OntologyProposalManager} from "../subject-ontology";
import {State} from "../state";
import {SubjectProposalType} from "../../types/schemas";

export class OntologyVoteProtocol {
  private static _instance: OntologyVoteProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new OntologyVoteProtocol()
    return this._instance
  }
  private constructor() { }

  private static VOTE_PROOF_NAME = 'Vote on Ontology Proposal'
  private static CREATION_PROOF_NAME = 'Create Ontology Proposal'
  private static IS_MASTER_PROOF_NAME = `Is Master For Creating Ontology Proposal`

  // CONTROLLER

  private readonly _controllerVotes$ = new Subject<Immutable<Server.ControllerOntologyVote>>()
  private readonly _newProposals$ = new Subject<Server.OntologyProposal>()
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

  issueVote$(voterDID: string, proposal: Immutable<Server.OntologyProposal>) {
    const data: Schemas.SubjectProposalVoteSchema = {
      voteDetails: {
        action: proposal.proposalType,
        subject: proposal.subject,
        voterDID,
        change: proposal.change.type === Server.SubjectProposalType.CHILD
          ? {type: Server.SubjectProposalType.CHILD, child: proposal.change.child}
          : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: [...proposal.change.component_set]}
      }
    }
    return connectViaPublicDID$({their_public_did: voterDID}).pipe(
      switchMap(connectionID => from(issueCredential({
        connection_id: connectionID,
        auto_remove: false,
        cred_def_id: subjectVoteSchema.credID,
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

  revokeVote$(credInfo: Server.CredentialInfo, proposal: Immutable<Server.OntologyProposal>) {
    return revokeCredential$(credInfo, OntologyProposalManager.proposalToID(proposal))
  }

  private watchVotes() {
    const obs$: Observable<void> = WebhookMonitor.instance.proofs$.pipe(
      filter(proof => proof.state === 'verified' && proof.presentation_proposal_dict?.comment === OntologyVoteProtocol.VOTE_PROOF_NAME),
      map(proof => {
        const voteDetails = JSON.parse(
          proof.presentation!.requested_proof!.revealed_attr_groups!["1_votedetails_uuid"].values!["voteDetails"].raw!
        ) as Schemas.SubjectProposalVoteSchema['voteDetails']
        const voteChoice = JSON.parse(proof.presentation!.requested_proof!.self_attested_attrs!["self_votechoice_uuid"]) as boolean
        return {voteDetails, voteChoice}
      }),
      map(({voteDetails, voteChoice}): Server.ControllerOntologyVote => ({
        subject: voteDetails.subject,
        vote: voteChoice,
        proposalType: voteDetails.action,
        voterDID: voteDetails.voterDID,
        change: voteDetails.change.type === Server.SubjectProposalType.CHILD
          ? {type: Server.SubjectProposalType.CHILD, child: voteDetails.change.child}
          : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: new Set(voteDetails.change.component_set)}
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
        proof.presentation_proposal_dict?.comment === OntologyVoteProtocol.CREATION_PROOF_NAME
        && proof.state === 'verified'
      ),
      mergeMap(proof => {
        const conn_id = proof.connection_id!
        const proposal = JSON.parse(
          proof.presentation!.requested_proof!.self_attested_attrs!['self_proposal_uuid']
        ) as API.SubjectProposalData
        return this.validateNewProposal$(conn_id).pipe(
          map(() => this._newProposals$.next({
            subject: proposal.subject, proposalType: proposal.proposalType,
            change: proposal.change.type === Server.SubjectProposalType.CHILD
              ? {type: Server.SubjectProposalType.CHILD, child: proposal.change.child}
              : {type: SubjectProposalType.COMPONENT_SET, component_set: new Set(proposal.change.componentSet)}
          }))
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
        comment: OntologyVoteProtocol.IS_MASTER_PROOF_NAME,
        proof_request: {
          name: OntologyVoteProtocol.IS_MASTER_PROOF_NAME,
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

  private readonly _userVotes$ = new ReplaySubject<Immutable<Server.UserOntologyVotes>>(1)
  readonly userVotes$ = this._userVotes$.asObservable()

  initialiseUser$() {
    return this.getVotes$().pipe(
      map(() => {
        this.watchIssuing()
        this.watchRevocations()
      })
    )
  }

  sendVote$(vote: API.SubjectProposalVote) {
    const id = OntologyProposalManager.proposalToID({
      subject: vote.subject,
      proposalType: vote.proposalType,
      change: vote.change.type === Server.SubjectProposalType.CHILD
        ? {type: Server.SubjectProposalType.CHILD, child: vote.change.child}
        : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: new Set(vote.change.componentSet)}
    })
    return this._userVotes$.pipe(
      first(),
      map(votes => {
        const _vote = votes.get(id)
        if (!_vote) throw new Error(`Voting on ontology using invalid vote`)
        return {credentialID: _vote.credentialID, cred_def_id: _vote.cred_def_id, voteChoice: vote.vote}
      }),
      switchMap(data =>
        connectToController$().pipe(
          switchMap(connectionID => from(proposeProof({
            connection_id: connectionID,
            comment: OntologyVoteProtocol.VOTE_PROOF_NAME,
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
          switchMap(({state, presentation_exchange_id}) => {
            if (state !== 'request_received') return voidObs$
            return from(presentProof({pres_ex_id: presentation_exchange_id!}, {
              requested_predicates: {},
              self_attested_attributes: {
                self_votechoice_uuid: JSON.stringify(data.voteChoice)
              },
              requested_attributes: {"1_votedetails_uuid": {
                cred_id: data.credentialID, revealed: true
              }}
            }))
          })
        )
      ),
      last(),
      map(() => undefined as void)
    )
  }

  createProposal$(proposal: API.SubjectProposalData) {
    return this.getMasterCredID$().pipe(
      switchMap(cred => {
        if (!cred) throw new Error(`Trying to create subject proposal but not a master of anything`)
        return connectToController$()
      }),
      switchMap(connectionID =>
        from(proposeProof({
          auto_present: true,
          connection_id: connectionID,
          comment: OntologyVoteProtocol.CREATION_PROOF_NAME,
          presentation_proposal: {
            predicates: [],
            attributes: [
              {name: 'proposal', value: JSON.stringify(proposal)}
            ]
          }
        })).pipe(
          switchMap(({presentation_exchange_id}) => WebhookMonitor.instance.monitorProof$(presentation_exchange_id!)),
          filter(({state}) => state === 'request_received'),
          first(),
          switchMap(({presentation_exchange_id}) => from(presentProof({pres_ex_id: presentation_exchange_id!}, {
            requested_attributes: {},
            requested_predicates: {},
            self_attested_attributes: {
              self_proposal_uuid: JSON.stringify(proposal)
            }
          }))),
          map(() => connectionID)
        )
      ),
      switchMap(connectionID => this.watchForIsMaster$(connectionID)),
      map(() => undefined as void)
    )
  }

  private getVotes$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectVoteSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      switchMap(creds => this.removeDeleted$(creds)),
      map(creds => creds.map(({attrs, referent, cred_def_id}) =>({
        credentialID: referent!,
        cred_def_id: cred_def_id!,
        ...JSON.parse(attrs!['voteDetails']) as
          Schemas.SubjectProposalVoteSchema['voteDetails']
      }))),
      map(creds => creds.map((cred): Server.UserOntologyVote => ({
        subject: cred.subject,
        voterDID: cred.voterDID,
        proposalType: cred.action,
        credentialID: cred.credentialID,
        cred_def_id: cred.cred_def_id!,
        change: cred.change.type === Server.SubjectProposalType.CHILD
          ? {type: Server.SubjectProposalType.CHILD, child: cred.change.child}
          : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: new Set(cred.change.component_set)}
      }))),
      map(creds => creds.map(cred => {
        const id = OntologyProposalManager.proposalToID(cred)
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
      withLatestFrom(State.instance._controllerDID$),
      first(),
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
        && presentation_request?.name === OntologyVoteProtocol.IS_MASTER_PROOF_NAME
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
      filter(cred => cred.schema_id === subjectVoteSchema.schemaID && cred.state === 'credential_acked'),
      map(({credential, credential_id, credential_definition_id}) => ({
        credentialID: credential_id!,
        cred_def_id: credential_definition_id!,
        ...JSON.parse(credential?.attrs!['voteDetails']!) as
          Schemas.SubjectProposalVoteSchema['voteDetails']
      })),
      map((data): Server.UserOntologyVote => ({
        subject: data.subject,
        voterDID: data.voterDID,
        proposalType: data.action,
        credentialID: data.credentialID,
        cred_def_id: data.cred_def_id,
        change:  data.change.type === Server.SubjectProposalType.CHILD
          ? {type: Server.SubjectProposalType.CHILD, child: data.change.child}
          : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: new Set(data.change.component_set)}
      })),
      withLatestFrom(this._userVotes$),
      map(([vote, votes]) => {
        const map = new Map(votes)
        map.set(OntologyProposalManager.proposalToID(vote), vote)
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
      filter(data => data.thread_id.includes(subjectVoteSchema.name)),
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
