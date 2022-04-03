import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ConfigComponent} from "./config/config.component";
import {MastersComponent} from "./masters/masters.component";
import {UserComponent} from "./user/user.component";
import {InitialisationComponent} from "./initialisation/initialisation.component";

const routes: Routes = [
  {
    path: 'config',
    component: ConfigComponent
  },
  {
    path: 'initialisation',
    component: InitialisationComponent
  },
  {
    path: 'master',
    component: MastersComponent
  },
  {
    path: 'user',
    component: UserComponent
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
