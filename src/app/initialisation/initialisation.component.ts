import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {
  AppType,
  AriesInitialisationData,
  DIDDetails,
  InitialisationData,
  InitialisationState
} from '@project-types/interface-api'
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AsyncSubject, finalize, of, takeUntil, tap} from "rxjs";
import {MatStepper} from "@angular/material/stepper";
import {StateService} from "../services/state/state.service";
import {map} from "rxjs/operators";
import {LoadingService} from "../services/loading/loading.service";
import {ApiService} from "../services/api/api.service";

const isAppTypeValidator: ValidatorFn = control => {
  if ([AppType.MASTER, AppType.USER].includes(control.value)) return null
  return {invalidAppType: {value: control.value}}
}

@Component({
  selector: 'app-initialisation',
  templateUrl: './initialisation.component.html',
  styleUrls: ['./initialisation.component.scss']
})
export class InitialisationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stepper') private stepper?: MatStepper

  private readonly destroy$ = new AsyncSubject<true>();

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
    private readonly api: ApiService
  ) { }

  ngOnInit() {
    this.manageValidators()
    this.watchLoading()
  }

  ngAfterViewInit() {
    this.watchState()
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  private manageValidators() {
    const subscription1 = this.appType.valueChanges.subscribe(value => {
      if (value === AppType.MASTER) {
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
      InitialisationState.START_STATE,
      InitialisationState.ARIES_READY,
      InitialisationState.PUBLIC_DID_REGISTERED,
      InitialisationState.COMPLETE
    ]
    let loadingFromState = true // starts with loading to wait for initial state
    this.loadingService.startLoading() // wait for initial data

    this.stateService.initialisationState$.pipe(
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
          this.loadingService.startLoading()
        } else if (nonLoadingStates.includes(state) && loadingFromState) {
          loadingFromState = false
          this.loadingService.startLoading()
        }
      }),
      takeUntil(this.destroy$),
      finalize(() => {
        if (loadingFromState) this.loadingService.stopLoading()
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

  submitFullInitialisation() {
    of(undefined).pipe(
      tap(() => {
        if (this.ariesForm.invalid || this.initialisationForm.invalid) {
          throw new Error(`Can't submit full initialisation whilst forms are invalid`)
        }
      }),
      map(() => {
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
      this.api.submitFullInitialisation,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  generateDID() {
    this.api.generateDID$.pipe(
      tap(did => this._did = did),
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  registeredDID() {
    of(undefined).pipe(
      map(() => {
        const did = this.did
        if (!did) throw new Error(`Can't register did as component holds no did details`)
        return did
      }),
      this.api.registerDID,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  autoRegisterDID() {
    of (undefined).pipe(
      map(() => {
        if (this.vonNetworkURL.invalid) {
          throw new Error(`Can't auto register did whilst forms are invalid`)
        }
        return {vonNetworkURL: this.vonNetworkURL.value}
      }),
      this.api.autoRegisterDID,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  submitAppInitialisation() {
    of (undefined).pipe(
      map(() => {
        if (this.initialisationForm.invalid) {
          throw new Error(`Can't submit app initialisation whilst forms are invalid`)
        }
        const initData: InitialisationData = {
          appType: this.appType.value,
          name: this.appType.value === AppType.USER ? this.name.value : undefined,
          masterDID: this.appType.value === AppType.USER ? this.masterDID.value : undefined
        }
        return initData
      }),
      this.api.submitAppInitialisation,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

}
