import {Aries} from '@project-types'
import {ReplaySubject, Subject} from "rxjs";

type ConnectionData = Aries.definitions['ConnRecord']
type CredentialData = Aries.V10CredentialExchange
type ProofData = Aries.V10PresentationExchange


export class WebhookMonitor {
  static readonly instance = new WebhookMonitor()
  private constructor() { }

  private readonly _connections$ = new Subject<ConnectionData>()
  readonly connections$ = this._connections$.asObservable()
  private readonly _credentials$ = new Subject<CredentialData>()
  readonly credentials$ = this._credentials$
  private readonly _proofs$ = new Subject<ProofData>()
  readonly proofs$ = this._proofs$.asObservable()
  private readonly _revocations$ = new Subject<Aries.RevocationNotification>()
  readonly revocations$ = this._revocations$.asObservable()

  private static monitor$<T>(map: Map<string, ReplaySubject<T>>, id: string) {
    let sub$ = map.get(id)
    if (sub$) return sub$
    sub$ = new ReplaySubject<T>(1)
    map.set(id, sub$)
    return sub$
  }

  private static process<T>(
    map: Map<string, ReplaySubject<T>>,
    data: T,
    id: (data: T) => string,
    completed: (data: T) => boolean,
    errored: (data: T) => boolean,
    unmonitored$: Subject<T>
  ) {
    const _id = id(data)
    const sub$ = map.get(_id)
    if (!sub$) {
      unmonitored$.next(data)
    } else if (errored(data)) {
      sub$.error(data)
    } else {
      sub$.next(data)
      if (completed(data)) {
        sub$.complete()
        map.delete(_id)
      }
    }
  }

  private readonly connections = new Map<string, ReplaySubject<ConnectionData>>()
  private readonly credentials = new Map<string, ReplaySubject<CredentialData>>()
  private readonly proofs = new Map<string, ReplaySubject<ProofData>>()

  monitorConnection$(conn_id: string) {
    return WebhookMonitor.monitor$(this.connections, conn_id)
  }

  monitorCredential$(cred_ex_id: string) {
    return WebhookMonitor.monitor$(this.credentials, cred_ex_id)
  }

  monitorProof$(proof_ex_id: string) {
    return WebhookMonitor.monitor$(this.proofs, proof_ex_id)
  }

  processConnection(data: ConnectionData) {
    WebhookMonitor.process(
      this.connections,
      data,
      data => data.connection_id!,
      data => data.rfc23_state === 'completed',
      data => data.rfc23_state === 'abandoned' || !!data.error_msg,
      this._connections$
    )
  }

  processCredential(data: CredentialData) {
    WebhookMonitor.process(
      this.credentials,
      data,
      data => data.credential_exchange_id!,
      data => data.state === 'credential_acked',
      data => !!data.error_msg,
      this._credentials$
    )
  }

  processProof(data: CredentialData) {
    WebhookMonitor.process(
      this.proofs,
      data,
      data => data.presentation_exchange_id!,
      data => data.state === 'verified',
      data => !!data.error_msg,
      this._proofs$
    )
  }

  processRevocation(data: Aries.RevocationNotification) {
    this._revocations$.next(data)
  }
}

