import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable } from '@angular/material/table';
import { HeldCredentialsTableDataSource } from './held-credentials-table-datasource';
import {Immutable} from "@project-utils";
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {of} from "rxjs";

@Component({
  selector: 'app-held-credentials-table',
  templateUrl: './held-credentials-table.component.html',
  styleUrls: ['./held-credentials-table.component.scss']
})
export class HeldCredentialsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<API.HeldCredential>>;
  dataSource: HeldCredentialsTableDataSource;

  readonly loading$ = this.loadingService.loading$
  readonly displayedColumns = ['did', 'subject', 'public', 'delete']

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new HeldCredentialsTableDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  setPublic(cred: Immutable<API.HeldCredentialData>, makePublic: boolean) {
    this.api.updatePublicOnHeldCredential(
      of({...cred, public: makePublic})
    ).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }

  delete(cred: Immutable<API.HeldCredential>) {
    this.api.deleteHeldCredential(of(cred)).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }
}
