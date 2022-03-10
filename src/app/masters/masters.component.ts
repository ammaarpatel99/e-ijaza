import { Component } from '@angular/core';
import {ProposalAction, SubjectProposalType} from "@project-types";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-masters',
  templateUrl: './masters.component.html',
  styleUrls: ['./masters.component.scss']
})
export class MastersComponent {
  masters: [string, {subject: string, cred_ex_id: string, connection_id: string}[]][] = []
  proposals: [string, {did: string, subject: string, action: ProposalAction, votes: {[p: string]: boolean | {cred_ex_id: string, connection_id: string}}}][] = []
  subjects: {name: string, children: string[], componentSets: string[][]}[] = []
  subjectProposals: [string, {subject: string, action: ProposalAction, votes: {[p: string]: boolean | {cred_ex_id: string, connection_id: string}}, change: {type: SubjectProposalType.CHILD, child: string} | {}}][] = []
  issueDetails = ''

  constructor(
    private readonly httpClient: HttpClient
  ) { }

  reload() {
    this.httpClient.get<{data: any}>('/api/master/masters').subscribe(({data}) => this.masters = data)
    this.httpClient.get<{data: any}>('/api/master/proposals').subscribe(({data}) => this.proposals = data)
    this.httpClient.get<{data: any}>('/api/master/subjects').subscribe(({data}) => this.subjects = data)
    this.httpClient.get<{data: any}>('/api/master/subject/proposals').subscribe(({data}) => this.subjectProposals = data)
  }

  issue() {
    const data = this.issueDetails.split(' ')
    if (data.length < 2) throw new Error(`Issue details lacking info`)
    const did = data[0]
    const subject = data[1]
    this.httpClient.post(`/api/master/masters`, {did, subject}, {responseType: 'text'}).subscribe(() => this.issueDetails = '')
  }

  displayJSON(json: any) {
    return JSON.stringify(json, null, 4)
  }
}
