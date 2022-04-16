import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import {map, startWith, switchMapTo} from 'rxjs/operators';
import { Observable} from 'rxjs';
import {API} from "@project-types";
import {Immutable} from "@project-utils";
import {StateService} from "../../services/state/state.service";


/**
 * Data source for the MasterProposalsTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class MasterProposalsTableDataSource extends DataSource<Immutable<API.MasterProposal>> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.stateService.masterProposals$.pipe(
    map(data => data.length)
  )

  constructor(
    private readonly stateService: StateService
  ) {
    super();
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<Immutable<API.MasterProposal[]>> {
    if (this.paginator) {
      return this.paginator.page.pipe(
        startWith(null),
        switchMapTo(this.stateService.masterProposals$),
        map(data => this.getPagedData(data))
      )
    } else {
      throw Error('Please set the paginator on the data source before connecting.');
    }
  }

  /**
   *  Called when the table is being destroyed. Use this function, to clean up
   * any open connections or free any held resources that were set up during connect.
   */
  disconnect(): void {}

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getPagedData(data: Immutable<API.MasterProposal[]>): Immutable<API.MasterProposal[]> {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.slice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }
}
