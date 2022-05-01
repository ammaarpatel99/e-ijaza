import {SubjectProposalData} from "../src/types/interface-api";

export interface TestData {
  users: string[] // names
  ontologyCommands: SubjectProposalData[] // proposals to make and action in order to create ontology for the tests
  master: { // the initial master
    name: string
    subject: string
  }
  issueCreds: { // credentials to issue in order
    issuer: string,
    receiver: string,
    subject: string
  }[]
  test: { // the proof that is being tested
    user: string
    subject: string
  }
}
