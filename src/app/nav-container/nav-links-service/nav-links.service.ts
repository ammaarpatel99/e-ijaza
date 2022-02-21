import { Injectable } from '@angular/core';

import {ConfigState} from '../../../server/system'

@Injectable({
  providedIn: 'root'
})
export class NavLinksService {

  constructor() { }

  update(configState: ConfigState) {
    // TODO: implement
  }
}
