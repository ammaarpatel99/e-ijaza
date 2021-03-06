import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {MastersComponent} from "./masters/masters.component";
import {InitialisationComponent} from "./initialisation/initialisation.component";
import {SubjectsComponent} from "./subjects/subjects.component";
import {ProofsComponent} from "./proofs/proofs.component";
import {CredentialsComponent} from "./credentials/credentials.component";

const routes: Routes = [
  {
    path: 'initialisation',
    component: InitialisationComponent
  },
  {
    path: 'masters',
    component: MastersComponent
  },
  {
    path: 'subjects',
    component: SubjectsComponent
  },
  {
    path: 'proofs',
    component: ProofsComponent
  },
  {
    path: 'credentials',
    component: CredentialsComponent
  },
  {
    path: '**',
    redirectTo: 'initialisation'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking'
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
