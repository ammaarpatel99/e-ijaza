import {Component} from '@angular/core';
import {StateService} from "../services/state/state.service";
import {of, switchMap, combineLatest} from "rxjs";
import {API} from "@project-types";
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
  get did() { return this.proposalForm.get('did') as FormControl }
  get subject() { return this.proposalForm.get('subject') as FormControl }
  readonly proposalForm = new FormGroup({
    did: new FormControl('', Validators.required),
    subject: new FormControl('', Validators.required)
  })

  readonly loading$ = this.loadingService.loading$
  readonly canMakeProposal$ = this._canMakeProposal$()
  readonly subjectsCanProposeIn$ = this._subjectsCanProposeIn$()

  constructor(
    private readonly stateService: StateService,
    private readonly api: ApiService,
    private readonly loadingService: LoadingService
  ) { }

  submitProposal() {
    this.api.proposeMaster$({
      did: this.did.value,
      subject: this.subject.value,
      proposalType: API.ProposalType.ADD
    }).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }

  private _canMakeProposal$() {
    return this.stateService.appType$.pipe(
      switchMap(type => {
        if (type === API.AppType.USER) return of(true)
        else return this.stateService.masters$.pipe(
          map(data => data.length === 0)
        )
      })
    )
  }

  private reduceToProposableSubjects$(subjects: Immutable<string[]>) {
    return combineLatest([
      this.did.valueChanges.pipe(startWith('')),
      this.stateService.masters$,
      this.stateService.masterProposals$
    ]).pipe(
      map(([did, masters, proposals]): Immutable<string[]> => {
        const masterSubjects = masters.filter(master => master.did === did).flatMap(master => master.subjects)
        const proposedSubjects = proposals.filter(proposal => proposal.did === did).map(proposal => proposal.subject)
        const usedSubjects = masterSubjects.concat(proposedSubjects)
        return subjects.filter(subject => !usedSubjects.includes(subject))
      })
    )
  }

  private _subjectsCanProposeIn$() {
    return this.stateService.appType$.pipe(
      switchMap(type => {
        if (type === API.AppType.CONTROLLER) return this.stateService.subjectNames$
        else return this.stateService.reachableFromMasterCreds$
      }),
      switchMap(subjects => this.reduceToProposableSubjects$(subjects))
    )
  }
}
