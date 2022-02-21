import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ConfigComponent} from "./config/config.component";
import {CredComponent} from "./cred/cred.component";

const routes: Routes = [
  {
    path: 'config',
    component: ConfigComponent
  },
  {
    path: '**',
    redirectTo: 'config'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledBlocking'
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
