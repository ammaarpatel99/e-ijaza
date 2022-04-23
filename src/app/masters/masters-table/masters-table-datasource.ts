import { DataSource } from '@angular/cdk/collections';
import {MatPaginator} from '@angular/material/paginator';
import {map, startWith} from 'rxjs/operators';
import {Observable, switchMap} from 'rxjs';
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";
import {Immutable} from "@project-utils";

export interface MasterTableItem extends API.Master {
  removableSubjects: string[]
}

/**
 * Data source for the MastersTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class MastersTableDataSource extends DataSource<Immutable<MasterTableItem>> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.stateService.masters$.pipe(
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
  connect(): Observable<Immutable<MasterTableItem[]>> {
    if (this.paginator) {
      return this.paginator.page.pipe(
        startWith(null),
        switchMap(() => this.stateService.masters$),
        switchMap(data => this.addRemovableSubjects$(data)),
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
  private getPagedData<T extends API.Master>(data: Immutable<T[]>): Immutable<T[]> {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.slice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }

  private addRemovableSubjects$(creds: Immutable<API.Master[]>) {
    return this.stateService.reachableFromMasterCreds$.pipe(
      map(subjects => creds.map(master => {
        const removableSubjects = master.subjects.filter(subject => subjects.includes(subject))
        return {...master, removableSubjects} as MasterTableItem
      }))
    )
  }
}
