import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { IssuedCredentialsTableDataSource, IssuedCredentialsTableItem } from './issued-credentials-table-datasource';
import {Immutable} from "@project-utils";
import {AppType, IssuedCredential, MasterProposal, MasterProposalData} from "@project-types/interface-api";
import {MasterProposalsTableDataSource} from "../../masters/master-proposals-table/master-proposals-table-datasource";
import {map} from "rxjs/operators";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {of} from "rxjs";

@Component({
  selector: 'app-issued-credentials-table',
  templateUrl: './issued-credentials-table.component.html',
  styleUrls: ['./issued-credentials-table.component.scss']
})
export class IssuedCredentialsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<IssuedCredentialsTableItem>>;
  dataSource: IssuedCredentialsTableDataSource;

  readonly loading$ = this.loadingService.loading$
  readonly displayedColumns = ['did', 'subject', 'state', 'revoke']

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new IssuedCredentialsTableDataSource(this.stateService);
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

  revoke(cred: Immutable<IssuedCredential>) {
    this.api.revokeIssuedCredential(of(cred)).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }
}
