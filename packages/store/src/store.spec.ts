import { Action, ActionCreatorWithProps, props } from "./action"
import {
   inject,
   provide,
   subscribe,
   Value,
   ViewDef,
   use
} from "@mmuscat/angular-composition-api"
import { Component, ModuleWithProviders, Type } from "@angular/core"
import {
   ComponentFixture,
   discardPeriodicTasks,
   fakeAsync,
   TestBed,
   tick,
} from "@angular/core/testing"
import { Reducer } from "./reducer"
import { Store, StoreModule } from "./store"
import { ValueToken } from "../../core/src/provider"
import { tap } from "rxjs/operators"
import { interval } from "rxjs"
import createSpy = jasmine.createSpy

describe("Store", () => {})

function createTestView<T>(View: Type<T>, providers?: Type<any>[]): ComponentFixture<T> {
   @Component({
      template: ``,
      providers
   })
   class Test extends (View as any) {}
   TestBed.configureTestingModule({
      declarations: [Test],
   })
   return TestBed.createComponent(Test as any)
}

describe("Action", () => {
   it("should create", () => {
      const Increment = new Action("Increment")
      expect(Increment).toBeTruthy()
   })
   it("should be injectable", () => {
      const Increment = new Action("Increment")
      function setup() {
         const increment = inject(Increment)
         return {
            increment,
         }
      }
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      expect(view.componentInstance.increment).toBeInstanceOf(Function)
   })
   it("should dispatch actions", () => {
      const Increment = new Action("Increment")
      function setup() {
         const increment = inject(Increment)
         return {
            increment,
         }
      }
      const view = createTestView(ViewDef(setup))
      const spy = createSpy()
      view.componentInstance.increment.subscribe(spy)
      view.componentInstance.increment()
      expect(spy).toHaveBeenCalledOnceWith({
         kind: "Increment",
      })
   })
   it("should create actions with props", () => {
      const Increment = new Action("Increment", props<{ by: number }>())
      function setup() {
         const increment = inject(Increment)
         return {
            increment,
         }
      }
      const view = createTestView(ViewDef(setup))
      const spy = createSpy()
      view.componentInstance.increment.subscribe(spy)
      view.componentInstance.increment({ by: 3 })
      expect(spy).toHaveBeenCalledOnceWith({
         kind: "Increment",
         by: 3,
      })
   })
   it("should observe actions", () => {
      const Increment = new Action("Increment", props<{ by: number }>())
      function setup() {
         const increment = inject(Increment)

         subscribe(increment, spy)

         return {
            increment,
         }
      }
      const spy = createSpy()
      const view = createTestView(ViewDef(setup))
      view.detectChanges()
      view.componentInstance.increment({ by: 3 })
      expect(spy).toHaveBeenCalledOnceWith({
         kind: "Increment",
         by: 3,
      })
   })
})

describe("Reducer", () => {
   it("should create", () => {
      const Count = new Reducer("count")
      expect(Count).toBeTruthy()
   })
   it("should add reducers", () => {
      const Increment = new Action("Increment")
      const reducer = (state: any, action: any) => state + 1
      const Count = new Reducer("count").add([Increment], reducer)
      expect((<any>Count).reducers.length).toBe(1)
      expect((<any>Count).reducers[0]).toEqual([[Increment], reducer])
   })
   it("should inject state", () => {
      const Count = new Reducer<number>("count")
      function setup() {
         provide(Count, use(0))
         const count = inject(Count)
         return {
            count,
         }
      }
      const view = createTestView(ViewDef(setup), [Count])
      expect(view.componentInstance).toEqual(
         jasmine.objectContaining({ count: 0 }),
      )
   })
   it("should observe state", () => {
      const Count = new Reducer<number>("count")
      function setup() {
         provide(Count, use(0))
         const count = inject(Count)

         subscribe(count, spy)

         return {
            count,
         }
      }
      const spy = createSpy()
      const view = createTestView(ViewDef(setup), [Count])
      view.detectChanges()
      view.componentInstance.count = 10
      view.detectChanges()
      expect(spy).toHaveBeenCalledWith(0)
      expect(spy).toHaveBeenCalledWith(10)
   })
})

describe("Store", () => {
   let Increment: ValueToken<ActionCreatorWithProps<any, any>>
   let Count: ValueToken<Value<number>>
   function getInitialState() {
      return {
         count: 10,
      }
   }
   let module: ModuleWithProviders<any>
   let log: Function

   function logCount() {
      const count = inject(Count)
      return count.pipe(tap((value) => log(value)))
   }

   function autoIncrement() {
      const increment = inject(Increment)
      return interval(1000).pipe(tap(increment))
   }

   beforeEach(() => {
      log = () => {}
      Increment = new Action("Increment")
      Count = new Reducer<number>("count").add(Increment, (state) => state + 1)
      module = StoreModule.config(getInitialState, {
         reducers: [Count],
         effects: [logCount, autoIncrement],
      })
      TestBed.configureTestingModule({
         imports: [module],
      })
   })

   it("should create", () => {
      expect(TestBed.inject(Store)).toBeTruthy()
   })

   it("should get initial state", () => {
      TestBed.inject(Store)
      const count = TestBed.inject(Count).get()
      expect(count.value).toBe(10)
   })

   it("should reduce actions", () => {
      TestBed.inject(Store)
      const count = TestBed.inject(Count).get()
      const increment = TestBed.inject(Increment).get()
      increment()
      expect(count.value).toBe(11)
   })

   it("should run effects", fakeAsync(() => {
      const spy = (log = createSpy())
      TestBed.inject(Store)
      const count = TestBed.inject(Count).get()
      tick(10000)
      expect(spy).toHaveBeenCalledWith(10)
      expect(spy).toHaveBeenCalledWith(20)
      expect(count.value).toBe(20)
      discardPeriodicTasks()
   }))
})
