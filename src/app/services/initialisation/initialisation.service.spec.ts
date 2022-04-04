import { TestBed } from '@angular/core/testing';

import { InitialisationService } from './initialisation.service';

describe('InitialisationService', () => {
  let service: InitialisationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InitialisationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
