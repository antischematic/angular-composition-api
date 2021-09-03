import {invalidate, Mutation, Query, ResourceNotification} from "./resource";
import {Component, Injectable, Type} from "@angular/core";
import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {inject, ViewDef, use} from "@mmuscat/angular-composition-api"
import {of, Subject} from "rxjs";
import {delay} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";

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
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(initialValue))
   })
   it("should fetch a value", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use(Function)
         const value = testQuery(fetch, {initialValue})
         return {
            value,
            fetch
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.fetch(expected)
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
   }))
   it("should memoize fetch arguments", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use(Function)
         const value = testQuery(fetch, {initialValue})
         return {
            value,
            fetch
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.fetch(expected)
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
      view.componentInstance.fetch([4, 5, 6])
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext([4, 5, 6]))
      view.componentInstance.fetch(expected)
      // should update immediately
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
   }))
   it("should invalidate", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use(Function)
         const value = testQuery(fetch, {initialValue})
         function refetch() {
            invalidate(value)
         }
         return {
            value,
            fetch,
            refetch
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.fetch(expected)
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
      view.componentInstance.refetch()
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
   }))
   it("should invalidate all queries", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use(Function)
         const value = testQuery(fetch, {initialValue})

         return {
            value,
            fetch
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.fetch(expected)
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
      invalidate(TestQuery)
      tick(1000)
      expect(view.componentInstance.value).toEqual(ResourceNotification.createNext(expected))
   }))
})

function mutation() {
   return function (args: any) {
      return of(args).pipe(
         delay(1000)
      )
   }
}

describe("Mutation", () => {

   it("should create", () => {
      function setup() {
         const http = inject(HttpClient)
         return function () {
            return http.post('url', {})
         }
      }
      expect(new Mutation(setup)).toBeTruthy()
   })
   it("should have an initial value", () => {
      const TestMutation = new Mutation(mutation)
      function setup() {
         const status = inject(TestMutation)
         return {
            status
         }
      }
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      expect(view.componentInstance.status).toEqual(ResourceNotification.createNext(undefined))
   })
   it("should trigger mutation", fakeAsync(() => {
      const expected = [1,2,3]
      const TestMutation = new Mutation(mutation)
      function setup() {
         const [status, mutate] = inject(TestMutation)
         function run(value: any) {
            mutate(value)
         }
         return {
            status,
            mutate,
         }
      }
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.mutate(expected)
      tick(1000)
      expect(view.componentInstance.status).toEqual(ResourceNotification.createComplete(expected))
   }))
})
