import { Injectable } from '@angular/core';
import {AriesInitialisationData, DIDDetails, InitialisationData} from "@project-types/interface-api";
import {Observable, of} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class InitialisationService {

  constructor() { }

  submitFullInitialisation$(data: AriesInitialisationData & InitialisationData) {
    return of(undefined)
  }

  generateDID$(): Observable<DIDDetails> {
    return of({did: '', verkey: ''})
  }

  registerDID$(did: DIDDetails) {
    return of(undefined)
  }

  autoRegisterDID$(vonNetworkURL: string) {
    return of(undefined)
  }

  submitAppInitialisation$(data: InitialisationData) {
    return of(undefined)
  }
}
