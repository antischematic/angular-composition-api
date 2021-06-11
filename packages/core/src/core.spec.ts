import {
    addCheck,
    addEffect,
    addTeardown,
    CallContextError,
    check,
    Service,
    subscribe,
    View
} from "./core";
import {Component, Type, EventEmitter, NgModuleRef, ErrorHandler} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import objectContaining = jasmine.objectContaining;
import createSpy = jasmine.createSpy;
import {BehaviorSubject, concat, defer, EMPTY, merge, Notification, of, throwError} from "rxjs";
import {materialize, mergeMap, switchMap, tap} from "rxjs/operators";

function defineView<T>(View: Type<T>): () => ComponentFixture<T> {
    TestBed.configureTestingModule({
        declarations: [View]
    })

    return function createComponent() {
        return TestBed.createComponent(View)
    }
}

function defineService<T>(Service: Type<T>, options?: { configureTestingModule?: boolean }): () => T {
    if (options?.configureTestingModule) {
        TestBed.configureTestingModule({
            providers: [Service]
        })
    }

    return function injectService() {
        return TestBed.inject(Service)
    }
}

describe("View", () => {
    it("should create", () => {
        function State() {
            return {}
        }
        @Component({ template: ``})
        class Test extends View(State) {}
        const createView = defineView(Test)
        expect(createView).not.toThrow()
    })

    it("should pass props", () => {
        class Props {
            count = 0
        }
        function State(props: Props) {
            expect(props).toEqual(objectContaining({ count: 0 }))
            return {}
        }
        @Component({ template: ``})
        class Test extends View(Props, State) {}
        const createView = defineView(Test)
        createView()
    })

    it("should merge state and props", () => {
        class Props {
            count = 0
        }
        function State() {
            const name = "bogus"
            return {
                name
            }
        }
        @Component({ template: ``})
        class Test extends View(Props, State) {}
        const createView = defineView(Test)
        expect(createView().componentInstance).toEqual(objectContaining({ count: 0, name: "bogus" }))
    })

    it("should unwrap marked subject", () => {
        function State() {
            return {
                count: new BehaviorSubject(1337)
            }
        }
        @Component({ template: ``})
        class Test extends View(State) {}
        const createView = defineView(Test)
        expect(createView().componentInstance.count).toBe(1337)
    })

    it("should unwrap marked emitters", () => {
        const spy = createSpy()
        function State() {
            const increment =  new EventEmitter<void>()
            addTeardown(increment.subscribe(spy))
            return {
                increment
            }
        }
        @Component({ template: ``})
        class Test extends View(State) {}
        const createView = defineView(Test)
        createView().componentInstance.increment()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should create two-way binding with marked subject", () => {
        const value = new BehaviorSubject(0)
        function State() {
            return {
                value
            }
        }
        @Component({ template: `{{ value }}`})
        class Test extends View(State) {}
        const createView = defineView(Test)
        const view =  createView()
        const instance = view.componentInstance
        expect(view.debugElement.nativeElement.textContent).toEqual(``)
        view.detectChanges()
        expect(view.debugElement.nativeElement.textContent).toEqual(`${value.value}`)
        instance.value = 10
        expect(value.value).toBe(0)
        view.detectChanges()
        expect(value.value).toBe(10)
    })
})

