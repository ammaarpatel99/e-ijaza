import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable } from '@angular/material/table';
import { OutgoingProofsDataSource } from './outgoing-proofs-datasource';
import {OutgoingProofRequest} from "@project-types/interface-api";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {Immutable} from "@project-utils";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {of} from "rxjs";

@Component({
  selector: 'app-outgoing-proofs',
  templateUrl: './outgoing-proofs.component.html',
  styleUrls: ['./outgoing-proofs.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class OutgoingProofsComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<OutgoingProofRequest>>;
  dataSource: OutgoingProofsDataSource;
  expandedElement: OutgoingProofRequest | undefined

  readonly loading$ = this.loadingService.loading$

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  readonly displayedColumns = ['did', 'subject', 'proof', 'delete'];

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new OutgoingProofsDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  delete(item: OutgoingProofRequest) {
    this.api.deleteOutgoingProofRequest(of(item)).pipe(
      this.loadingService.rxjsOperator()
    ).subscribe()
  }
}
