import {
  getSchemaIDs,
  createSchema,
  getCredDefIDs,
  createCredentialDefinition
} from '../aries-api'
import {voidObs$} from "@project-utils";
import {map, switchMap} from "rxjs/operators";
import {defer, from} from "rxjs";


export class Schema {
  private _schemaID: string|undefined
  private _credID: string|undefined

  get schemaID() {
    if (this._schemaID === undefined) {
      throw new Error(`No schema ID defined`)
    }
    return this._schemaID
  }

  set schemaID(id: string) {
    if (this._schemaID !== undefined) {
      throw new Error(`Schema ID already defined`)
    }
    this._schemaID = id
  }

  get credID() {
    if (this._credID === undefined) {
      throw new Error(`No schema ID defined`)
    }
    return this._credID
  }

  set credID(id: string) {
    if (this._credID !== undefined) {
      throw new Error(`Cred def ID already defined`)
    }
    this._credID = id
  }

  constructor(
    readonly name: string,
    private readonly attributes: string[],
    private readonly revocable: boolean = false
  ) { }

  fetchOrSetSchemaID$() {
    return voidObs$.pipe(
      map(() => this._schemaID),
      map(schemaID => {
        if (schemaID !== undefined)
          throw new Error(`Attempting to fetch or set schemaID, but it is already set for schema "${this.name}".`)
      }),
      switchMap(() => from(
        getSchemaIDs({schema_name: this.name})
      )),
      map(arr => arr.schema_ids?.shift()),
      switchMap(schemaID => {
        if (schemaID) {
          this.schemaID = schemaID
          return voidObs$
        }
        return this.createSchema$()
      })
    )
  }

  private createSchema$() {
    return defer(() => from(
      createSchema(
        {},
        {schema_name: this.name, attributes: this.attributes, schema_version: '1.0'}
      )
    )).pipe(
      map(schemaID => {
        this.schemaID = schemaID
      })
    )
  }

  fetchOrSetCredID$() {
    return voidObs$.pipe(
      map(() => this._credID),
      map(credID => {
        if (credID !== undefined)
          throw new Error(`Attempting to fetch or set credID, but it is already set for schema "${this.name}".`)
      }),
      switchMap(() => from(
        getCredDefIDs({schema_id: this.schemaID})
      )),
      map(arr => arr.credential_definition_ids?.shift()),
      switchMap(credID => {
        if (credID) {
          this.credID = credID
          return voidObs$
        }
        return this.createCredDef$()
      })
    )
  }

  private createCredDef$() {
    return defer(() => from(
      createCredentialDefinition(
        {},
        {schema_id: this.schemaID, tag: this.name, support_revocation: this.revocable}
      )
    )).pipe(
      map(credDefID => {
        this.credID = credDefID
      })
    )
  }
}

