import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTable} from '@angular/material/table';
import {MastersDataSource} from './masters-datasource';
import {animate, state, style, transition, trigger} from "@angular/animations";
import {StateService} from "../services/state/state.service";
import {AppType, Master, MasterProposal} from "@project-types/interface-api";
import {MasterProposalsDatasource} from "./master-proposals-datasource";
import {AsyncSubject, combineLatest, first, forkJoin, switchMap, takeUntil} from "rxjs";
import {map} from "rxjs/operators";

@Component({
  selector: 'app-masters',
  templateUrl: './masters.component.html',
  styleUrls: ['./masters.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class MastersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('paginator') paginator!: MatPaginator;
  @ViewChild('table') table!: MatTable<Master>;
  @ViewChild('proposals_paginator') proposalsPaginator!: MatPaginator;
  @ViewChild('proposals_table') proposalsTable!: MatTable<MasterProposal>;
  dataSource: MastersDataSource;
  proposalsDatasource: MasterProposalsDatasource;
  expandedElement: Master | undefined

  private readonly destroy$ = new AsyncSubject<void>()

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['did', 'subjects'];
  proposalDisplayedColumns = ['type', 'did', 'subject'];

  constructor(private readonly stateService: StateService) {
    this.dataSource = new MastersDataSource(stateService.masters$);
    this.proposalsDatasource = new MasterProposalsDatasource(stateService.masterProposals$);
  }

  ngOnInit() {
    this.watchAppType()
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
    this.proposalsDatasource.paginator = this.proposalsPaginator;
    this.proposalsTable.dataSource = this.proposalsDatasource
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private watchAppType() {
    this.stateService.appType$.pipe(
      map(appType => {
        if (appType === AppType.MASTER) {
          this.proposalDisplayedColumns = ['type', 'did', 'subject', 'votes_for', 'votes_against', 'votes_total']
        } else {
          this.proposalDisplayedColumns = ['type', 'did', 'subject', 'vote']
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe()
  }

  proposeRemoval(did: string, subject: string) {
    console.log('proposal removal of master')
    console.log(did)
    console.log(subject)
  }

  vote(inFavour: boolean, proposal: MasterProposal) {
    console.log('voting')
    console.log(inFavour)
    console.log(proposal)
  }

  createProposalData() {
    this.stateService.appType$.pipe(
      switchMap(appType => {
        if (appType === AppType.MASTER) {
          return this.stateService.masters$.pipe(
            map(arr => arr.length === 0)
          )
        } else {
          return forkJoin([this.stateService.did$.pipe(first()), this.stateService.masters$.pipe(first())])
            .pipe(
              map(data => data[1].map(x => x.did).includes(data[0]))
            )
        }
      })
    )
  }
}
