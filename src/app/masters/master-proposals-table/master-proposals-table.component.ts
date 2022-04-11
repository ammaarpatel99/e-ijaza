import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTable} from '@angular/material/table';
import {MasterProposalsTableDataSource} from './master-proposals-table-datasource';
import {Immutable} from "@project-utils";
import {AppType, MasterProposal, MasterProposalData} from "@project-types/interface-api";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {map} from "rxjs/operators";
import {of} from "rxjs";

@Component({
  selector: 'app-master-proposals-table',
  templateUrl: './master-proposals-table.component.html',
  styleUrls: ['./master-proposals-table.component.scss']
})
export class MasterProposalsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<MasterProposal>>;
  dataSource: MasterProposalsTableDataSource;

  readonly loading$ = this.loadingService.loading$
  readonly displayedColumns$ = this.stateService.appType$.pipe(
    map(type => {
      if (type === AppType.USER) return ['did', 'action', 'subject', 'vote']
      else return ['did', 'action', 'subject', 'votes_for', 'votes_against', 'votes_total']
    })
  )

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new MasterProposalsTableDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  vote(inFavour: boolean, proposal: MasterProposalData) {
    of({...proposal, vote: inFavour}).pipe(
      this.api.voteOnMasterProposal,
      this.loadingService.rxjsOperator()
    ).subscribe()
  }
}
