import {ReplaySubject} from "rxjs";
import {Server} from '@project-types'
import {Immutable} from "@project-utils";

export class MasterProposalsManager {
  static readonly instance = new MasterProposalsManager()
  private constructor() { }

  static proposalToID(proposal: Server.MasterProposal) {
    return `${proposal.did}-${proposal.proposalType}-${proposal.subject}`
  }

  private readonly _state$ = new ReplaySubject<Immutable<Server.ControllerMasterProposals>>(1)
  readonly state$ = this._state$.asObservable()
}
