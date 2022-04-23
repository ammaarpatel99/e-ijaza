import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTable} from '@angular/material/table';
import {MasterProposalsTableDataSource} from './master-proposals-table-datasource';
import {Immutable} from "@project-utils";
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {map} from "rxjs/operators";

@Component({
  selector: 'app-master-proposals-table',
  templateUrl: './master-proposals-table.component.html',
  styleUrls: ['./master-proposals-table.component.scss']
})
export class MasterProposalsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<API.MasterProposal>>;
  dataSource: MasterProposalsTableDataSource;

  readonly loading$ = this.loadingService.loading$
  readonly displayedColumns$ = this._displayedColumns$()

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

  vote(inFavour: boolean, proposal: API.MasterProposalData) {
    this.api.voteOnMasterProposal$({...proposal, vote: inFavour}).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }

  private _displayedColumns$() {
   return this.stateService.appType$.pipe(
     map(type => {
       if (type === API.AppType.USER) return ['did', 'action', 'subject', 'vote']
       else return ['did', 'action', 'subject', 'votes_for', 'votes_against', 'votes_total']
     })
   )
  }
}
