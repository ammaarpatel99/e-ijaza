import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import {map, startWith} from 'rxjs/operators';
import {Observable, switchMap} from 'rxjs';
import {API} from "@project-types";
import {Immutable} from "@project-utils";
import {StateService} from "../../services/state/state.service";

export interface IssuedCredentialsTableItem extends API.IssuedCredential {
  reachable: boolean
}

/**
 * Data source for the IssuedCredentialsTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class IssuedCredentialsTableDataSource extends DataSource<Immutable<IssuedCredentialsTableItem>> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.stateService.issuedCredentials$.pipe(
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
  connect(): Observable<Immutable<IssuedCredentialsTableItem[]>> {
    if (this.paginator) {
      return this.paginator.page.pipe(
        startWith(null),
        switchMap(() => this.stateService.issuedCredentials$),
        switchMap(data => this.addReachability$(data)),
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
  private getPagedData<T extends API.IssuedCredential>(data: Immutable<T[]>): Immutable<T[]> {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize
      return data.slice(startIndex, this.paginator.pageSize)
    } else {
      return data
    }
  }

  private addReachability$(creds: Immutable<API.IssuedCredential[]>) {
    return this.stateService.reachableSubjects$.pipe(
      map(subjects => subjects.map(subject => subject.name)),
      map(subjects => creds.map(cred => ({...cred, reachable: subjects.includes(cred.subject)})))
    )
  }
}
