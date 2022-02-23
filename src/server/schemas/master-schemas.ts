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
  console.log('here')
  await Promise.all(schemas.map(schema => schema.fetchOrSetSchemaID()))
  console.log('here2')
  await Promise.all(schemas.map(schema => schema.fetchOrSetCredID()))
  console.log('here3')
}
