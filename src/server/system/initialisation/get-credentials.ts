import {SchemaNames, Schemas} from '../credentials'
import {AppType, AriesAgentAPIWrapper, Config} from '../'
import {masterCredentialNames, userCredentialNames} from "../schemas/schema-types";

async function getCredDef(name: SchemaNames): Promise<[SchemaNames, string]> {
  const schemaID = Schemas.instance.getSchemaID(name)
  try {
    const credID = await AriesAgentAPIWrapper.instance.getCredentialDefinitionID(schemaID)
    return [name, credID]
  } catch (e) {
    const credID = await AriesAgentAPIWrapper.instance.createCredentialDefinition(schemaID, Config.instance.label + '.' + name)
    return [name, credID]
  }
}

export async function getCredDefs() {
  const res: [SchemaNames, string][] = []
  const credNames = Config.instance.appType === AppType.MASTER ? masterCredentialNames : userCredentialNames
  for (const schemaName of credNames) {
    res.push(await getCredDef(schemaName))
  }
  return res
}
