import {
   addCheck,
   addEffect,
   addTeardown,
   CallContextError,
   check,
   EffectObserver,
   getContext,
   inject,
   Service,
   subscribe,
   unsubscribe,
   ViewDef,
} from "./core"
import {
   Component,
   ErrorHandler,
   Injectable,
   InjectionToken,
   Type,
} from "@angular/core"
import { ComponentFixture, TestBed } from "@angular/core/testing"
import { checkPhase } from "./interfaces"
import { use } from "./common"
import { EventManager } from "@angular/platform-browser"
import { ZonelessEventManager } from "./event-manager"
import objectContaining = jasmine.objectContaining
import createSpy = jasmine.createSpy

export function configureTest<T>(View: Type<T>): () => ComponentFixture<T> {
   TestBed.configureTestingModule({
      declarations: [View],
      providers: [
         {
            provide: EventManager,
            useClass: ZonelessEventManager,
         },
      ],
   })

   return function createComponent() {
      return TestBed.createComponent(View)
   }
}

export function defineService<T>(
   Service: Type<T>,
   options?: { configureTestingModule?: boolean },
): () => T {
   if (options?.configureTestingModule) {
      TestBed.configureTestingModule({
         providers: [Service],
      })
   }

   return function injectService() {
      return TestBed.inject(Service)
   }
}

describe("ViewDef", () => {
   it("should create", () => {
      function create() {
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      expect(createView).not.toThrow()
   })

   it("should merge state", () => {
      function create() {
         const count = 0
         const name = "bogus"
         return {
            count,
            name,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      expect(createView().componentInstance).toEqual(
         objectContaining({ count: 0, name: "bogus" }),
      )
   })
   it("should unwrap marked values", () => {
      const subject = use(1337)
      Object.defineProperty(subject, checkPhase, { value: 0 })
      function create() {
         return {
            count: subject,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      expect(createView().componentInstance.count).toBe(1337)
   })

   it("should unwrap marked emitters", () => {
      const spy = createSpy()
      function create() {
         const increment = use<void>(Function)
         addTeardown(increment.subscribe(spy))
         return {
            increment,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      createView().componentInstance.increment()
      expect(spy).toHaveBeenCalledTimes(1)
   })
   it("should forward changes to reactive values", () => {
      const subject = use(1337)
      const spy = createSpy()
      function create() {
         const count = subject
         const { error } = getContext()
         const effect = new EffectObserver(count, spy, null, error)
         addEffect(effect)
         return {
            count,
         }
      }
      @Component({ template: `{{ count }}` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      expect(spy).toHaveBeenCalledTimes(0)
      expect(view.componentInstance.count).toBe(1337)
      view.detectChanges()
      expect(view.debugElement.nativeElement.textContent).toEqual(`1337`)
      expect(spy).toHaveBeenCalledWith(1337)
      expect(spy).toHaveBeenCalledTimes(1)
      view.componentInstance.count = 10
      expect(view.debugElement.nativeElement.textContent).toEqual(`1337`)
      expect(subject.value).toBe(1337)
      view.detectChanges()
      expect(view.debugElement.nativeElement.textContent).toEqual(`10`)
      expect(subject.value).toBe(10)
      expect(spy).toHaveBeenCalledWith(10)
      expect(spy).toHaveBeenCalledTimes(2)
   })
   it("should not automatically detect changes when directly calling returned functions", () => {
      function create() {
         const count = use(0)
         const countChange = use(count)

         function increment() {
            countChange(count() + 1)
            expect(view.debugElement.nativeElement.textContent).toBe(`0`)
         }
         return {
            count,
            increment,
         }
      }
      @Component({ template: `{{ count }}` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.increment()
      expect(view.componentInstance.count).toBe(1)
      expect(view.debugElement.nativeElement.textContent).toBe(`0`)
   })
   it("should not catch errors when directly calling returned functions", () => {
      function create() {
         function increment() {
            throw new Error("Bogus")
         }
         return {
            increment,
         }
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}
      const createView = configureTest(Test)
      const view = createView()
      const error = TestBed.inject(ErrorHandler)
      const spy = spyOn(error, "handleError")
      view.detectChanges()
      expect(() => view.componentInstance.increment()).toThrow(
         new Error("Bogus"),
      )
   })
})

describe("Service", () => {
   it("should create", () => {
      function factory() {}
      const injectService = defineService(new Service(factory), {
         configureTestingModule: true,
      })
      expect(injectService).not.toThrow()
   })
   it("should create tree-shakable provider", () => {
      function factory() {}
      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
      )
      expect(injectService).not.toThrow()
   })
   it("should throw if not provided", () => {
      function factory() {}
      const injectService = defineService(new Service(factory))
      expect(injectService).toThrow()
   })
   it("should equal factory return value when injected", () => {
      function factory() {
         return [1, 2, 3]
      }
      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
      )
      expect(injectService()).toEqual([1, 2, 3])
   })
   it("should be same instance when injected multiple times", () => {
      function factory() {
         return { count: 0 }
      }
      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
      )
      expect(injectService()).toEqual(injectService())
   })
})

describe("Context API", () => {
   it("should throw when using context apis outside of context", () => {
      expect(addEffect).not.toThrow(new CallContextError())
      expect(addCheck).toThrow(new CallContextError())
      expect(addTeardown).toThrow(new CallContextError())
      expect(check).toThrow(new CallContextError())
      expect(subscribe).toThrow(new CallContextError())
      expect(unsubscribe).toThrow(new CallContextError())
   })
   it("should be checked during change detection", () => {
      const spy = createSpy()
      function create() {
         const subject = (value: number) => ({
            check() {
               spy(value)
            },
         })
         addCheck(0, subject(0))
         addCheck(1, subject(1))
         addCheck(2, subject(2))
         return {}
      }
      @Component({ template: `` })
      class Test extends ViewDef(create) {}

      const createView = configureTest(Test)
      expect(spy).toHaveBeenCalledTimes(0)
      createView().detectChanges()
      expect(spy).toHaveBeenCalledTimes(3)
      expect(spy.calls.allArgs()).toEqual([[0], [1], [2]])
   })
   it("should not automatically update view when directly mutating value", () => {
      function create() {
         const value = use<number[]>([])

         function update() {
            value((val) => val.push(10))
         }

         return {
            value,
            update,
         }
      }

      @Component({
         template: `{{ value[0] }}`,
      })
      class Test extends ViewDef(create) {}

      const createView = configureTest(Test)
      const view = createView()
      view.detectChanges()
      view.componentInstance.update()

      expect(view.componentInstance.value).toEqual([10])
      expect(view.debugElement.nativeElement.textContent).toBe("")
   })
})

describe("Inject", () => {
   it("should inject provider token", () => {
      @Injectable({ providedIn: "root" })
      class Type {}
      @Injectable({ providedIn: "root" })
      abstract class AbstractType {}
      const tokenValue = {}
      const Token = new InjectionToken("Token", {
         providedIn: "root",
         factory() {
            return tokenValue
         },
      })

      function factory() {
         expect(inject(Type)).toBeInstanceOf(Type)
         expect(inject(AbstractType)).toBeInstanceOf(AbstractType)
         expect(inject(Token)).toBe(tokenValue)
      }

      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
      )

      injectService()
   })
   it("should use fallback value", () => {
      const Token = new InjectionToken("Token")

      function factory() {
         expect(inject(Token, 10)).toBe(10)
      }

      const injectService = defineService(
         new Service(factory, { providedIn: "root" }),
      )

      injectService()
   })
})
