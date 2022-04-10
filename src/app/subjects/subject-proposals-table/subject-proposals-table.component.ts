import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable } from '@angular/material/table';
import { SubjectProposalsTableDataSource } from './subject-proposals-table-datasource';
import {Immutable} from "@project-utils";
import {AppType, SubjectProposal, SubjectProposalData} from "@project-types/interface-api";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {map} from "rxjs/operators";
import {of} from "rxjs";

@Component({
  selector: 'app-subject-proposals-table',
  templateUrl: './subject-proposals-table.component.html',
  styleUrls: ['./subject-proposals-table.component.scss']
})
export class SubjectProposalsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<SubjectProposal>>;
  dataSource: SubjectProposalsTableDataSource;

  readonly loading$ = this.loadingService.loading$
  readonly displayedColumns$ = this.stateService.appType$.pipe(
    map(type => {
      if (type === AppType.MASTER) return ['subject', 'action', 'child', 'vote']
      else return ['subject', 'action', 'child', 'votes_for', 'votes_against', 'votes_total']
    })
  )

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new SubjectProposalsTableDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  vote(inFavour: boolean, proposal: SubjectProposalData) {
    of({...proposal, vote: inFavour}).pipe(
      this.api.voteOnSubjectProposal,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }
}
