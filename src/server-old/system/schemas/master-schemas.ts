import {Schemas} from "./schemas";
import {AriesWrapper} from '../aries-wrapper'
import {masterCredentialNames} from './schema-types'

export class MasterSchemas extends Schemas {
  updateSchemasIDs(): Promise<void> {
    for (const credNames of masterCredentialNames) {}
    return Promise.resolve(undefined);
  }

}
