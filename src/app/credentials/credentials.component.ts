import {Component, OnDestroy, OnInit} from '@angular/core';
import {StateService} from "../services/state/state.service";
import {ApiService} from "../services/api/api.service";
import {LoadingService} from "../services/loading/loading.service";
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AsyncSubject, combineLatest, takeUntil, tap} from "rxjs";
import {map, shareReplay} from "rxjs/operators";

@Component({
  selector: 'app-credentials',
  templateUrl: './credentials.component.html',
  styleUrls: ['./credentials.component.scss']
})
export class CredentialsComponent implements OnInit, OnDestroy {
  readonly loading$ = this.loadingService.loading$
  private readonly destroy$ = new AsyncSubject<void>()

  get did() {return this.issueCred.get('did') as FormControl}
  get subject() {return this.issueCred.get('subject') as FormControl}
  readonly issueCred = new FormGroup({
    did: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required)
  })

  readonly issuableSubjects$ = this._issuableSubjects$()

  constructor(
    private readonly stateService: StateService,
    private readonly api: ApiService,
    private readonly loadingService: LoadingService
  ) { }

  ngOnInit(): void {
    this.addValidator()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private addValidator() {
    let validator: ValidatorFn | null
    this.issuableSubjects$.pipe(
      tap(subjects => {
        if (validator) this.subject.removeValidators(validator)
        validator = control => subjects.includes(control.value) ? null : {invalidSubject: control.value}
        this.subject.addValidators(validator)
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  issueCredential() {
    this.api.issueCredential$({did: this.did.value, subject: this.subject.value}).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }

  private _issuableSubjects$() {
    return combineLatest([
      this.did.valueChanges,
      this.stateService.reachableSubjects$.pipe(map(subjects => subjects.map(subject => subject.name))),
      this.stateService.issuedCredentials$
    ]).pipe(
      map(([did, subjects, creds]) => {
        const issuedSubjects = creds.filter(cred => cred.did === did).map(cred => cred.subject)
        return subjects.filter(subject => !issuedSubjects.includes(subject))
      }),
      shareReplay(1)
    )
  }
}
