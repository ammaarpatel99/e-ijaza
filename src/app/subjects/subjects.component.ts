import {Component, OnDestroy, OnInit} from '@angular/core';
import {StateService} from "../services/state/state.service";
import {ApiService} from "../services/api/api.service";
import {LoadingService} from "../services/loading/loading.service";
import {FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AsyncSubject, combineLatest, of, switchMap, takeUntil, tap} from "rxjs";
import {AppType, ProposalType, SubjectProposalType} from "@project-types/interface-api";
import {map} from "rxjs/operators";

@Component({
  selector: 'app-subjects',
  templateUrl: './subjects.component.html',
  styleUrls: ['./subjects.component.scss']
})
export class SubjectsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new AsyncSubject<void>()
  readonly loading$ = this.loadingService.loading$

  readonly canMakeProposals$ = this.stateService.appType$.pipe(
    map(appType => appType === AppType.USER)
  )

  get newSubjectParent() {return this.newSubject.get('parent') as FormControl}
  get newSubjectChild() {return this.newSubject.get('child') as FormControl}
  readonly newSubject = new FormGroup({
    parent: new FormControl(``, Validators.required),
    child: new FormControl(``, Validators.required)
  })

  get newChildParent() {return this.newChild.get('parent') as FormControl}
  get newChildChild() {return this.newChild.get('child') as FormControl}
  readonly newChild = new FormGroup({
    parent: new FormControl(``, Validators.required),
    child: new FormControl(``, Validators.required)
  })

  get newSetParent() {return this.newComponentSet.get('parent') as FormControl}
  get newSetChildren() {return this.newComponentSet.get('children') as FormControl}
  readonly newComponentSet = new FormGroup({
    parent: new FormControl(``, Validators.required),
    children: new FormControl(undefined, Validators.required)
  })

  readonly possibleNewChildren$ = combineLatest([
    this.newChildParent.valueChanges,
    this.stateService.reachableFromMasterCreds$
  ]).pipe(
    map(([parent, children]) => children.filter(child => child !== parent))
  )

  readonly possibleNewSetElements$ = combineLatest([
    this.newSetParent.valueChanges.pipe(
      switchMap(parent => this.api.getDescendants(of(parent)).pipe(map(subjects => [parent, subjects] as [typeof parent, typeof subjects])))
    ),
    this.stateService.reachableFromMasterCreds$
  ]).pipe(
    map(([[parent, children], subjects]) => children.filter(child => child !== parent && subjects.includes(child)))
  )

  constructor(
    private readonly stateService: StateService,
    private readonly api: ApiService,
    private readonly loadingService: LoadingService
  ) { }

  ngOnInit(): void {
    this.addValidatorForNewSubject()
    this.addValidatorForNewChild()
    this.addValidatorForNewSet()
    this.watchReachableSubjects()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  addValidatorForNewSubject() {
    let validator: ValidatorFn | undefined
    this.stateService.subjects$.pipe(
      tap(subjects => {
        if (validator) this.newSubjectChild.removeValidators(validator)
        validator = control => {
          if (subjects.includes(control.value)) return {subjectAlreadyExists: control.value}
          return null
        }
        this.newSubjectChild.addValidators(validator)
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  addValidatorForNewChild() {
    let validator: ValidatorFn | undefined
    this.possibleNewChildren$.pipe(
      tap(children => {
        if (validator) this.newChildChild.removeValidators(validator)
        validator = control => {
          if (children.includes(control.value)) return null
          return {cantBeParentToSelf: control.value}
        }
        this.newChildChild.addValidators(validator)
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  addValidatorForNewSet() {
    let validator: ValidatorFn | undefined
    this.possibleNewSetElements$.pipe(
      tap(subjects => {
        if (validator) this.newSetChildren.removeValidators(validator)
        validator = control => {
          if (Array.isArray(control.value) && control.value.every(subject => subjects.includes(subject))) return null
          return {subjectIsNotADescendent: control.value}
        }
        this.newSetChildren.addValidators(validator)
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  watchReachableSubjects() {
    let validator: ValidatorFn | undefined
    this.stateService.reachableFromMasterCreds$.pipe(
      tap(subjects => {
        if (validator) {
          this.newSubjectParent.removeValidators(validator)
          this.newChildParent.removeValidators(validator)
          this.newSetParent.removeValidators(validator)
        }
        validator = control => {
          if (!subjects.includes(control.value)) return {subjectDoesNotExist: control.value}
          return null
        }
        this.newSubjectParent.addValidators(validator)
        this.newChildParent.addValidators(validator)
        this.newSetParent.addValidators(validator)
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  proposeNewSubject() {
    this.api.proposeSubject(of({
      subject: this.newSubjectParent.value,
      proposalType: ProposalType.ADD,
      change: {
        type: SubjectProposalType.CHILD,
        child: this.newSubjectChild.value
      }
    })).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  proposeNewChild() {
    this.api.proposeSubject(of({
      subject: this.newChildParent.value,
      proposalType: ProposalType.ADD,
      change: {
        type: SubjectProposalType.CHILD,
        child: this.newChildChild.value
      }
    })).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  proposeNewComponentSet() {
    this.api.proposeSubject(of({
      subject: this.newSetParent.value,
      proposalType: ProposalType.ADD,
      change: {
        type: SubjectProposalType.COMPONENT_SET,
        componentSet: this.newSetChildren.value
      }
    })).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

}
