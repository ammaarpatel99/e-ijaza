import {TestData} from "./test-data-type";
import {ProposalType, SubjectProposalType} from "../src/types/schemas";

export const testData: TestData = {
  users: [
    'prophet',
    'student'
  ],
  ontologyCommands: [
    {subject: 'knowledge', proposalType: ProposalType.ADD, change: {type: SubjectProposalType.CHILD, child: 'ijaza_subject'}}
  ],
  master:{
    name: 'prophet',
    subject: 'ijaza_subject'
  },
  issueCreds: [
    {subject: 'ijaza_subject', issuer: 'prophet', receiver: 'student' }
  ],
  test: {
    user: 'student',
    subject: 'ijaza_subject'
  }
}
