import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import {map, startWith, switchMapTo} from 'rxjs/operators';
import {Observable, OperatorFunction, switchMap} from 'rxjs';
import {API} from "@project-types";
import {Immutable} from "@project-utils";
import {StateService} from "../../services/state/state.service";

export interface SubjectsTableItem extends API.Subject {
  removableSubjects: string[]
  removableComponentSets: string[][]
}

/**
 * Data source for the SubjectsTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class SubjectsTableDataSource extends DataSource<Immutable<API.Subject>> {
  paginator: MatPaginator | undefined;
  readonly length$ = this.stateService.subjects$.pipe(
    map(data => data.length)
  )

  private readonly addAdditionalData: OperatorFunction<Immutable<API.Subject[]>, Immutable<SubjectsTableItem[]>> =
    source => source.pipe(
      switchMap(data => {
        return this.stateService.reachableFromMasterCreds$.pipe(
          map(subjects => data.map(subject => {
            let removableSubjects: Immutable<string[]> = []
            let removableComponentSets: Immutable<string[][]> = []
            if (subjects.includes(subject.name)) {
              removableSubjects = subject.children.filter(childSubject => subjects.includes(childSubject))
              removableComponentSets = subject.componentSets
            }
            return {...subject, removableSubjects, removableComponentSets}
          }))
        )
      })
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
  connect(): Observable<Immutable<SubjectsTableItem[]>> {
    if (this.paginator) {
      return this.paginator.page.pipe(
        startWith(null),
        switchMapTo(this.stateService.subjects$),
        map(data => this.getPagedData(data)),
        this.addAdditionalData
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
  private getPagedData(data: Immutable<API.Subject[]>): Immutable<API.Subject[]> {
    if (this.paginator) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      return data.slice(startIndex, this.paginator.pageSize);
    } else {
      return data;
    }
  }
}
