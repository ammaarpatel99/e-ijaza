import { Component } from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {StateService} from "../services/state/state.service";
import {ApiService} from "../services/api/api.service";
import {LoadingService} from "../services/loading/loading.service";
import {of} from "rxjs";

@Component({
  selector: 'app-proofs',
  templateUrl: './proofs.component.html',
  styleUrls: ['./proofs.component.scss']
})
export class ProofsComponent {
  readonly loading$ = this.loadingService.loading$
  readonly subjects$ = this.stateService.subjectNames$


  get did() { return this.newProofRequest.get('did') as FormControl }
  get subject() { return this.newProofRequest.get('subject') as FormControl }
  readonly newProofRequest = new FormGroup({
    did: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required)
  })

  constructor(
    private readonly stateService: StateService,
    private readonly api: ApiService,
    private readonly loadingService: LoadingService
  ) { }

  submitProof() {
    this.api.createOutgoingProofRequest(of({did: this.did.value, subject: this.subject.value}))
  }

}
