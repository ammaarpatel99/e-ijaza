import {getSchemasForUser} from './get-schemas-for-user'
import {CredentialDefinitions, Schemas} from "../credentials";
import {getCredDefs} from "./get-credentials";

export async function initialiseUser() {
  const [schemas, masterCredDefs] = await getSchemasForUser()
  Schemas.instance.initialise(schemas)
  CredentialDefinitions.instance.initialise(await getCredDefs(), masterCredDefs)
}
