import {Schema} from "./schema";
import {
  teachingSchema,
  mastersInternalSchema,
  masterProposalSchema,
  mastersPublicSchema,
  masterVoteSchema,
  subjectSchema,
  subjectsSchema,
  subjectProposalSchema,
  subjectVoteSchema
} from './'

const schemas: Schema[] = [
  subjectSchema,
  subjectsSchema,
  subjectProposalSchema,
  subjectVoteSchema,
  masterProposalSchema,
  mastersInternalSchema,
  masterVoteSchema,
  mastersPublicSchema,
  teachingSchema
]

export async function initialiseMasterSchemas() {
  await Promise.all(schemas.map(schema => schema.fetchOrSetSchemaID()))
  await Promise.all(schemas.map(schema => schema.fetchOrSetCredID()))
}
