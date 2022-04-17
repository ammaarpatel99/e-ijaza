import {Server, Schemas} from '@project-types'
import {Immutable, voidObs$} from "@project-utils";
import {catchError, filter, first, forkJoin, from, last, of, ReplaySubject, switchMap, tap, withLatestFrom} from "rxjs";
import {
  connectViaPublicDID$,
  deleteCredential,
  getHeldCredentials,
  getIssuedCredentials,
  offerCredentialFromProposal,
  proposeCredential,
  requestCredentialFromOffer,
  revokeCredential
} from "../aries-api";
import {map} from "rxjs/operators";
import {mastersPublicSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {State} from "../state";

export class ShareMastersData {
  static readonly instance = new ShareMastersData()
  private constructor() { }

  // CONTROLLER

  private readonly issued = new Set<Immutable<Server.CredentialInfo>>()

  controllerInitialise$() {
    return this.getIssued$().pipe(
      map(() => {
        this.handleRequests()
        this.revokeSharedOnUpdate()
      })
    )
  }

  private getIssued$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
      )),
      map(results => results.results!),
      map(results => results.filter(cred => cred.schema_id === mastersPublicSchema.schemaID)),
      map(results => results.map(cred => ({
        connection_id: cred.connection_id!,
        rev_reg_id: cred.revoc_reg_id!,
        cred_rev_id: cred.revocation_id!
      } as Server.CredentialInfo))),
      map(results => results.forEach(cred => this.issued.add(cred)))
    )
  }

  private revokeIssued$() {
    return voidObs$.pipe(
      map(() => [...this.issued]),
      switchMap(creds => forkJoin(creds.map(cred =>
        from(revokeCredential({
          publish: true,
          notify: true,
          cred_rev_id: cred.cred_rev_id,
          rev_reg_id: cred.rev_reg_id,
          connection_id: cred.connection_id,
          comment: 'list of master credentials has been updated'
        })).pipe(
          catchError(e => {
            console.error(`Failed to revoke public master credentials list: ${e}`)
            return voidObs$
          })
        )
      ))),
      map(() => this.issued.clear())
    )
  }

  private handleRequests() {
    WebhookMonitor.instance.credentials$.pipe(
      filter(cred =>
        cred.credential_proposal_dict?.schema_id === mastersPublicSchema.schemaID
        && cred.state === 'proposal_received'
      ),
      map(cred => cred.credential_exchange_id!),
      withLatestFrom(State.instance.controllerMasters$),
      map(([cred_ex_id, masters]) => {
        const data = [...masters].map(([did, subjectData]) =>
          [did, [...subjectData].map(([subject, _]) => subject)] as [string, string[]]
        )
        const obj = Object.fromEntries(data)
        return [cred_ex_id, {credentials: obj}] as [string, Schemas.MastersPublicSchema]
      }),
      switchMap(([cred_ex_id, data]) =>
        from(offerCredentialFromProposal({cred_ex_id}, {
          counter_proposal: {
            cred_def_id: mastersPublicSchema.credID,
            credential_proposal: {
              attributes: [{
                name: 'credentials',
                value: JSON.stringify(data.credentials)
              }]
            }
          }
        })).pipe(map(() => cred_ex_id))
      ),
      switchMap(cred_ex_id =>
        WebhookMonitor.instance.monitorCredential$(cred_ex_id).pipe(last())
      )
    ).subscribe()
  }

  private revokeSharedOnUpdate() {
    State.instance.controllerMasters$.pipe(
      switchMap(() => this.revokeIssued$())
    ).subscribe()
  }

  // USER

  userInitialise$() {
    return voidObs$.pipe(
      map(() => this.watchRevocations()),
      switchMap(this.refreshData$)
    )
  }

  private readonly _userState$ = new ReplaySubject<Immutable<Server.Masters>>(1)
  readonly userState$ = this._userState$.asObservable()

  private refreshData$() {
    return this.clearHeldCredentials$().pipe(
      switchMap(() => State.instance.controllerDID$),
      first(),
      switchMap(controllerDID => connectViaPublicDID$({their_public_did: controllerDID})),
      switchMap(connection_id => from(proposeCredential({
        connection_id,
        auto_remove: false,
        schema_id: mastersPublicSchema.schemaID,
        credential_proposal: {
          attributes: [{
            name: 'credentials',
            value: ''
          }]
        }
      }))),
      switchMap(credData => WebhookMonitor.instance.monitorCredential$(credData.credential_exchange_id!)),
      switchMap(res => {
        if (res.state !== 'offer_received') return of(res)
        return from(requestCredentialFromOffer({cred_ex_id: res.credential_exchange_id!}))
      }),
      last(),
      map(res => JSON.parse(res.credential!.attrs!['credentials']) as Schemas.MastersPublicSchema['credentials']),
      map(res => {
        const data = Object.entries(res).map(([did, subjects]) => {
          const set = new Set(subjects)
          return [did, set] as [typeof did, typeof set]
        })
        const map = new Map(data)
        this._userState$.next(map)
      })
    )
  }

  private clearHeldCredentials$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${mastersPublicSchema.schemaID}"}`})
      )),
      map(result => result.results || []),
      map(creds => creds.map(cred => from(
        deleteCredential({credential_id: cred.referent!})
      ))),
      switchMap(creds => forkJoin(creds)),
      map(() => undefined as void)
    )
  }

  private watchRevocations() {
    WebhookMonitor.instance.revocations$.pipe(
      filter(data => data.thread_id.includes(mastersPublicSchema.name)),
      switchMap(() => this.refreshData$())
    ).subscribe()
  }
}
