import {
  connectViaPublicDID$, deleteCredential, getConnection,
  getHeldCredentials, getIssuedCredentials,
  isCredentialRevoked,
  issueCredential,
  revokeCredential$
} from "../aries-api";
import {
  catchError,
  filter,
  forkJoin,
  from,
  last,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  withLatestFrom
} from "rxjs";
import {teachingSchema} from "../schemas";
import {WebhookMonitor} from "../webhook";
import {map} from "rxjs/operators";
import {Server, Schemas} from '@project-types'
import {Immutable, voidObs$} from "@project-utils";
import {UserIssuedCredential} from "../../types/server";
import {UserCredentialsManager} from "../credentials";

export class CredentialIssueProtocol {
  static readonly instance = new CredentialIssueProtocol()
  private constructor() { }

  private issue$(did: string, subject: string) {
    return connectViaPublicDID$({their_public_did: did}).pipe(
      switchMap(connection_id => from(issueCredential({
        connection_id,
        auto_remove: false,
        cred_def_id: teachingSchema.credID,
        credential_proposal: {
          attributes: [{
            name: 'subject',
            value: subject
          }]
        }
      }))),
      switchMap(({credential_exchange_id}) =>
        WebhookMonitor.instance.monitorCredential$(credential_exchange_id!).pipe(
          last(),
          map((data): Server.CredentialInfo => ({
            connection_id: data.connection_id!,
            rev_reg_id: data.revoc_reg_id!,
            cred_rev_id: data.revocation_id!
          }))
        )
      )
    )
  }

  private revoke$(credInfo: Server.CredentialInfo) {
    return revokeCredential$(credInfo)
  }

  // CONTROLLER

  controllerIssue$(did: string, subject: string) {
    return this.issue$(did, subject)
  }

  controllerRevoke$(credInfo: Server.CredentialInfo) {
    return this.revoke$(credInfo)
  }

  // USER

  private readonly _heldCredentials$ = new ReplaySubject<Immutable<Server.UserHeldCredentials>>(1)
  private readonly _issuedCredentials$ = new ReplaySubject<Immutable<Server.UserIssuedCredentials>>(1)
  readonly heldCredentials$ = this._heldCredentials$.asObservable()
  readonly issuedCredentials$ = this._issuedCredentials$.asObservable()

  userInitialise$() {
    return this.getHeldCredentials$().pipe(
      switchMap(() => this.getIssuedCredentials$()),
      map(() => this.watchRevocations())
    )
  }

  userIssue$(did: string, subject: string) {
    return this.issue$(did, subject).pipe(
      map((cred): UserIssuedCredential => ({
        ...cred,
        subject,
        theirDID: did
      })),
      withLatestFrom(this._issuedCredentials$),
      map(([cred, state]) => {
        const newState = new Set(state)
        newState.add(cred)
        this._issuedCredentials$.next(newState)
      })
    )
  }

  userRevoke$(cred: Immutable<Server.UserIssuedCredential>) {
    return this.revoke$(cred).pipe(
      withLatestFrom(this._issuedCredentials$),
      map(([_, state]) => {
        const newState = new Set(state)
        state.forEach(oldCred => {
          if (UserCredentialsManager.issuedCredentialID(oldCred) === UserCredentialsManager.issuedCredentialID(cred)) {
            newState.delete(oldCred)
          }
        })
        this._issuedCredentials$.next(newState)
      })
    )
  }

  private getHeldCredentials$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getHeldCredentials({wql: `{"schema_id": "${teachingSchema.schemaID}"}`})
      )),
      map(({results: creds}) => {
        const currentTime = Date.now().toString()
        return creds!.map(cred =>
          from(isCredentialRevoked(
          {credential_id: cred.referent!},
          {from: currentTime, to: currentTime}
          )).pipe(
            switchMap(({revoked}) => {
              if (revoked) {
                return from(deleteCredential({credential_id: cred.referent!}))
              } else return of(cred)
            })
          )
        )
      }),
      switchMap(creds => forkJoin(creds)),
      map(creds => creds.filter(cred => !!cred) as typeof creds extends (infer T)[] ? Exclude<T, void>[] : never),
      map(creds => creds.map((cred): Server.UserHeldCredential => ({
        credentialID: cred.referent!,
        subject: cred.attrs!['subject']!,
        issuerDID: cred.cred_def_id!.split(':')[0],
        public: false
      }))),
      map(creds => this._heldCredentials$.next(new Set(creds)))
    )
  }

  private getIssuedCredentials$() {
    return voidObs$.pipe(
      switchMap(() => from(
        getIssuedCredentials({role: 'issuer', state: 'credential_acked'})
      )),
      map(({results}) => results!.filter(cred => cred.schema_id === teachingSchema.schemaID)),
      map(creds => creds.map(cred =>
        from(getConnection({conn_id: cred.connection_id!})).pipe(
          map(({their_public_did}) => ({
            subject: cred.credential!.attrs!['subject'] as Schemas.TeachingSchema['subject'],
            connection_id: cred.connection_id!,
            rev_reg_id: cred.revoc_reg_id!,
            cred_rev_id: cred.revocation_id!,
            theirDID: their_public_did || ''
          }))
        )
      )),
      switchMap(creds => forkJoin(creds)),
      map(creds => this._issuedCredentials$.next(new Set(creds)))
    )
  }

  private watchRevocations() {
    const obs$: Observable<void> = WebhookMonitor.instance.revocations$.pipe(
      filter(({thread_id}) => thread_id.includes(teachingSchema.name)),
      mergeMap(() => this.getHeldCredentials$()),
      catchError(e => {
        console.error(e)
        return obs$
      })
    )
    obs$.subscribe()
  }
}
