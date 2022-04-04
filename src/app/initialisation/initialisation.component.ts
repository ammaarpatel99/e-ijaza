import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {
  AppType,
  AriesInitialisationData,
  DIDDetails,
  InitialisationData,
  InitialisationState
} from '@project-types/interface-api'
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AsyncSubject, filter, first, switchMap, takeUntil} from "rxjs";
import {MatStepper} from "@angular/material/stepper";
import {StateService} from "../services/state/state.service";
import {map} from "rxjs/operators";
import {LoadingService} from "../services/loading/loading.service";
import {InitialisationService} from "../services/initialisation/initialisation.service";

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

  readonly loading$ = this.loadingService.loading$

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

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly initializer: InitialisationService
  ) { }

  ngOnInit() {
    this.manageValidators()
    this.watchState()
    this.watchLoading()
    this.loadingService.startLoading() // wait for initial data
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

  private watchState() {
    let loadingFromState = true // starts with loading to wait for initial state
    const nonLoadingStates = [
      InitialisationState.START_STATE,
      InitialisationState.ARIES_READY,
      InitialisationState.PUBLIC_DID_REGISTERED,
      InitialisationState.COMPLETE
    ]
    this.stateService.initialisationState$.pipe(
      map(state => {
        this._state = state
        this.updateStepper()
        if (!nonLoadingStates.includes(state) && !loadingFromState) {
          loadingFromState = true
          this.loadingService.startLoading()
        } else if (nonLoadingStates.includes(state) && loadingFromState) {
          loadingFromState = false
          this.loadingService.startLoading()
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  private updateStepper() {
    let currentStepCompleted = () => !this.stepper ? false :
      this.stepper.steps.get(this.stepper.selectedIndex)?.completed || false
    while (currentStepCompleted()) this.stepper?.next()
  }

  private watchLoading() {
    this.loading$.pipe(
      map(loading => {
        if (loading) {
          this.ariesForm.disable()
          this.initialisationForm.disable()
          this.vonNetworkURL.disable()
        } else {
          this.ariesForm.enable()
          this.initialisationForm.enable()
          this.vonNetworkURL.enable()
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  submitFullInitialisation() {
    this.loading$.pipe(
      filter(loading =>
        !loading && this.ariesForm.valid && this.initialisationForm.valid
      ),
      first(),
      map(() => {
        this.loadingService.startLoading()
        const ariesData: AriesInitialisationData = {
          genesisURL: this.genesisURL.value,
          tailsServerURL: this.tailsServerURL.value,
          advertisedEndpoint: this.advertisedEndpoint.value
        }
        if (this.autoRegisterPublicDID.value) ariesData.vonNetworkURL = this.initVonNetworkURL.value
        const initData: InitialisationData = {
          appType: this.appType.value,
          name: this.appType.value === AppType.USER ? this.name.value : undefined,
          masterDID: this.appType.value === AppType.USER ? this.masterDID.value : undefined
        }
        return {...ariesData, ...initData}
      }),
      switchMap(data => this.initializer.submitFullInitialisation$(data)),
      map(() => this.loadingService.stopLoading())
    ).subscribe()
  }

  generateDID() {
    this.loading$.pipe(
      filter(loading => !loading),
      first(),
      map(() => {
        this.loadingService.startLoading()
      }),
      switchMap(() => this.initializer.generateDID$()),
      map(did => {
        this._did = did
        this.loadingService.stopLoading()
      })
    ).subscribe()
  }

  registeredDID() {
    this.loading$.pipe(
      filter(loading =>
        !loading && !!this.did
      ),
      first(),
      map(() => {
        this.loadingService.startLoading()
        return this.did!
      }),
      switchMap(data => this.initializer.registerDID$(data)),
      map(() => this.loadingService.stopLoading())
    ).subscribe()
  }

  autoRegisterDID() {
    this.loading$.pipe(
      filter(loading =>
        !loading && this.vonNetworkURL.valid
      ),
      first(),
      map(() => {
        this.loadingService.startLoading()
        return this.vonNetworkURL.value
      }),
      switchMap(data => this.initializer.autoRegisterDID$(data)),
      map(() => this.loadingService.stopLoading())
    ).subscribe()
  }

  submitAppInitialisation() {
    this.loading$.pipe(
      filter(loading =>
        !loading && this.initialisationForm.valid
      ),
      first(),
      map(() => {
        this.loadingService.startLoading()
        const initData: InitialisationData = {
          appType: this.appType.value,
          name: this.appType.value === AppType.USER ? this.name.value : undefined,
          masterDID: this.appType.value === AppType.USER ? this.masterDID.value : undefined
        }
        return initData
      }),
      switchMap(data => this.initializer.submitAppInitialisation$(data)),
      map(() => this.loadingService.stopLoading())
    ).subscribe()
  }

}
