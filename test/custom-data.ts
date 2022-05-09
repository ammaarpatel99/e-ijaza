import {TestData} from "./test-data-type";
import {ProposalType, SubjectProposalType} from "../src/types/schemas";

export const testData: TestData = {
  users: ['1', '2', '3', '4', '5'],
  ontologyCommands: [
    {subject: 'knowledge', proposalType: ProposalType.ADD, change: {type: SubjectProposalType.CHILD, child: 'A'}},
    {subject: 'A', proposalType: ProposalType.ADD, change: {type: SubjectProposalType.CHILD, child: 'B'}},
    {subject: 'A', proposalType: ProposalType.ADD, change: {type: SubjectProposalType.CHILD, child: 'C'}},
    {subject: 'A', proposalType: ProposalType.ADD, change: {type: SubjectProposalType.COMPONENT_SET, componentSet: ['A', 'B']}}
  ],
  master:{
    name: '1',
    subject: 'A'
  },
  issueCreds: [
    {subject: 'B', issuer: '1', receiver: '2'},
    {subject: 'B', issuer: '2', receiver: '4'},
    {subject: 'C', issuer: '1', receiver: '3'},
    {subject: 'C', issuer: '3', receiver: '4'},
    {subject: 'A', issuer: '4', receiver: '5'},
  ],
  test: {
    user: '5',
    subject: 'A'
  }
}
