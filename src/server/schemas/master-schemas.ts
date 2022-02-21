import {Schema} from "./schema";
import {Masters} from '../master/master-credentials/masters'

const schemas: Schema[] = [
  Masters.instance.proposalSchema,
  Masters.instance.internalSchema,
  Masters.instance.voteSchema,
  Masters.instance.publicSchema
]

export async function initialiseMasterSchemas() {
  await Promise.all(schemas.map(schema => schema.fetchOrSetSchemaID()))
  await Promise.all(schemas.map(schema => schema.fetchOrSetCredID()))
}
