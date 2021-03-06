import {forkJoin$, Immutable, voidObs$} from "@project-utils";
import {catchError, defer, filter, first, from, mergeMap, Observable, pairwise, switchMap} from "rxjs";
import {
  connectToSelf$,
  deleteCredential,
  deleteSelfConnections$,
  getHeldCredentials,
  issueCredential
} from "../aries-api";
import {subjectProposalSchema} from "../schemas";
import {map, startWith} from "rxjs/operators";
import {Schemas, Server} from "@project-types"
import {WebhookMonitor} from "../webhook";
import {State} from "../state";
import {OntologyProposalManager} from "../subject-ontology";

export class OntologyProposalStoreProtocol {
  private static _instance: OntologyProposalStoreProtocol | undefined
  static get instance() {
    if (!this._instance) this._instance = new OntologyProposalStoreProtocol()
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
      getHeldCredentials({wql: `{"schema_id": "${subjectProposalSchema.schemaID}"}`})
    )).pipe(
      map(result => result.results || []),
      map(creds => creds.map(cred => {
        const data = JSON.parse(cred.attrs!['proposal']) as Schemas.SubjectProposalStateSchema['proposal']
        const votes = new Map(Object.entries(data.votes))
        const change: Server.ControllerOntologyProposal['change'] = data.change.type === Server.SubjectProposalType.CHILD
          ? {type: Server.SubjectProposalType.CHILD, child: data.change.child}
          : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: new Set(data.change.component_set)}
        const proposal: Server.ControllerOntologyProposal = {
          proposalType: data.action,
          subject: data.subject,
          votes, change
        }
        const proposalID = OntologyProposalManager.proposalToID(proposal)
        this.credentialIDs.set(proposalID, cred.referent!)
        return [proposalID, proposal] as [typeof proposalID, typeof proposal]
      })),
      map(proposals => new Map(proposals))
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance.controllerOntologyProposals$.pipe(
      startWith(null),
      pairwise(),
      mergeMap(([oldState, state]) => {
        if (!oldState) return voidObs$
        const {deleted, edited} = this.findChanges(state!, oldState)
        const arr = [...deleted, ...edited].map(([id, _]) => {
          const credential_id = this.credentialIDs.get(id)
          if (!credential_id) {
            console.error(`deleting stored ontology proposal but no credential id found`)
            return voidObs$
          }
          return defer(() => from(deleteCredential({credential_id})))
            .pipe(map(() => {this.credentialIDs.delete(id)}))
        })
        const arr2 = [...edited].map(([id, proposal]) =>
          this.storeProposal$(OntologyProposalStoreProtocol.proposalToSchema(proposal))
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

  private findChanges(state: Immutable<Server.ControllerOntologyProposals>, previous: Immutable<Server.ControllerOntologyProposals>) {
    const deleted = new Map([...previous]
      .filter(([id, _]) => !state.has(id)))
    const edited = new Map([...state]
      .filter(([id, data]) => previous.get(id) !== data))
    return {deleted, edited}
  }

  private static proposalToSchema(proposal: Immutable<Server.ControllerOntologyProposal>): Schemas.SubjectProposalStateSchema {
    return {
      proposal: {
        action: proposal.proposalType,
        subject: proposal.subject,
        votes: Object.fromEntries([...proposal.votes]),
        change: proposal.change.type === Server.SubjectProposalType.CHILD
          ? {type: Server.SubjectProposalType.CHILD, child: proposal.change.child}
          : {type: Server.SubjectProposalType.COMPONENT_SET, component_set: [...proposal.change.component_set]}
      }
    }
  }

  private storeProposal$(proposal: Immutable<Schemas.SubjectProposalStateSchema>) {
    const issueCred$ = (connectionID: string) => defer(() =>
      from(issueCredential({
        connection_id: connectionID,
        auto_remove: true,
        cred_def_id: subjectProposalSchema.credID,
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
          credential_definition_id === subjectProposalSchema.credID &&
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
