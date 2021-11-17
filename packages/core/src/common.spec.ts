import {attribute, listen, onError, subscribe, use} from "./common"
import {map, materialize, mergeMap, switchMap, tap} from "rxjs/operators"
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
import { EffectObserver, inject, Service, ViewDef } from "./core"
import { interval, merge, of, Subscription, throwError, timer } from "rxjs"
import {
   discardPeriodicTasks,
   fakeAsync,
   TestBed,
   tick,
} from "@angular/core/testing"
import { configureTest, defineService } from "./core.spec"
import { onBeforeUpdate, onUpdated } from "./lifecycle"
import { ComputedValue } from "./types"
import { By } from "@angular/platform-browser"
import createSpy = jasmine.createSpy
import objectContaining = jasmine.objectContaining
import {pipe} from "./utils";

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
      // it("should throw when directly setting readonly value", () => {
      //    expect(() => {
      //       // @ts-expect-error
      //       // noinspection JSConstantReassignment
      //       use(0).value = 10
      //    }).toThrow()
      // })
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
      it("should use custom dirty check", () => {
         const value = use(
            { count: 0 },
            {
               distinct: (prev, next) => prev.count === next.count,
            },
         )
         expect((<any>value).isDirty({ count: 10 })).toBeTrue()
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
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should subscribe to observables", () => {
      const spy = createSpy()
      function factory() {
         const deferred = of(null).pipe(tap(spy))
         subscribe(deferred)
         return {}
      }
      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
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
         new Service(factory, { providedIn: "root" }),
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
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(3)
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
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should not emit when destroyed", () => {
      const spy = createSpy()
      function factory() {
         const observer = new EffectObserver(
            new ComputedValue(() => {
               spy()
            }) as any,
            undefined,
            undefined as any,
            { handleError() {} } as any,
         )
         subscribe(() => {
            const sub = observer.subscribe()
            sub.unsubscribe()
            sub.unsubscribe()
            observer.next(void 0)
            observer.error(new Error())
            observer.complete()
         })
         return {}
      }
      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should accept materialized streams", () => {
      const next = createSpy("next")
      const error = createSpy("error")
      const complete = createSpy("complete")
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
         new Service(factory, { providedIn: "root" }),
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
         new Service(factory, { providedIn: "root" }),
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
         new Service(factory, { providedIn: "root" }),
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
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(handledError).toHaveBeenCalledOnceWith(new Error())
      expect(unhandledError).toHaveBeenCalledTimes(5)
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
         new Service(factory, { providedIn: "root" }),
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
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      expect(spy).toHaveBeenCalledTimes(3)
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
         new Service(factory, { providedIn: "root" }),
      )
      injectService()
      TestBed.inject(NgModuleRef).destroy()
      expect(spy).toHaveBeenCalledTimes(1)
   })

   it("should cleanup services when provided node injector is destroyed", () => {
      const spy = createSpy()
      function factory() {
         subscribe(() => spy)
         return {}
      }
      const TestService = new Service(factory, { providedIn: "root" })
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

   it("should not unsubscribe until abort signal is called", fakeAsync(() => {
      const spy = createSpy()
      const signal = new Subscription()
      function create() {
         subscribe(interval(1000), () => spy, signal)
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
            subscribe(interval(1000), () => spy, signal)
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
      function create() {
         const beforeUpdate = onBeforeUpdate()
         const updated = onUpdated()
         subscribe(updated, () => {
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
      view.detectChanges()
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

   it("should batch state changes before calling observer", fakeAsync(() => {
      const spy = createSpy()

      function create() {
         const add1 = use(0)
         const add2 = use(0)
         const add3 = use(0)

         subscribe(() => {
            add1()
            add2()
            add3()
            spy()
         })

         subscribe(timer(0), () => {
            add1(1)
            add2(2)
            add3(3)
         })
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      createView().detectChanges()
      tick(100)
      expect(spy).toHaveBeenCalledTimes(2)
   }))

   it("should create two-way binding", () => {
      const spy = createSpy()
      function create() {
         const count = use(0)
         const countChange = use(count)

         function increment() {
            countChange(count() + 1)
         }

         return {
            count,
            countChange,
            increment,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.countChange.subscribe(spy)

      view.componentInstance.increment()
      view.detectChanges()

      expect(view.componentInstance.count).toBe(1)
      expect(spy).toHaveBeenCalledOnceWith(1)
   })

   it("should unsubscribe reactive observers", () => {
      function create() {
         const count = use(0)
         const countChange = use(count)

         const sub = subscribe(() => {
            sub.unsubscribe()
            countChange(count() + 1)
         })

         return {
            count,
            countChange,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      expect(view.componentInstance.count).toBe(1)
   })
})

describe("listen", () => {
   it("should call callback", () => {
      const spy = createSpy()
      const event = new MouseEvent("")
      function setup() {
         const callback = listen<MouseEvent>(spy)
         return {
            callback,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.callback(event)
      expect(spy).toHaveBeenCalledOnceWith(event)
   })

   it("should be observable", () => {
      const spy = createSpy()
      const event = new MouseEvent("")
      function setup() {
         const callback = listen<MouseEvent>(() => {})
         subscribe(callback, spy)
         return {
            callback,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.callback(event)
      expect(spy).toHaveBeenCalledOnceWith(event)
   })

   it("should create host listener", () => {
      const spy = createSpy()
      const observerSpy = createSpy()
      const observerSpy2 = createSpy()
      const event = new MouseEvent("click")
      function setup() {
         const callback = listen<MouseEvent>("click", spy)
         const callback2 = listen<MouseEvent>("click")
         subscribe(callback, observerSpy)
         subscribe(callback2, observerSpy2)
         return {
            callback,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      const nativeElement = view.nativeElement as HTMLElement
      view.detectChanges()
      nativeElement.dispatchEvent(event)
      expect(spy).toHaveBeenCalledOnceWith(event)
      expect(observerSpy).toHaveBeenCalledOnceWith(event)
   })

   it("should create dom listener", () => {
      const spy = createSpy()
      const observerSpy = createSpy()
      const observerSpy2 = createSpy()
      const event = new MouseEvent("click")
      const element = document.createElement("div")
      function setup() {
         const callback = listen<MouseEvent>(element, "click", spy)
         const callback2 = listen<MouseEvent>(element, "click")
         subscribe(callback, observerSpy)
         subscribe(callback2, observerSpy2)
         return {
            callback,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      element.dispatchEvent(event)
      expect(spy).toHaveBeenCalledOnceWith(event)
      expect(observerSpy).toHaveBeenCalledOnceWith(event)
      expect(observerSpy2).toHaveBeenCalledOnceWith(event)
   })

   it("should handle errors", () => {
      const event = new MouseEvent("click")
      function setup() {
         const callback = listen<MouseEvent>(() => {
            throw new Error("Boom")
         })
         return {
            callback,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      const errorHandler = TestBed.inject(ErrorHandler)
      const spy = spyOn(errorHandler, "handleError")
      view.detectChanges()
      view.componentInstance.callback(event)
      expect(spy).toHaveBeenCalledOnceWith(new Error("Boom"))
   })

   it("should use observable targets", () => {
      const spy = createSpy()
      const observerSpy = createSpy()
      const observerSpy2 = createSpy()
      const event = new MouseEvent("click")
      const element = use(document.createElement("div"))
      function setup() {
         const callback = listen<MouseEvent>(element, "click", spy)
         const callback2 = listen<MouseEvent>(element, "click")
         subscribe(callback, observerSpy)
         subscribe(callback2, observerSpy2)
         return {
            callback,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      element.value.dispatchEvent(event)
      expect(spy).toHaveBeenCalledOnceWith(event)
      expect(observerSpy).toHaveBeenCalledOnceWith(event)
      expect(observerSpy2).toHaveBeenCalledOnceWith(event)
   })
})

describe("attribute", () => {
   it("should get the attribute", () => {
      function setup() {
         const name = attribute("name")
         return {
            name,
         }
      }
      @Component({
         selector: "test",
         template: ``,
         inputs: ["name"],
      })
      class Test extends ViewDef(setup) {}

      @Component({
         template: ` <test name="test"></test> `,
      })
      class Host {}

      configureTest(Test)
      const createView = configureTest(Host)
      const view = createView()
      expect(
         view.debugElement.query(By.directive(Test)).componentInstance.name,
      ).toBe("test")
   })

   it("should convert boolean attribute", () => {
      function setup() {
         const disabled = attribute("disabled", Boolean)
         return {
            disabled,
         }
      }
      @Component({
         selector: "test",
         template: ``,
         inputs: ["disabled"],
      })
      class Test extends ViewDef(setup) {}

      @Component({
         template: ` <test disabled></test> `,
      })
      class Host {}

      configureTest(Test)
      const createView = configureTest(Host)
      const view = createView()
      view.detectChanges()
      expect(
         view.debugElement.query(By.directive(Test)).componentInstance.disabled,
      ).toBe(true)
   })

   it("should convert number value", () => {
      function setup() {
         const count = attribute("count", Number)
         return {
            count,
         }
      }
      @Component({
         selector: "test",
         template: ``,
         inputs: ["count"],
      })
      class Test extends ViewDef(setup) {}

      @Component({
         template: ` <test count="10"></test> `,
      })
      class Host {}

      configureTest(Test)
      const createView = configureTest(Host)
      const view = createView()
      view.detectChanges()
      expect(
         view.debugElement.query(By.directive(Test)).componentInstance.count,
      ).toBe(10)
   })

   it("should work as binding", () => {
      function setup() {
         const count = attribute("count", Number)
         return {
            count,
         }
      }
      @Component({
         selector: "test",
         template: ``,
         inputs: ["count"],
      })
      class Test extends ViewDef(setup) {}

      @Component({
         template: ` <test [count]="10"></test> `,
      })
      class Host {}

      configureTest(Test)
      const createView = configureTest(Host)
      const view = createView()
      expect(
         view.debugElement.query(By.directive(Test)).componentInstance.count,
      ).toBe(0)
      view.detectChanges()
      expect(
         view.debugElement.query(By.directive(Test)).componentInstance.count,
      ).toBe(10)
   })
})

describe("onError", () => {
   it("should intercept error notifications", () => {
      const spy = createSpy()
      function setup() {
         const value = use(throwError(() => new Error("BOGUS")))
         const error = onError(value, () => {})
         subscribe(value, {
            next() {
            },
            error: spy
         })
         return {
            error
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      expect(spy).not.toHaveBeenCalled()
      expect(view.componentInstance.error).toEqual({ retries: 0, message: "BOGUS", error: new Error("BOGUS")})
   })
   it("should retry on notification", () => {
      const spy = createSpy()
      const errorSpy = createSpy()
      let count = 0
      function setup() {
         const value = pipe(
            of(true),
            switchMap(() => count === 0 ? throwError(() => new Error("BOGUS")) : of(true))
         )
         const retry = use<void>(Function)
         const error = onError(value, (e) => {
            errorSpy(e)
            count++
            return retry
         })
         subscribe(value, spy)
         return {
            error,
            retry
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(setup) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.retry()
      expect(spy).toHaveBeenCalledOnceWith(true)
      expect(errorSpy).toHaveBeenCalledOnceWith({ retries: 0, message: "BOGUS", error: new Error("BOGUS")})
   })
})
