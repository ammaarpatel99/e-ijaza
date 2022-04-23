import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable } from '@angular/material/table';
import {Immutable} from "@project-utils";
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";
import {IncomingProofsDataSource} from "./incoming-proofs-datasource";

@Component({
  selector: 'app-incoming-proofs',
  templateUrl: './incoming-proofs.component.html',
  styleUrls: ['./incoming-proofs.component.scss']
})
export class IncomingProofsComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<API.IncomingProofRequest>>;
  dataSource: IncomingProofsDataSource;

  readonly loading$ = this.loadingService.loading$
  readonly displayedColumns = ['did', 'subject', 'proof', 'action']

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new IncomingProofsDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  respondToRequest(proofRequest: API.IncomingProofRequest, sendProof: boolean) {
    this.api.respondToIncomingProofRequest$({...proofRequest, reveal: sendProof}).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }
}
