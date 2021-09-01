import {Query} from "./resource";
import {Component, Injectable, Type} from "@angular/core";
import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {inject, ViewDef} from "@mmuscat/angular-composition-api"
import {HttpClient} from "@angular/common/http";
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import {Notification, of, Subject, timer} from "rxjs";
import {delay} from "rxjs/operators";

function createTestView<T>(
   View: Type<T>,
   providers?: any[],
): ComponentFixture<T> {
   @Component({
      template: ``,
      providers: providers?.map((provider) => provider.Provider),
   })
   class Test extends (View as any) {}
   TestBed.configureTestingModule({
      declarations: [Test],
   })
   return TestBed.createComponent(Test as any)
}

@Injectable({ providedIn: "root" })
class FakeHttpClient {
   get(args: any, options?: any) {
      return {
         respondWith(value: any, time: number) {
            return of(value).pipe(
               delay(time)
            )
         }
      }
   }
}

function query() {
   const http = inject(FakeHttpClient)
   return function (arg: any) {
      return http.get('url').respondWith(arg, 1000)
   }
}

describe("Resource Query", () => {
   beforeEach(() => {
      // TestBed.configureTestingModule()
   })
   it("should create", () => {
      function query() {
         return Function
      }
      const TestQuery = new Query(query)
      expect(TestQuery).toBeTruthy()
   })
   it("should be injectable", () => {
      function query() {
         return Function
      }
      const TestQuery = new Query(query)
      expect(TestBed.inject(TestQuery)).toBeTruthy()
   })
   it("should create a query with initial value", () => {
      const initialValue = [] as any[]
      function setup() {
         const testQuery = inject(TestQuery)
         const [value] = testQuery({ initialValue })
         return {
            value
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      expect(view.componentInstance.value).toEqual({
         value: initialValue,
         pending: false,
         error: undefined
      })
   })
   it("should manually fetch a value", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const [value, fetch] = testQuery({initialValue})
         return {
            value,
            fetch
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      view.componentInstance.fetch(expected)
      tick(1000)
      expect(view.componentInstance.value).toEqual({
         value: expected,
         pending: false,
         error: undefined
      })
   }))
   it("should fetch a value automatically", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      const args = new Subject()
      function setup() {
         const testQuery = inject(TestQuery)
         const [value, fetch] = testQuery(args, {initialValue})
         return {
            value,
            fetch
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      args.next(expected)
      tick(1000)
      expect(view.componentInstance.value).toEqual({
         value: expected,
         pending: false,
         error: undefined
      })
   }))
   it("should memoize fetch arguments", () => {
      // maybe next time!
   })
})
