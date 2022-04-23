import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable } from '@angular/material/table';
import {MastersTableDataSource, MasterTableItem} from './masters-table-datasource';
import {StateService} from "../../services/state/state.service";
import {API} from "@project-types";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {Immutable} from "@project-utils";

@Component({
  selector: 'app-masters-table',
  templateUrl: './masters-table.component.html',
  styleUrls: ['./masters-table.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class MastersTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<MasterTableItem>>;
  dataSource: MastersTableDataSource;
  expandedElement: API.Master | undefined

  readonly loading$ = this.loadingService.loading$

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  readonly displayedColumns = ['did', 'subjects'];

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new MastersTableDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  proposeRemoval(did: string, subject: string) {
    this.api.proposeMaster$({did, subject, proposalType: API.ProposalType.REMOVE}).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }
}
