import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AppType, DIDDetails, InitialisationState} from '@project-types/interface-api'
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AsyncSubject} from "rxjs";
import {MatStepper} from "@angular/material/stepper";

const isAppTypeValidator: ValidatorFn = control => {
  if ([AppType.MASTER, AppType.USER].includes(control.value)) return null
  return {invalidAppType: {value: control.value}}
}

@Component({
  selector: 'app-initialisation',
  templateUrl: './initialisation.component.html',
  styleUrls: ['./initialisation.component.scss']
})
export class InitialisationComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') private stepper?: MatStepper

  private readonly destroy$ = new AsyncSubject<true>();

  readonly STATES = InitialisationState
  private _state: InitialisationState = InitialisationState.START_STATE
  get state() { return this._state }

  private _loading = false
  get loading() { return this._loading }

  readonly APP_TYPES = AppType

  get advertisedEndpoint() { return this.ariesForm.get('advertisedEndpoint') as FormControl }
  get genesisURL() { return this.ariesForm.get('genesisURL') as FormControl }
  get tailsServerURL() { return this.ariesForm.get('tailsServerURL') as FormControl }
  get autoRegisterPublicDID() { return this.ariesForm.get('autoRegisterPublicDID') as FormControl }
  get initVonNetworkURL() {return this.ariesForm.get('vonNetworkURL') as FormControl }
  readonly ariesForm = new FormGroup({
    advertisedEndpoint: new FormControl('', Validators.required),
    genesisURL: new FormControl('', Validators.required),
    tailsServerURL: new FormControl('', Validators.required),
    autoRegisterPublicDID: new FormControl(false),
    vonNetworkURL: new FormControl('http://localhost:9000')
  })

  get appType() { return this.initialisationForm.get('appType') as FormControl }
  get masterDID() { return this.initialisationForm.get('masterDID') as FormControl }
  get name() { return this.initialisationForm.get('name') as FormControl }
  readonly initialisationForm = new FormGroup({
    appType: new FormControl(AppType.USER, [Validators.required, isAppTypeValidator]),
    masterDID: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required)
  })

  readonly vonNetworkURL = new FormControl('http://localhost:9000', Validators.required)

  private _did: DIDDetails | undefined
  get did() { return this._did }

  constructor() {
    this.setLoading(true)
  }

  ngOnInit() {
    this.manageValidators()
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  private manageValidators() {
    const subscription1 = this.appType.valueChanges.subscribe(value => {
      if (value === AppType.MASTER) {
        this.masterDID.clearValidators()
        this.name.clearValidators()
      } else {
        this.masterDID.addValidators(Validators.required)
        this.name.addValidators(Validators.required)
      }
      this.masterDID.updateValueAndValidity()
      this.name.updateValueAndValidity()
    })
    const subscription2 = this.autoRegisterPublicDID.valueChanges.subscribe(value => {
      if (value) this.initVonNetworkURL.addValidators(Validators.required)
      else this.initVonNetworkURL.clearValidators()
      this.initVonNetworkURL.updateValueAndValidity()
    })
    this.destroy$.subscribe(() => {
      subscription1.unsubscribe()
      subscription2.unsubscribe()
    })
  }

  private setState(state: InitialisationState) { // TODO: delete?
    this._state = state
    const nonLoadingStates = [
      InitialisationState.START_STATE,
      InitialisationState.ARIES_READY,
      InitialisationState.INITIALISATION_DATA_REQUIRED
    ]
    this.setLoading(nonLoadingStates.includes(state))
  }

  private setLoading(loading: boolean) {
    this._loading = loading
    if (loading) {
      this.ariesForm.disable()
      this.initialisationForm.disable()
      this.vonNetworkURL.disable()
    } else {
      this.ariesForm.enable()
      this.initialisationForm.enable()
      this.vonNetworkURL.enable()
    }
  }

  private updateStepper() {
    let currentStepCompleted = () => !this.stepper ? false :
      this.stepper.steps.get(this.stepper.selectedIndex)?.completed || false
    while (currentStepCompleted()) this.stepper?.next()
  }

  submitFullInitialisation() {
    // TODO:
  }

  generateDID() {
    // TODO:
  }

  registeredDID() {
    // TODO:
  }

  autoRegisterDID() {
    // TODO:
  }

  submitAppInitialisation() {
    // TODO:
  }

}
