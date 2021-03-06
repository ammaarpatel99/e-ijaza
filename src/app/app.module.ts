import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NavContainerComponent } from './nav-container/nav-container.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import {HttpClientModule} from "@angular/common/http";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import { MastersComponent } from './masters/masters.component';
import { InitialisationComponent } from './initialisation/initialisation.component';
import {MatStepperModule} from "@angular/material/stepper";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatCheckboxModule} from "@angular/material/checkbox";
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import {MatSelectModule} from "@angular/material/select";
import { MastersTableComponent } from './masters/masters-table/masters-table.component';
import { MasterProposalsTableComponent } from './masters/master-proposals-table/master-proposals-table.component';
import { SubjectsComponent } from './subjects/subjects.component';
import { SubjectsTableComponent } from './subjects/subjects-table/subjects-table.component';
import { SubjectProposalsTableComponent } from './subjects/subject-proposals-table/subject-proposals-table.component';
import { CredentialsComponent } from './credentials/credentials.component';
import { HeldCredentialsTableComponent } from './credentials/held-credentials-table/held-credentials-table.component';
import { IssuedCredentialsTableComponent } from './credentials/issued-credentials-table/issued-credentials-table.component';
import { ProofsComponent } from './proofs/proofs.component';
import { IncomingProofsComponent } from './proofs/incoming-proofs/incoming-proofs.component';
import { OutgoingProofsComponent } from './proofs/outgoing-proofs/outgoing-proofs.component';
import { OutgoingProofStateTreeComponent } from './proofs/outgoing-proof-state-tree/outgoing-proof-state-tree.component';
import { MatTreeModule } from '@angular/material/tree';

@NgModule({
  declarations: [
    AppComponent,
    NavContainerComponent,
    MastersComponent,
    InitialisationComponent,
    MastersTableComponent,
    MasterProposalsTableComponent,
    SubjectsComponent,
    SubjectsTableComponent,
    SubjectProposalsTableComponent,
    CredentialsComponent,
    HeldCredentialsTableComponent,
    IssuedCredentialsTableComponent,
    ProofsComponent,
    IncomingProofsComponent,
    OutgoingProofsComponent,
    OutgoingProofStateTreeComponent
  ],
  imports: [
    BrowserModule.withServerTransition({appId: 'serverApp'}),
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    LayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatButtonToggleModule,
    FormsModule,
    MatInputModule,
    MatStepperModule,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule,
    MatTreeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
