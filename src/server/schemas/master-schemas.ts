import {Schema} from "./schema";
import {
  teachingSchema,
  internalSchema,
  proposalSchema,
  publicSchema,
  voteSchema
} from './index'

const schemas: Schema[] = [
  proposalSchema,
  internalSchema,
  voteSchema,
  publicSchema,
  teachingSchema
]

export async function initialiseMasterSchemas() {
  await Promise.all(schemas.map(schema => schema.fetchOrSetSchemaID()))
  await Promise.all(schemas.map(schema => schema.fetchOrSetCredID()))
}
