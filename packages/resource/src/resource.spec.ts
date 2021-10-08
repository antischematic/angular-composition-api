import {invalidate, Mutation, Query, Resource} from "./resource";
import {Component, Injectable, Type} from "@angular/core";
import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {inject, use, ViewDef} from "@mmuscat/angular-composition-api"
import {Observable, of} from "rxjs";
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
         respondWith<T>(value: T, time: number) {
            return of(value).pipe(
               delay(time)
            )
         }
      }
   }
}

function query() {
   const http = inject(FakeHttpClient)
   return function (arg: number[]) {
      return http.get('url').respondWith(arg, 1000)
   }
}

describe("Resource Query", () => {
   beforeEach(() => {
      // TestBed.configureTestingModule()
   })
   it("should create", () => {
      function query() {
         return () => new Observable()
      }
      const TestQuery = new Query(query)
      expect(TestQuery).toBeTruthy()
   })
   it("should be injectable", () => {
      function query() {
         return () => new Observable()
      }
      const TestQuery = new Query(query)
      expect(TestBed.inject(TestQuery)).toBeTruthy()
   })
   it("should create a query with initial value", () => {
      const initialValue = [] as any[]
      function setup() {
         const testQuery = inject(TestQuery)
         const value = testQuery({ initialValue })
         return {
            value
         }
      }
      const TestQuery = new Query(query)
      const view = createTestView(ViewDef(setup))
      expect(view.componentInstance.value).toEqual(Resource.createNext(initialValue))
   })
   it("should fetch a value", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use<number[]>(Function)
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
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
   }))
   it("should memoize fetch arguments", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use<number[]>(Function)
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
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
      view.componentInstance.fetch([4, 5, 6])
      tick(1000)
      expect(view.componentInstance.value).toEqual(Resource.createNext([4, 5, 6]))
      view.componentInstance.fetch(expected)
      // should update immediately
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
   }))
   it("should invalidate", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use<number[]>(Function)
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
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
      view.componentInstance.refetch()
      tick(1000)
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
   }))
   it("should invalidate all queries", fakeAsync(() => {
      const initialValue = [] as any[]
      const expected = [1, 2, 3]
      function setup() {
         const testQuery = inject(TestQuery)
         const fetch = use<number[]>(Function)
         const value = testQuery(fetch, {
            initialValue,
            refetch: [fetch]
         })

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
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
      invalidate(TestQuery)
      tick(1000)
      expect(view.componentInstance.value).toEqual(Resource.createNext(expected))
   }))
})

function mutation() {
   return function (args: number[]) {
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
         const testMutation = inject(TestMutation)
         const status = testMutation(use(Function))
         return {
            status
         }
      }
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      expect(view.componentInstance.status).toEqual(Resource.createNext(undefined))
   })
   it("should trigger mutation", fakeAsync(() => {
      const expected = [1,2,3]
      const TestMutation = new Mutation(mutation)
      function setup() {
         const testMutation = inject(TestMutation)
         const mutate = use<number[]>(Function)
         const mutation = testMutation(mutate)
         return {
            mutation,
            mutate,
         }
      }
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.mutate(expected)
      tick(1000)
      expect(view.componentInstance.mutation).toEqual(Resource.createComplete(expected))
   }))
})
