import {SchemasFromController} from '../aries-based-protocols'
import {
  teachingSchema,
  mastersInternalSchema,
  masterProposalSchema,
  mastersPublicSchema,
  masterVoteSchema,
  subjectSchema,
  subjectsSchema,
  subjectProposalSchema,
  subjectVoteSchema,
  appStateSchema,
  Schema
} from './'
import {voidObs$} from "@project-utils";
import {forkJoin, switchMap} from "rxjs";
import {map} from "rxjs/operators";

const schemas: Schema[] = [
  subjectSchema,
  subjectsSchema,
  subjectProposalSchema,
  subjectVoteSchema,
  masterProposalSchema,
  mastersInternalSchema,
  masterVoteSchema,
  mastersPublicSchema,
  teachingSchema,
  appStateSchema
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
      SchemasFromController.instance.initialiseController()
    })
  )
}

export function initialiseUserSchemas$(controllerDID: string) {
  return voidObs$.pipe(
    switchMap(() => SchemasFromController.instance.getSchemasAndCredDefsFromController$(controllerDID)),
    switchMap(() => forkJoin([
      teachingSchema.fetchOrSetCredID$(),
      appStateSchema.fetchOrSetCredID$()
    ])),
    map(() => undefined as void)
  )
}
