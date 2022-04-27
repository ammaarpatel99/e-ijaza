import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import {map, startWith} from 'rxjs/operators';
import {combineLatestWith, Observable, switchMap} from 'rxjs';
import {StateService} from "../../services/state/state.service";
import {Immutable} from "@project-utils";
import {API} from "@project-types";

/**
 * Data source for the IncomingProofs view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class IncomingProofsDataSource extends DataSource<Immutable<API.IncomingProofRequest>> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.stateService.incomingProofRequests$.pipe(
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
  connect(): Observable<Immutable<API.IncomingProofRequest[]>> {
    if (this.paginator) {
      return this.paginator.page.pipe(
        startWith(null),
        combineLatestWith(this.stateService.incomingProofRequests$),
        map(([_,data]) => this.getPagedData(data))
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
  private getPagedData(data: Immutable<API.IncomingProofRequest[]>): Immutable<API.IncomingProofRequest[]> {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.slice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }
}
