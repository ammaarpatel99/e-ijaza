import {Immutable, voidObs$} from "@project-utils";
import {catchError, forkJoin, from, last, mergeMap, Observable, switchMap, tap} from "rxjs";
import {
  connectToSelf$,
  deleteCredential,
  deleteSelfConnections$,
  getHeldCredentials,
  issueCredential
} from "../aries-api";
import {subjectProposalSchema} from "../schemas";
import {map} from "rxjs/operators";
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

  private previous: Immutable<Server.ControllerOntologyProposals> | undefined
  private readonly credentialIDs = new Map<string, string>()

  initaliseController$() {
    return voidObs$.pipe(
      map(() => this.watchState()),
      switchMap(() => this.getFromStore$())
    )
  }

  private getFromStore$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${subjectProposalSchema.schemaID}"}`})
      )),
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
      map(proposals => new Map(proposals)),
      tap(state => this.previous = state)
    )
  }

  private watchState() {
    const obs$: Observable<void> = State.instance.controllerOntologyProposals$.pipe(
      map(state => this.stateToChanges(state)),
      mergeMap(({state, deleted, edited}) => {
        const arr = [...deleted, ...edited].map(([id, _]) => {
          const credential_id = this.credentialIDs.get(id)
          if (!credential_id) throw new Error(`deleting stored subject proposal but no credential id found`)
          return from(deleteCredential({credential_id}))
        })
        const arr2 = [...edited].map(([id, proposal]) =>
          this.storeProposal$(OntologyProposalStoreProtocol.proposalToSchema(proposal))
            .pipe(map(cred_ex_id => this.credentialIDs.set(id, cred_ex_id)))
        )

        return forkJoin(arr).pipe(
          switchMap(() => arr2),
          map(() => state)
        )
      }),
      map(state => {this.previous = state}),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }

  private stateToChanges(state: Immutable<Server.ControllerOntologyProposals>) {
    const previous = this.previous || new Map() as typeof state
    const deleted = new Map([...previous]
      .filter(([id, _]) => !state.has(id)))
    const edited = new Map([...state]
      .filter(([id, data]) => previous.get(id) !== data))
    return {state, deleted, edited}
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
    return connectToSelf$().pipe(
      switchMap(connections =>
        from(issueCredential({
          connection_id: connections[0],
          auto_remove: true,
          cred_def_id: subjectProposalSchema.credID,
          credential_proposal: {
            attributes: [{
              name: 'proposal',
              value: JSON.stringify(proposal.proposal)
            }]
          }
        })).pipe(
          switchMap(({credential_exchange_id}) => WebhookMonitor.instance.monitorCredential$(credential_exchange_id!)),
          last(),
          map(({credential_exchange_id}) => ({connections, credential_exchange_id}))
        )
      ),
      switchMap(({connections, credential_exchange_id}) =>
        deleteSelfConnections$(connections)
          .pipe(map(() => credential_exchange_id!))
      )
    )
  }
}
