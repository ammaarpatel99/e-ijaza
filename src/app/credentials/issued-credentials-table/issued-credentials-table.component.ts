import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable } from '@angular/material/table';
import { IssuedCredentialsTableDataSource, IssuedCredentialsTableItem } from './issued-credentials-table-datasource';
import {Immutable} from "@project-utils";
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";

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

  revoke(cred: Immutable<API.IssuedCredential>) {
    this.api.revokeIssuedCredential$(cred).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }
}
