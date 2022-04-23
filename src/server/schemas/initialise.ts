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
import {voidObs$} from "@project-utils";
import {forkJoin, switchMap} from "rxjs";
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
  return voidObs$.pipe(
    switchMap(() => forkJoin(
      schemas.map(schema => schema.fetchOrSetSchemaID$())
    )),
    switchMap(() => forkJoin(
      schemas.map(schema => schema.fetchOrSetCredID$())
    )),
    map(() => {
      ShareSchemasProtocol.instance.initialiseController()
    })
  )
}

export function initialiseUserSchemas$() {
  return voidObs$.pipe(
    switchMap(() => ShareSchemasProtocol.instance.getSchemasFromController$()),
    switchMap(() => forkJoin([
      teachingSchema.fetchOrSetCredID$()
    ])),
    map(() => undefined as void)
  )
}
