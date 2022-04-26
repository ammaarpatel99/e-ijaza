import {voidObs$} from "@project-utils";
import {initialiseControllerSchemas$, initialiseUserSchemas$} from '../schemas'
import {Observable, switchMap} from "rxjs";
import {MasterCredentialsManager, MasterProposalsManager} from "../master-credentials";
import {
  MasterVoteProtocol,
  MastersShareProtocol,
  OntologyShareProtocol, OntologyVoteProtocol
} from "../aries-based-protocols";
import {OntologyManager, OntologyProposalManager} from "../subject-ontology";
import {CredentialProofManager, UserCredentialsManager} from "../credentials";

export function initialiseController$(): Observable<void> {
  return voidObs$.pipe(
    switchMap(() => initialiseControllerSchemas$()),

    switchMap(() => MasterCredentialsManager.instance.initialiseController$()),

    switchMap(() => OntologyManager.instance.initialiseController$()),

    switchMap(() => MasterProposalsManager.instance.initialiseController$()),

    switchMap(() => OntologyProposalManager.instance.initialiseController$())
  )
}

export function initialiseUser$() {
  return voidObs$.pipe(
    switchMap(() => initialiseUserSchemas$()),

    switchMap(() => MastersShareProtocol.instance.initialiseUser$()),

    switchMap(() => OntologyShareProtocol.instance.initialiseUser$()),

    switchMap(() => MasterVoteProtocol.instance.initialiseUser$()),

    switchMap(() => OntologyVoteProtocol.instance.initialiseUser$()),

    switchMap(() => UserCredentialsManager.instance.initialiseUser$()),

    switchMap(() => CredentialProofManager.instance.initialiseUser$())
  )
}
