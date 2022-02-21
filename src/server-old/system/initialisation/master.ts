import {getCredDefs} from './get-credentials'
import {getMasterSchemas} from './master-schema'
import {CredentialDefinitions, Schemas} from '../credentials'
import {MasterCredentials} from "../state/master-credentials";

export async function initialiseMaster() {
  Schemas.instance.initialise(await getMasterSchemas())
  CredentialDefinitions.instance.initialise(await getCredDefs())
  await MasterCredentials.instance.load()
}
