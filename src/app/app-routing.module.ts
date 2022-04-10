import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {MastersComponent} from "./masters/masters.component";
import {InitialisationComponent} from "./initialisation/initialisation.component";
import {SubjectsComponent} from "./subjects/subjects.component";

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
    path: '**',
    redirectTo: 'masters'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking'
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
