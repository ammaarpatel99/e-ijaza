import {SchemaNames} from '../credentials'
import {AriesAgentAPIWrapper} from '../'

function schemaAttributes(name: SchemaNames) {
  switch (name) {
    case SchemaNames.MASTER_CREDENTIAL_PROPOSALS:
    case SchemaNames.SUBJECT_PROPOSALS:
      return ['proposals']
    // case SchemaNames.MASTER_CREDENTIAL_VOTE:
    // case SchemaNames.SUBJECT_VOTE:
    //   return ['proposal']
    case SchemaNames.SUBJECTS:
      return ['subjects']
    case SchemaNames.VOTING_CREDENTIAL:
      return ['did', 'subjects']
    case SchemaNames.TEACHING_CREDENTIAL:
      return ['subject']
    case SchemaNames.SUBJECT_DEFINITION:
      return ['subject', 'definition']
    case SchemaNames.MASTER_CREDENTIALS:
      return ['credentials']
  }
}

async function getMasterSchema(name: SchemaNames): Promise<[SchemaNames, string]> {
  try {
    const schemaID = await AriesAgentAPIWrapper.instance.getSchemaID(name)
    return [name, schemaID]
  } catch (e) {
    const schemaID = await AriesAgentAPIWrapper.instance.createSchema(name, schemaAttributes(name))
    return [name, schemaID]
  }
}

export function getMasterSchemas() {
  const promises = []
  for (const schemaName of Object.values(SchemaNames) as SchemaNames[]) {
    promises.push(getMasterSchema(schemaName))
  }
  return Promise.all(promises)
}
