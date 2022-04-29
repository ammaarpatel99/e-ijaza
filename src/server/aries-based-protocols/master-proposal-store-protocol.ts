import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {catchError, defer, filter, first, from, last, mergeMap, Observable, pairwise, switchMap} from "rxjs";
import {
  connectToSelf$,
  deleteCredential,
  deleteSelfConnections$,
  getHeldCredentials,
  issueCredential
} from "../aries-api";
import {masterProposalSchema, subjectProposalSchema} from "../schemas";
import {map, startWith} from "rxjs/operators";
import {Schemas, Server} from "@project-types"
import {WebhookMonitor} from "../webhook";
import {State} from "../state";
import {MasterProposalsManager} from "../master-credentials";

export class MasterProposalStoreProtocol {
  private static _instance: MasterProposalStoreProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new MasterProposalStoreProtocol()
    return this._instance
  }
  private constructor() { }

  private readonly credentialIDs = new Map<string, string>()

  initialiseController$() {
    return this.getFromStore$().pipe(
      map(data => {
        this.watchState()
        return data
      })
    )
  }

  private getFromStore$() {
    return defer(() => from(
      getHeldCredentials({wql: `{"schema_id": "${masterProposalSchema.schemaID}"}`})
    )).pipe(
      map(result => result.results || []),
      map(creds => creds.map(cred => {
        const data = JSON.parse(cred.attrs!['proposal']) as Schemas.MasterProposalStateSchema['proposal']
        const votes = new Map(Object.entries(data.votes))
        const proposal: Server.ControllerMasterProposal = {
          proposalType: data.action,
          subject: data.subject,
          did: data.did,
          votes
        }
        const proposalID = MasterProposalsManager.proposalToID(proposal)
        this.credentialIDs.set(proposalID, cred.referent!)
        return [proposalID, proposal] as [typeof proposalID, typeof proposal]
      })),
      map(proposals => new Map(proposals))
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance.controllerMasterProposals$.pipe(
      startWith(null),
      pairwise(),
      mergeMap(([oldState, state]) => {
        if (!oldState) return voidObs$
        const {deleted, edited} = this.findChanges(state!, oldState)
        const arr = [...deleted, ...edited].map(([id, _]) => {
          const credential_id = this.credentialIDs.get(id)
          if (!credential_id) {
            console.error(`deleting stored master proposal but no credential id found`)
            return voidObs$
          }
          return defer(() => from(deleteCredential({credential_id})))
            .pipe(map(() => {this.credentialIDs.delete(id)}))
        })
        const arr2 = [...edited].map(([id, proposal]) =>
          this.storeProposal$(MasterProposalStoreProtocol.proposalToSchema(proposal))
            .pipe(map(cred_id => {this.credentialIDs.set(id, cred_id)}))
        )

        return forkJoin$(arr).pipe(
          switchMap(() => forkJoin$(arr2)),
          map(() => undefined as void)
        )
      }),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private findChanges(state: Immutable<Server.ControllerMasterProposals>, previous: Immutable<Server.ControllerMasterProposals>) {
    const deleted = new Map([...previous]
      .filter(([id, _]) => !state.has(id)))
    const edited = new Map([...state]
      .filter(([id, data]) => previous.get(id) !== data))
    return {deleted, edited}
  }

  private static proposalToSchema(proposal: Immutable<Server.ControllerMasterProposal>): Schemas.MasterProposalStateSchema {
    return {
      proposal: {
        did: proposal.did,
        action: proposal.proposalType,
        subject: proposal.subject,
        votes: Object.fromEntries([...proposal.votes])
      }
    }
  }

  private storeProposal$(proposal: Immutable<Schemas.MasterProposalStateSchema>) {
    const issueCred$ = (connectionID: string) => defer(() =>
      from(issueCredential({
        connection_id: connectionID,
        auto_remove: true,
        cred_def_id: masterProposalSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'proposal',
            value: JSON.stringify(proposal.proposal)
          }]
        }
      }))
    )

    const watchCred$ = (connectionID: string) =>
      WebhookMonitor.instance.credentials$.pipe(
        filter(({connection_id, credential_definition_id, state}) =>
          connection_id === connectionID &&
          credential_definition_id === masterProposalSchema.credID &&
          state === 'credential_acked'
        ),
        first(),
        map(({credential}) => credential!.referent!)
      )

    return connectToSelf$().pipe(
      switchMap(connections =>
        forkJoin$([issueCred$(connections[0]), watchCred$(connections[1])]).pipe(
          switchMap(([_, cred_id]) =>
            deleteSelfConnections$(connections)
              .pipe(map(() => cred_id))
          )
        )
      )
    )
  }
}
