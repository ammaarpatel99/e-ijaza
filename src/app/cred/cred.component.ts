import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {tap} from "rxjs";

@Component({
  selector: 'app-cred',
  templateUrl: './cred.component.html',
  styleUrls: ['./cred.component.scss']
})
export class CredComponent implements OnInit {
  publicDid = ''
  issueDID = ''
  credentials: string[] = []

  constructor(
    private readonly httpClient: HttpClient
  ) { }

  ngOnInit(): void {
    this.getPublicDID().subscribe()
  }

  getPublicDID() {
    return this.httpClient.get<{did: string}>('/api/cred/publicDID').pipe(
      tap(data => this.publicDid = data.did)
    )
  }

  issueCredential() {
    this.httpClient.post('/api/cred/issue', {did: this.issueDID}).subscribe(() => this.issueDID = '')
  }

  fetchCredentials() {
    this.httpClient.get<{credentials: {cred_def_id: string}[]}>('/api/cred').subscribe(data => {
      this.credentials = data.credentials.map(x => x.cred_def_id)
    })
  }

  verifyCred(id: string) {
    this.httpClient.post('/api/cred/chainOfTrust', {cred_def_id: id}). subscribe(res => console.log(res))
  }

}
