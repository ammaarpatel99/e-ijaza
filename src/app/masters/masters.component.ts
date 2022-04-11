import {Component} from '@angular/core';
import {StateService} from "../services/state/state.service";
import {of, OperatorFunction, switchMap, combineLatest} from "rxjs";
import {AppType, ProposalType} from "@project-types/interface-api";
import {map, startWith} from "rxjs/operators";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {ApiService} from "../services/api/api.service";
import {LoadingService} from "../services/loading/loading.service";
import {Immutable} from "@project-utils";

@Component({
  selector: 'app-masters',
  templateUrl: './masters.component.html',
  styleUrls: ['./masters.component.scss']
})
export class MastersComponent {
  readonly canMakeProposal$ = this.stateService.appType$.pipe(
    switchMap(type => {
      if (type === AppType.USER) return of(true)
      else return this.stateService.masters$.pipe(
        map(data => data.length === 0)
      )
    })
  )

  readonly loading$ = this.loadingService.loading$

  private readonly reduceToProposableSubjects: OperatorFunction<Immutable<string[]>, Immutable<string[]>> =
    source => combineLatest([
      source,
      this.did.valueChanges.pipe(startWith('')),
      this.stateService.masters$,
      this.stateService.masterProposals$
    ]).pipe(
      map(([reachableSubjects, did, masters, proposals]) => {
        const masterSubjects = masters.filter(master => master.did === did).flatMap(master => master.subjects)
        const proposedSubjects = proposals.filter(proposal => proposal.did === did).map(proposal => proposal.subject)
        const usedSubjects = masterSubjects.concat(proposedSubjects)
        return reachableSubjects.filter(subject => !usedSubjects.includes(subject))
      })
    )

  readonly subjectsCanProposeIn$ = this.stateService.appType$.pipe(
    switchMap(type => {
      if (type === AppType.CONTROLLER) return this.stateService.subjectNames$
      else return this.stateService.reachableFromMasterCreds$
    }),
    this.reduceToProposableSubjects
  )

  get did() { return this.proposalForm.get('did') as FormControl }
  get subject() { return this.proposalForm.get('subject') as FormControl }
  readonly proposalForm = new FormGroup({
    did: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required)
  })

  constructor(
    private readonly stateService: StateService,
    private readonly api: ApiService,
    private readonly loadingService: LoadingService
  ) { }

  submitProposal() {
    of({
      did: this.did.value,
      subject: this.subject.value,
      proposalType: ProposalType.ADD
    }).pipe(
      this.api.proposeMaster,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

}
