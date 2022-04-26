import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {API} from '@project-types'
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AsyncSubject, finalize, takeUntil, tap} from "rxjs";
import {MatStepper} from "@angular/material/stepper";
import {StateService} from "../services/state/state.service";
import {map} from "rxjs/operators";
import {LoadingService} from "../services/loading/loading.service";
import {ApiService} from "../services/api/api.service";

const isAppTypeValidator: ValidatorFn = control => {
  if ([API.AppType.CONTROLLER, API.AppType.USER].includes(control.value)) return null
  return {invalidAppType: {value: control.value}}
}

@Component({
  selector: 'app-initialisation',
  templateUrl: './initialisation.component.html',
  styleUrls: ['./initialisation.component.scss']
})
export class InitialisationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stepper') private stepper?: MatStepper

  private readonly destroy$ = new AsyncSubject<void>();

  readonly loading$ = this.loading.loading$

  readonly APP_TYPES = API.AppType

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
    vonNetworkURL: new FormControl('http://host.docker.internal:9000')
  })

  get appType() { return this.initialisationForm.get('appType') as FormControl }
  get masterDID() { return this.initialisationForm.get('masterDID') as FormControl }
  get name() { return this.initialisationForm.get('name') as FormControl }
  readonly initialisationForm = new FormGroup({
    appType: new FormControl(API.AppType.USER, [Validators.required, isAppTypeValidator]),
    masterDID: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required)
  })

  readonly vonNetworkURL = new FormControl('http://host.docker.internal:9000', Validators.required)

  private _did: API.DIDDetails | undefined
  get did() { return this._did }

  constructor(
    private readonly state: StateService,
    private readonly loading: LoadingService,
    private readonly api: ApiService
  ) { }

  ngOnInit() {
    this.manageValidators()
    this.watchLoading()
  }

  ngAfterViewInit() {
    this.watchState()
    this.state.update$.subscribe()
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submitFullInitialisation() {
    if (this.ariesForm.invalid || this.initialisationForm.invalid) {
      throw new Error(`Can't submit full initialisation whilst forms are invalid`)
    }

    const ariesData: API.AriesInitialisationData = {
      genesisURL: this.genesisURL.value,
      tailsServerURL: this.tailsServerURL.value,
      advertisedEndpoint: this.advertisedEndpoint.value
    }
    if (this.autoRegisterPublicDID.value) ariesData.vonNetworkURL = this.initVonNetworkURL.value
    const initData: API.InitialisationData = {
      appType: this.appType.value,
      name: this.appType.value === API.AppType.USER ? this.name.value : undefined,
      controllerDID: this.appType.value === API.AppType.USER ? this.masterDID.value : undefined
    }
    const data = {...ariesData, ...initData}

    this.api.submitFullInitialisation$(data).pipe(
      this.loading.wrapObservable()
    ).subscribe()
  }

  generateDID() {
    this.api.generateDID$.pipe(
      tap(did => this._did = did),
      this.loading.wrapObservable()
    ).subscribe()
  }

  registerDID() {
    const did = this.did
    if (!did) throw new Error(`Can't register did as component holds no did details`)
    this.api.registerDID$(did).pipe(
      this.loading.wrapObservable()
    ).subscribe()
  }

  autoRegisterDID() {
    if (this.vonNetworkURL.invalid) {
      throw new Error(`Can't auto register did whilst forms are invalid`)
    }
    const data = {vonNetworkURL: this.vonNetworkURL.value}
    this.api.autoRegisterDID$(data).pipe(
      this.loading.wrapObservable()
    ).subscribe()
  }

  submitAppInitialisation() {
    if (this.initialisationForm.invalid) {
      throw new Error(`Can't submit app initialisation whilst forms are invalid`)
    }
    const initData: API.InitialisationData = {
      appType: this.appType.value,
      name: this.appType.value === API.AppType.USER ? this.name.value : undefined,
      controllerDID: this.appType.value === API.AppType.USER ? this.masterDID.value : undefined
    }
    this.api.submitAppInitialisation$(initData).pipe(
      this.loading.wrapObservable()
    ).subscribe()
  }

  private manageValidators() {
    const subscription1 = this.appType.valueChanges.subscribe(value => {
      if (value === API.AppType.CONTROLLER) {
        this.masterDID.removeValidators(Validators.required)
        this.name.removeValidators(Validators.required)
      } else {
        this.masterDID.addValidators(Validators.required)
        this.name.addValidators(Validators.required)
      }
      this.masterDID.updateValueAndValidity()
      this.name.updateValueAndValidity()
    })
    const subscription2 = this.autoRegisterPublicDID.valueChanges.subscribe(value => {
      if (value) this.initVonNetworkURL.addValidators(Validators.required)
      else this.initVonNetworkURL.removeValidators(Validators.required)
      this.initVonNetworkURL.updateValueAndValidity()
    })
    this.destroy$.subscribe(() => {
      subscription1.unsubscribe()
      subscription2.unsubscribe()
    })
  }

  private watchState() {
    const nonLoadingStates = [
      API.InitialisationState.START_STATE,
      API.InitialisationState.ARIES_READY,
      API.InitialisationState.PUBLIC_DID_REGISTERED,
      API.InitialisationState.COMPLETE
    ]
    let loadingFromState = false

    this.state.initialisationState$.pipe(
      tap(state => {
        let loop = true
        while (loop) {
          const index = this.stepper!.selectedIndex
          if (state >= nonLoadingStates[index+1]) {
            this.stepper!.steps.get(index)!.completed = true
            this.stepper!.next()
          } else {
            loop = false
          }
        }

        if (!nonLoadingStates.includes(state) && !loadingFromState) {
          loadingFromState = true
          this.loading.startLoading()
        } else if (nonLoadingStates.includes(state) && loadingFromState) {
          loadingFromState = false
          this.loading.stopLoading()
        }
      }),
      takeUntil(this.destroy$),
      finalize(() => {
        if (loadingFromState) this.loading.stopLoading()
      })
    ).subscribe()
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
}
