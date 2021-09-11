import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TriangleComponent } from './triangle.component';

describe('TriangleComponent', () => {
  let component: TriangleComponent;
  let fixture: ComponentFixture<TriangleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TriangleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TriangleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
