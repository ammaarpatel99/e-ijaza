import { DataSource } from '@angular/cdk/collections';
import {MatPaginator} from '@angular/material/paginator';
import {map, tap} from 'rxjs/operators';
import { Observable, merge } from 'rxjs';
import {MasterProposal} from "@project-types/interface-api";

/**
 * Data source for the Masters view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class MasterProposalsDatasource extends DataSource<MasterProposal> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.data$.pipe(
    map(arr => arr.length)
  )

  constructor(private readonly data$: Observable<MasterProposal[]>) {
    super();
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<MasterProposal[]> {
    if (this.paginator) {
      let data: MasterProposal[] = []
      const obs$ = this.data$.pipe(tap(x => data = x))
      return merge(obs$, this.paginator.page)
        .pipe(map(() => this.getPagedData([...data ])));
    } else {
      throw Error('Please set the paginator and sort on the data source before connecting.');
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
  private getPagedData(data: MasterProposal[]): MasterProposal[] {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.splice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }
}
