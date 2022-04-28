import {ShareSchemasProtocol} from '../aries-based-protocols'
import {
  teachingSchema,
  mastersInternalSchema,
  masterProposalSchema,
  mastersPublicSchema,
  masterVoteSchema,
  subjectDataSchema,
  subjectsListSchema,
  subjectProposalSchema,
  subjectVoteSchema,
  Schema
} from './'
import {forkJoin$} from "@project-utils";
import {switchMap} from "rxjs";
import {map} from "rxjs/operators";

const schemas: Schema[] = [
  subjectDataSchema,
  subjectsListSchema,
  subjectProposalSchema,
  subjectVoteSchema,
  masterProposalSchema,
  mastersInternalSchema,
  masterVoteSchema,
  mastersPublicSchema,
  teachingSchema
]

export function initialiseControllerSchemas$() {
  return forkJoin$(
    schemas.map(schema => schema.fetchOrSetSchemaID$())
  ).pipe(
    switchMap(() => forkJoin$(
      schemas.map(schema => schema.fetchOrSetCredID$())
    )),
    switchMap(() => ShareSchemasProtocol.instance.initialiseController$())
  )
}

export function initialiseUserSchemas$() {
  return ShareSchemasProtocol.instance.getSchemasFromController$().pipe(
    switchMap(() => forkJoin$([
      teachingSchema.fetchOrSetCredID$()
    ])),
    map(() => undefined as void)
  )
}
