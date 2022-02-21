import {Inject, NgModule} from '@angular/core';
import {INITIAL_CONFIG, PlatformConfig, ServerModule} from '@angular/platform-server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [
    AppModule,
    ServerModule,
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {
  constructor(@Inject(INITIAL_CONFIG) private config: PlatformConfig) {
    this.config.useAbsoluteUrl = true;
  }
}
