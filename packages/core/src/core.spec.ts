import {
    addCheck,
    addEffect,
    addTeardown,
    CallContextError,
    check,
    Inject,
    Service,
    Subscribe,
    subscribe,
    View
} from "./core";
import {
    Component,
    Directive,
    ErrorHandler,
    EventEmitter,
    Injectable,
    InjectionToken,
    Input,
    NgModuleRef,
    Type
} from "@angular/core";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {defer, merge, of, throwError} from "rxjs";
import {materialize, mergeMap} from "rxjs/operators";
import {checkPhase} from "./interfaces";
import {Value} from "./common";
import objectContaining = jasmine.objectContaining;
import createSpy = jasmine.createSpy;

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

    it("should unwrap marked values", () => {
        const subject = Value(1337)
        Object.defineProperty(subject, checkPhase, { value: 0 })
        function State() {
            return {
                count: subject
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
    it("should create two-way binding with marked values", () => {
        const value = Value(0)
        Object.defineProperty(value, checkPhase, { value: 0 })
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
    it("should unwrap marked props", () => {
        const subject = Value(1337)
        Object.defineProperty(subject, checkPhase, { value: 0 })
        @Directive()
        class Props {
            @Input() count = subject
        }
        function State(props: Props) {
            expect(props.count.value).toBe(1337)
            return {}
        }
        @Component({ template: ``})
        class Test extends View(Props, State) {}
        const createView = defineView(Test)
        expect(createView().componentInstance.count).toBe(1337)
    })
    it("should forward changes to marked props", () => {
        const subject = Value(1337)
        const spy = createSpy()
        Object.defineProperty(subject, checkPhase, { value: 0 })
        @Directive()
        class Props {
            @Input() count = subject
        }
        function State(props: Props) {
            Subscribe(props.count, spy)
            return {}
        }
        @Component({ template: `{{ count }}`})
        class Test extends View(Props, State) {}
        const createView = defineView(Test)
        const view = createView()
        expect(spy).toHaveBeenCalledTimes(0)
        expect(view.componentInstance.count).toBe(1337)
        view.detectChanges()
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
            const subject = (value: number) => ({
                check() {
                    spy(value)
                }
            })
            addCheck(0, subject(0))
            addCheck(1, subject(1))
            addCheck(2, subject(2))
            return {}
        }

        @Component({template: ``})
        class Test extends View(State) {
        }

        const createView = defineView(Test)
        expect(spy).toHaveBeenCalledTimes(0)
        createView().detectChanges()
        expect(spy).toHaveBeenCalledTimes(3)
        expect(spy.calls.allArgs()).toEqual([
            [0], [1], [2]
        ])
    })
})

describe("Subscribe", () => {
    it("should not run effects until view is mounted", () => {
        const spy = createSpy()
        function State() {
            Subscribe(spy)
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
            Subscribe(spy)
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
            Subscribe(deferred)
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should execute teardown when module is destroyed", () => {
        const spy = createSpy()
        function factory() {
            Subscribe(() => spy)
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
            Subscribe(() => spy)
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
            Subscribe(of(1, 2, 3), () => spy)
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it ("should not be destroyed more than once", () => {
        const spy = createSpy()
        function factory() {
            const observer = Subscribe(() => spy)
            Subscribe(() => {
                observer.unsubscribe()
                observer.unsubscribe()
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it ("should not emit when destroyed", () => {
        const spy = createSpy()
        function factory() {
            const observer = addEffect(() => spy)
            Subscribe(() => {
                observer.unsubscribe()
                observer.next(void 0)
                observer.error(new Error())
                observer.complete()
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
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
            Subscribe(source, {
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
            Subscribe(merge(source, source, source), {
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
            Subscribe(merge(source, source, source), {
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
            Subscribe(error, {
                next() {},
                error: handledError,
            })
            Subscribe(error, {
                next() {}
            })
            Subscribe(error)
            Subscribe(of(true), () => {
                throw new Error()
            })
            Subscribe(of(true), {
                next() {
                    throw new Error()
                },
                complete() {
                    throw new Error()
                }
            })
            Subscribe(() => {
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
        expect(unhandledError).toHaveBeenCalledTimes(6)
    })
    it("should support nested subscriptions", () => {
        const spy = createSpy()
        function factory() {
            Subscribe(() => {
                Subscribe(spy)
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should cleanup nested subscriptions each time the parent emits", () => {
        const spy = createSpy()
        function factory() {
            Subscribe(of(1, 2, 3), () => {
                Subscribe(() => spy)
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it("should cleanup nested subscriptions when the root is destroyed", () => {
        const spy = createSpy()
        function factory() {
            Subscribe(() => {
                Subscribe(() => spy)
            })
            return {}
        }
        const injectService = defineService(Service(factory, { providedIn: "root" }))
        injectService()
        TestBed.inject(NgModuleRef).destroy()
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should cleanup services when provided node injector is destroyed", () => {
        const spy = createSpy()
        function factory() {
            Subscribe(() => spy)
        }
        const TestService = Service(factory, { providedIn: "root" })
        defineService(TestService)
        function State() {
            Inject(TestService)
            return {}
        }
        @Component({ template: ``, providers: [TestService] })
        class Test extends View(State) {}
        const createView = defineView(Test)
        createView().destroy()
        expect(spy).toHaveBeenCalled()
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
            }
        })

        function factory() {
            expect(Inject(Type)).toBeInstanceOf(Type)
            expect(Inject(AbstractType)).toBeInstanceOf(AbstractType)
            expect(Inject(Token)).toBe(tokenValue)
        }

        const injectService = defineService(Service(factory, { providedIn: "root" }))

        injectService()
    })
    it("should use fallback value", () => {
        const Token = new InjectionToken("Token")

        function factory() {
            expect(Inject(Token, 10)).toBe(10)
        }

        const injectService = defineService(Service(factory, { providedIn: "root" }))

        injectService()
    })
})