describe("Service", () => {
    it("should create", () => {
        function factory() {}
        const injectService = defineService(Service(factory), { configureTestingModule: true })
        expect(injectService).not.toThrow()
    })
    it("should create tree-shakable provider", () => {
        function factory() {}
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        expect(injectService).not.toThrow()
    })
    it("should throw if not provided", () => {
        function factory() {}
        const injectService = defineService(Service(factory))
        expect(injectService).toThrow()
    })
    it("should equal factory return value when injected", () => {
        function factory() {
            return [1, 2, 3]
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        expect(injectService()).toEqual([1, 2, 3])
    })
    it("should be same instance when injected multiple times", () => {
        function factory() {
            return { count: 0 }
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        expect(injectService()).toEqual(injectService())
    })
})

describe("Context API", () => {
    it("should throw when using context apis outside of context", () => {
        expect(addEffect).toThrow(new CallContextError())
        expect(addCheck).toThrow(new CallContextError())
        expect(addTeardown).toThrow(new CallContextError())
        expect(check).toThrow(new CallContextError())
        expect(subscribe).toThrow(new CallContextError())
        // expect(unsubscribe).toThrow(new CallContextError())
    })
    it("should be checked during change detection", () => {
        const spy = createSpy()
        function State() {
            const subject = (value: number) => ({ check() { spy(value) } })
            addCheck(0, subject(0))
            addCheck(1, subject(1))
            addCheck(2, subject(2))
            return {}
        }
        @Component({ template: ``})
        class Test extends View(State) {}
        const createView = defineView(Test)
        expect(spy).toHaveBeenCalledTimes(0)
        createView().detectChanges()
        expect(spy).toHaveBeenCalledTimes(3)
        expect(spy.calls.allArgs()).toEqual([
            [0], [1], [2]
        ])
    })
    it("should not run effects until view is mounted", () => {
        const spy = createSpy()
        function State() {
            addEffect(spy)
            return {}
        }
        @Component({ template: ``})
        class Test extends View(State) {}
        const createView = defineView(Test)
        expect(spy).toHaveBeenCalledTimes(0)
        createView().detectChanges()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should run effects immediately", () => {
        const spy = createSpy()
        function factory() {
            addEffect(spy)
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should subscribe to observables", () => {
        const spy = createSpy()
        function factory() {
            const deferred = defer(spy)
            addEffect(deferred)
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should execute teardown when module is destroyed", () => {
        const spy = createSpy()
        function factory() {
            addEffect(() => spy)
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(0)
        TestBed.inject(NgModuleRef).destroy()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should execute teardown when view is destroyed", () => {
        const spy = createSpy()
        function State() {
            addEffect(() => spy)
            return {}
        }
        @Component({ template: ``})
        class Test extends View(State) {}
        const createView = defineView(Test)
        const view = createView()
        view.detectChanges()
        expect(spy).toHaveBeenCalledTimes(0)
        view.destroy()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should execute teardown each time a value is emitted", () => {
        const spy = createSpy()
        function factory() {
            addEffect(of(1, 2, 3), () => spy)
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it ("should not be destroyed more than once", () => {
        const spy = createSpy()
        function factory() {
            const subcription = addEffect(() => spy)
            subcription.unsubscribe()
            subcription.unsubscribe()
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        const module = TestBed.inject(NgModuleRef)
        injectService()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should accept materialized streams", () => {
        const next = createSpy()
        const error = createSpy()
        const complete = createSpy()
        function factory() {
            const source = of(10, new Error()).pipe(
                mergeMap((value, index) => index ? throwError(value) : of(value)),
                materialize()
            )
            addEffect(source, {
                next,
                error,
                complete
            })
            return {}

        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(next).toHaveBeenCalledOnceWith(10)
        expect(error).toHaveBeenCalledOnceWith(new Error())
        expect(complete).toHaveBeenCalledOnceWith()
    })
    it("should continue observing on error", () => {
        const error = createSpy("error")
        function factory() {
            const source = throwError(new Error()).pipe(
                materialize()
            )
            addEffect(merge(source, source, source), {
                next() {},
                error,
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(error).toHaveBeenCalledTimes(3)
    })
    it("should continue observing on complete", () => {
        const complete = createSpy("complete")
        function factory() {
            const source = of(true).pipe(
                materialize()
            )
            addEffect(merge(source, source, source), {
                next() {},
                complete,
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(complete).toHaveBeenCalledTimes(4)
    })
    it("should catch unhandled errors", () => {
        const unhandledError = createSpy("unhandledError")
        const handledError = createSpy("handledError")
        function factory() {
            const error = throwError(new Error())
            addEffect(error, {
                next() {},
                error: handledError,
            })
            addEffect(error, {
                next() {}
            })
            addEffect(error, () => {})
            addEffect(() => {
                throw new Error()
            })
            return {}
        }
        TestBed.configureTestingModule({
            providers: [{
                provide: ErrorHandler,
                useValue: {
                    handleError: unhandledError
                }
            }]
        })
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(handledError).toHaveBeenCalledOnceWith(new Error())
        expect(unhandledError).toHaveBeenCalledTimes(3)
    })
})