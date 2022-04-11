import {ReplaySubject} from "rxjs";
import {Immutable} from "@project-utils";
import {Subject} from "@server/subject-ontology/subject";

export class ControlSubjectOntology {
  static readonly instance = new ControlSubjectOntology()
  private constructor() { }

  private readonly subjectOntologyData$ = new ReplaySubject<Immutable<Subject[]>>(1)
}
