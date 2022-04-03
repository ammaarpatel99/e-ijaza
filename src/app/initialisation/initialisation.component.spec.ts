import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitialisationComponent } from './initialisation.component';

describe('InitialisationComponent', () => {
  let component: InitialisationComponent;
  let fixture: ComponentFixture<InitialisationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InitialisationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InitialisationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
