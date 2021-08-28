import { subscribe, use } from "./common"
import { map, materialize, mergeMap } from "rxjs/operators"
import {
   Component,
   ContentChild,
   ContentChildren,
   ErrorHandler,
   NgModuleRef,
   QueryList,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import { Value } from "./interfaces"
import {
   Context,
   EffectObserver,
   inject,
   Lifecycle,
   Service,
   ViewDef,
} from "./core"
import {defer, interval, merge, of, Subscription, throwError} from "rxjs"
import {
   discardPeriodicTasks,
   fakeAsync,
   TestBed,
   tick,
} from "@angular/core/testing"
import { configureTest, defineService } from "./core.spec"
import { updateOn } from "./utils"
import createSpy = jasmine.createSpy
import objectContaining = jasmine.objectContaining

describe("use", () => {
   describe("value", () => {
      it("should create", () => {
         const value = use(0)
         expect(value.value).toBe(0)
      })
      it("should subscribe", () => {
         let result: number | undefined
         const value = use(0)
         value.subscribe((value) => (result = value))
         expect(result).toBe(0)
      })
      it("should pipe", () => {
         let result: number | undefined
         const value = use(1)
         const double = value.pipe(map((value) => value * 2))
         double.subscribe((value) => (result = value))
         expect(result).toBe(2)
      })
      it("should get the value", () => {
         const value = use(0)
         expect(value()).toBe(0)
      })
      it("should set the value", () => {
         const value = use(0)
         value.next(10)
         expect(value.value).toBe(10)
         expect(value()).toBe(10)
         value(20)
         expect(value.value).toBe(20)
         expect(value()).toBe(20)
      })
      it("should destructure", () => {
         const [value, valueChange] = use(0)

         expect(value.__ng_value).toBe(true)
         expect(valueChange.__ng_emitter).toEqual(true)
      })
      it("should update upstream value", () => {
         const value = use(0)
         const valueChange = use(value)
         valueChange(20)
         expect(value.value).toBe(20)
      })
      it("should not trigger downstream emitter", () => {
         const value = use(0)
         const valueChange = use(value)
         const spy = createSpy()
         valueChange.subscribe(spy)
         value(20)
         value.next(20)
         expect(spy).not.toHaveBeenCalled()
      })
      it("should throw when directly setting readonly value", () => {
         expect(() => {
            // @ts-expect-error
            // noinspection JSConstantReassignment
            use(0).value = 10
         }).toThrow()
      })
      it("should notify observers on subscribe", () => {
         const value = use(0)
         const spy = createSpy()
         value.subscribe(spy)
         value.next(10)
         expect(spy).toHaveBeenCalledWith(0)
         expect(spy).toHaveBeenCalledWith(10)
      })
      it("should notify late subscribers with latest value", () => {
         const value = use(0)
         const spy = createSpy()
         value.next(10)
         value.subscribe(spy)
         expect(spy).toHaveBeenCalledOnceWith(10)
      })
   })
   describe("emitter", () => {
      it("should create", () => {
         const emitter = use<number>(Function)
         expect(emitter).not.toEqual(objectContaining({ __ng_emitter: true }))
      })
      it("should emit values", () => {
         const emitter = use<number>(Function)
         const spy = createSpy()

         emitter.subscribe(spy)
         expect(spy).not.toHaveBeenCalled()
         emitter.next(10)
         expect(spy).toHaveBeenCalledWith(10)
         emitter(20)
         expect(spy).toHaveBeenCalledWith(20)
      })
   })
})

describe("QueryList", () => {
   it("should notify observers when query list becomes available", () => {
      const spy = createSpy()
      const subject = use<void>(ContentChildren) as Value<QueryList<any>>
      subject.subscribe(spy)
      const queryList = new QueryList()
      queryList.reset([1, 2, 3])
      subject.next(queryList)
      expect(spy).toHaveBeenCalledWith(subject.value)
      expect(spy).toHaveBeenCalledTimes(2)
   })
   it("should notify late subscribers", () => {
      const spy = createSpy()
      const subject = use(ViewChildren) as Value<QueryList<any>>
      const queryList = new QueryList()
      queryList.reset([1, 2, 3])
      subject(queryList)
      subject.subscribe(spy)
      expect(spy).toHaveBeenCalledOnceWith(subject.value)
   })
   it("should complete observers when query list is destroyed", () => {
      const subject = use(ContentChildren) as Value<QueryList<any>>
      const queryList = new QueryList()
      const spy = createSpy()
      subject.subscribe({
         next: () => {},
         complete: spy,
      })
      queryList.reset([1, 2, 3])
      subject.next(queryList)
      queryList.destroy()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should notify observers when receiving a new query list", () => {
      const spy = createSpy()
      const subject = use(ViewChildren) as Value<QueryList<any>>
      const queryList = new QueryList()
      const queryList2 = new QueryList()
      const queryList3 = new QueryList()
      subject.next(queryList)
      subject.subscribe(spy)
      subject.next(queryList2)
      subject.next(queryList3)
      expect(spy).toHaveBeenCalledWith(subject())
      expect(spy).toHaveBeenCalledTimes(3)
   })
})

describe("Query", () => {
   it("should create", () => {
      expect(() => use(ContentChild)).not.toThrow()
      expect(use(ContentChild).value).toBe(void 0)
   })

   it("should get value", () => {
      const queryValue = {}
      const query = use<{}>(ViewChild)
      // @ts-expect-error
      query(queryValue)

      expect(query.value).toBe(queryValue)
   })

   it("should subscribe to value", () => {
      const queryValue = {}
      const spy = createSpy()
      const query = use<{}>(ViewChild)
      query.subscribe(spy)
      // @ts-expect-error
      query(queryValue)

      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(queryValue)
   })
})

describe("subscribe", () => {
   it("should not run effects until view is mounted", () => {
      const spy = createSpy()
      function create() {
         subscribe(spy)
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      expect(spy).toHaveBeenCalledTimes(0)
      createView().detectChanges()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should run effects immediately", () => {
      const spy = createSpy()
      function factory() {
         subscribe(spy)
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should subscribe to observables", () => {
      const spy = createSpy()
      function factory() {
         const deferred = defer(spy)
         subscribe(deferred)
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should execute teardown when module is destroyed", () => {
      const spy = createSpy()
      function factory() {
         subscribe(() => spy)
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(0)
      TestBed.inject(NgModuleRef).destroy()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should execute teardown when view is destroyed", () => {
      const spy = createSpy()
      function create() {
         subscribe(() => spy)
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      expect(spy).toHaveBeenCalledTimes(0)
      view.destroy()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should execute teardown each time a value is emitted", () => {
      const spy = createSpy()
      function factory() {
         subscribe(of(1, 2, 3), () => spy)
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(2)
   })
   it("should not be destroyed more than once", () => {
      const spy = createSpy()
      function factory() {
         const observer = subscribe(() => spy)
         subscribe(() => {
            observer.unsubscribe()
            observer.unsubscribe()
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should not emit when destroyed", () => {
      const spy = createSpy()
      function factory() {
         const observer = new EffectObserver(
            () => spy,
            undefined,
            {} as any,
            {} as any,
            { markForCheck() {}, detectChanges() {} } as any,
         )
         subscribe(() => {
            observer.subscribe()
            observer.unsubscribe()
            observer.unsubscribe()
            observer.next(void 0)
            observer.error(new Error())
            observer.complete()
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should accept materialized streams", () => {
      const next = createSpy()
      const error = createSpy()
      const complete = createSpy()
      function factory() {
         const source = of(10, new Error()).pipe(
            mergeMap((value, index) => (index ? throwError(value) : of(value))),
            materialize(),
         )
         subscribe(source, {
            next,
            error,
            complete,
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(next).toHaveBeenCalledOnceWith(10)
      expect(error).toHaveBeenCalledOnceWith(new Error())
      expect(complete).toHaveBeenCalledOnceWith()
   })
   it("should continue observing on error", () => {
      const error = createSpy("error")
      function factory() {
         const source = throwError(new Error()).pipe(materialize())
         subscribe(merge(source, source, source), {
            next() {},
            error,
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(error).toHaveBeenCalledTimes(3)
   })
   it("should continue observing on complete", () => {
      const complete = createSpy("complete")
      function factory() {
         const source = of(true).pipe(materialize())
         subscribe(merge(source, source, source), {
            next() {},
            complete,
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(complete).toHaveBeenCalledTimes(4)
   })
   it("should catch unhandled errors", () => {
      const unhandledError = createSpy("unhandledError")
      const handledError = createSpy("handledError")
      function factory() {
         const error = throwError(new Error())
         subscribe(error, {
            next() {},
            error: handledError,
         })
         subscribe(error, {
            next() {},
         })
         subscribe(error)
         subscribe(of(true), () => {
            throw new Error()
         })
         subscribe(of(true), {
            next() {
               throw new Error()
            },
            complete() {
               throw new Error()
            },
         })
         subscribe(() => {
            throw new Error()
         })
         return {}
      }
      TestBed.configureTestingModule({
         providers: [
            {
               provide: ErrorHandler,
               useValue: {
                  handleError: unhandledError,
               },
            },
         ],
      })
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(handledError).toHaveBeenCalledOnceWith(new Error())
      expect(unhandledError).toHaveBeenCalledTimes(6)
   })
   it("should support nested subscriptions", () => {
      const spy = createSpy()
      function factory() {
         subscribe(() => {
            subscribe(spy)
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should cleanup nested subscriptions each time the parent emits", () => {
      const spy = createSpy()
      function factory() {
         subscribe(of(1, 2, 3), () => {
            subscribe(() => spy)
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(2)
   })
   it("should cleanup nested subscriptions when the root is destroyed", () => {
      const spy = createSpy()
      function factory() {
         subscribe(() => {
            subscribe(() => spy)
         })
         return {}
      }
      const injectService = defineService(
         Service(factory, { providedIn: "root" }),
      )
      injectService()
      TestBed.inject(NgModuleRef).destroy()
      expect(spy).toHaveBeenCalledTimes(1)
   })

   it("should cleanup services when provided node injector is destroyed", () => {
      const spy = createSpy()
      function factory() {
         subscribe(() => spy)
      }
      const TestService = Service(factory, { providedIn: "root" })
      defineService(TestService)
      function create() {
         inject(TestService)
         return {}
      }
      @Component({ template: ``, providers: [TestService] })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      createView().destroy()
      expect(spy).toHaveBeenCalled()
   })

   it("should cancel on abort signal", fakeAsync(() => {
      const spy = createSpy()
      const abortController = new AbortController()
      const spy2 = createSpy()
      const signal = new Subscription()
      function create() {
         subscribe(interval(1000), () => spy, abortController.signal)
         subscribe(interval(1000), () => spy2, signal)
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      createView().detectChanges()
      tick(1000)
      abortController.abort()
      abortController.abort()
      signal.unsubscribe()
      signal.unsubscribe()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy2).toHaveBeenCalledTimes(1)
   }))

   it("should not cleanup until abort signal is called", fakeAsync(() => {
      const spy = createSpy()
      const signal = new Subscription()
      function create() {
         subscribe(interval(1000), (v) => spy, signal)
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.destroy()
      tick(5000)
      expect(spy).toHaveBeenCalledTimes(0)
      signal.unsubscribe()
      tick(5000)
      expect(spy).toHaveBeenCalledTimes(5)
   }))

   it("should not cleanup inner subscriptions that are subscribed to an abort signal when view is destroyed", fakeAsync(() => {
      const spy = createSpy()
      const signal = new Subscription()
      function create() {
         subscribe(() => {
            subscribe(interval(1000), (v) => spy, signal)
         })
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.destroy()
      tick(5000)
      expect(spy).toHaveBeenCalledTimes(0)
      signal.unsubscribe()
      tick(5000)
      expect(spy).toHaveBeenCalledTimes(5)
   }))

   it("should never cleanup subscriptions", fakeAsync(() => {
      const spy = createSpy()
      function create() {
         subscribe(interval(1000), () => spy, null)
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      tick(10000)
      view.destroy()
      expect(spy).toHaveBeenCalledTimes(0)
      discardPeriodicTasks()
   }))

   it("should emit before and after view updates", () => {
      const count = use(0)
      const spy = createSpy()
      function create(context: Context) {
         const beforeUpdate = count.pipe(
            updateOn(Lifecycle.BeforeUpdate, context),
         )
         const afterUpdate = count.pipe(
            updateOn(Lifecycle.AfterUpdate, context),
         )
         subscribe(afterUpdate, () => {
            spy("spy3: " + count())
         })
         subscribe(beforeUpdate, () => {
            spy("spy2: " + count())
         })
         subscribe(count, () => {
            spy("spy1: " + count())
         })
         function update() {
            count(10)
         }
         return {
            count,
            update,
         }
      }
      @Component({ template: `{{ count }}` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.update()
      expect(spy.calls.allArgs()).toEqual([
         ["spy1: 0"],
         ["spy2: 0"],
         ["spy3: 0"],
         ["spy1: 10"],
         ["spy2: 10"],
         ["spy3: 10"],
      ])
      expect(view.debugElement.nativeElement.textContent).toBe(`10`)
   })
})
