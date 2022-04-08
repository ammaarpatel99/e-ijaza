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
import { ConfigComponent } from './config/config.component';
import {HttpClientModule} from "@angular/common/http";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatInputModule} from "@angular/material/input";
import { CredComponent } from './cred/cred.component';
import { MastersComponent } from './masters/masters.component';
import { UserComponent } from './user/user.component';
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

@NgModule({
  declarations: [
    AppComponent,
    NavContainerComponent,
    ConfigComponent,
    CredComponent,
    MastersComponent,
    UserComponent,
    InitialisationComponent,
    MastersTableComponent,
    MasterProposalsTableComponent
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
    MatSelectModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
