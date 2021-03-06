import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTable} from '@angular/material/table';
import {SubjectsTableDataSource, SubjectsTableItem} from './subjects-table-datasource';
import {animate, state, style, transition, trigger} from "@angular/animations";
import {Immutable} from "@project-utils";
import {API} from "@project-types";
import {StateService} from "../../services/state/state.service";
import {LoadingService} from "../../services/loading/loading.service";
import {ApiService} from "../../services/api/api.service";

@Component({
  selector: 'app-subjects-table',
  templateUrl: './subjects-table.component.html',
  styleUrls: ['./subjects-table.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class SubjectsTableComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatTable) table!: MatTable<Immutable<SubjectsTableItem>>;
  dataSource: SubjectsTableDataSource;
  expandedElement: API.Master | undefined

  readonly loading$ = this.loadingService.loading$

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['subject', 'children', 'component_sets'];

  constructor(
    private readonly stateService: StateService,
    private readonly loadingService: LoadingService,
    private readonly api: ApiService
  ) {
    this.dataSource = new SubjectsTableDataSource(this.stateService);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  proposeRemoval(subject: string, toRemove: string | string[]) {
    const data: API.SubjectProposalData = {
      subject,
      proposalType: API.ProposalType.REMOVE,
      change: typeof toRemove === 'string' ? {
        type: API.SubjectProposalType.CHILD,
        child: toRemove
      } : {
        type: API.SubjectProposalType.COMPONENT_SET,
        componentSet: toRemove
      }
    }
    this.api.proposeSubject$(data).pipe(
      this.loadingService.wrapObservable()
    ).subscribe()
  }

  componentSetToHTML(sets: string[][]) {
    return sets.map(set => set.join(', ')).join('<br/>')
  }
}
