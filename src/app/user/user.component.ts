import {Component} from '@angular/core';
import {ProposalAction, SubjectProposalType, SubjectVoteSchema} from "@project-types";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent {
  masters: [string, string[]][] = []
  subjects: {name: string, children: string[], componentSets: string[][]}[] = []
  subjectProposals: [string, SubjectVoteSchema['voteDetails']][] = []
  credentials: string[] = []
  issueDetails = ''
  testDetails = ''
  testResult = ''
  subjectProposalParent = ''
  subjectProposalChild = ''

  constructor(
    private readonly httpClient: HttpClient
  ) { }

  reload() {
    this.httpClient.get<{data: any}>('/api/user/masters').subscribe(({data}) => this.masters = data)
    // this.httpClient.get<{data: any}>('/api/master/proposals').subscribe(({data}) => this.proposals = data)
    this.httpClient.get<{data: any}>('/api/user/subjects').subscribe(({data}) => this.subjects = data)
    this.httpClient.get<{data: any}>('/api/user/subject/proposals').subscribe(({data}) => this.subjectProposals = data)
    this.httpClient.get<{data: any}>('/api/user/credentials').subscribe(({data}) => this.credentials = data)
  }

  displayJSON(json: any) {
    return JSON.stringify(json, null, 4)
  }

  test() {
    const data = this.testDetails.split(' ')
    if (data.length < 2) throw new Error(`Test details lacking info`)
    const did = data[0]
    const subject = data[1]
    this.httpClient.post<{result:boolean}>(`/api/user/test`, {did, subject}).subscribe(({result}) => {
      this.testResult = this.testDetails + result
      this.testDetails = ''
    })
  }

  voteOnSubject(proposal: any, vote: boolean) {
    this.httpClient.patch(`/api/user/subject/proposals`, {proposal, vote}, {responseType: 'text'})
      .subscribe()
  }

  makeSubjectProposal(add: boolean) {
    const children = this.subjectProposalChild.split(' ')
    if (children.length === 0) throw new Error(`Can't make proposal with no children or component set`)
    const body: Omit<SubjectVoteSchema["voteDetails"], 'voterDID'> = {
      subject: this.subjectProposalParent,
      action: add ? ProposalAction.ADD : ProposalAction.REMOVE,
      change: children.length > 1 ? {
        type: SubjectProposalType.COMPONENT_SET,
        component_set: children
      } : {
        type: SubjectProposalType.CHILD,
        child: children[0]
      }
    }
    this.httpClient.post(`/api/user/subject/proposals`, body, {responseType: 'text'}).subscribe()
  }

  issue() {
    const data = this.issueDetails.split(' ')
    if (data.length < 2) throw new Error(`Issue details lacking info`)
    const did = data[0]
    const subject = data[1]
    this.httpClient.post(`/api/user/credentials`, {did, subject}, {responseType: 'text'}).subscribe(() => this.issueDetails = '')
  }
}
