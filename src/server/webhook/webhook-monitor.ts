import {definitions} from '@project-types/aries-autogen-types'
import {handleCredential, handleProof} from '@server/inter-agent-api'
import {V10CredentialExchange, V10PresentationExchange} from "@project-types/aries-types";

type WebhookCallback<I, O, E> = (result: I, resolve: (value: O | PromiseLike<O>) => void, reject: (value: E) => void) => void

type WebhookHandler<T> = (result: T) => void

type CredentialData = V10CredentialExchange
type ProofData = V10PresentationExchange
type ConnectionData = definitions['ConnRecord']



export class WebhookMonitor {
  static readonly instance = new WebhookMonitor()
  private constructor() { }

  private static monitorTracker<ID, Result, Output, Error>(
    tracker: Map<ID, WebhookHandler<Result>>,
    id: ID,
    callback: WebhookCallback<Result, Output, Error>
  ) {
    if (tracker.has(id)) throw new Error(`Already tacking id on webhook`)
    return new Promise<Output>((resolve, reject) => {
      tracker.set(id, result => callback(result, resolve, reject))
    }).finally(() => tracker.delete(id))
  }

  private static handleData<ID, Result>(tracker: Map<ID, WebhookHandler<Result>>, id: ID, data: Result) {
    const handler = tracker.get(id)
    if (handler) {
      handler(data)
      return true
    }
    return false
  }

  private readonly credentialExchangeTracker = new Map<string, WebhookHandler<CredentialData>>()
  private readonly proofPresentationTracker = new Map<string, WebhookHandler<ProofData>>()
  private readonly proofByConnectionTracker = new Map<string, WebhookHandler<ProofData>>()
  private readonly connectionTracker = new Map<string, WebhookHandler<ConnectionData>>()

  monitorCredentialExchange<T, E>(cred_ex_id: string, callback: WebhookCallback<CredentialData, T, E>) {
    return WebhookMonitor.monitorTracker(this.credentialExchangeTracker, cred_ex_id, callback)
  }

  monitorProofPresentation<T, E>(proof_ex_id: string, callback: WebhookCallback<ProofData, T, E>) {
    return WebhookMonitor.monitorTracker(this.proofPresentationTracker, proof_ex_id, callback)
  }

  monitorProofByConnection<T, E>(conn_id: string, callback: WebhookCallback<ProofData, T, E>) {
    return WebhookMonitor.monitorTracker(this.proofByConnectionTracker, conn_id, callback)
  }

  monitorConnection<T, E>(conn_id: string, callback: WebhookCallback<ConnectionData, T, E>) {
    return WebhookMonitor.monitorTracker(this.connectionTracker, conn_id, callback)
  }

  receiveCredentialExchange(data: CredentialData) {
    const handled = WebhookMonitor.handleData(this.credentialExchangeTracker, data.credential_exchange_id!, data)
    if (handled) return true
    return handleCredential(data)
  }

  receiveProofPresentation(data: ProofData) {
    let handled = WebhookMonitor.handleData(this.proofPresentationTracker, data.presentation_exchange_id!, data)
    if (!handled) handled = WebhookMonitor.handleData(this.proofByConnectionTracker, data.connection_id!, data)
    if (handled) return true
    return handleProof(data)
  }

  receiveConnection(data: ConnectionData) {
    return WebhookMonitor.handleData(this.connectionTracker, data.connection_id!, data)
  }
}
