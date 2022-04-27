import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import {map, startWith} from 'rxjs/operators';
import {combineLatestWith, Observable, switchMap} from 'rxjs';
import {Immutable} from "@project-utils";
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";

/**
 * Data source for the SubjectProposalsTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class SubjectProposalsTableDataSource extends DataSource<Immutable<API.SubjectProposal>> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.stateService.subjectProposals$.pipe(
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
  connect(): Observable<Immutable<API.SubjectProposal[]>> {
    if (this.paginator) {
      return this.paginator.page.pipe(
        startWith(null),
        combineLatestWith(this.stateService.subjectProposals$),
        map(([_, data]) => this.getPagedData(data))
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
  private getPagedData(data: Immutable<API.SubjectProposal[]>): Immutable<API.SubjectProposal[]> {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.slice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }
}
