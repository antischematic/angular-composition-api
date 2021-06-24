import {action, Action, ActionUnion, Effect, kindOf, props, Store, useEffects} from "./store";
import {Inject, Service, Value, ValueSubject} from "@mmuscat/angular-composition-api";
import {of, throwError} from "rxjs";
import {mergeMap} from "rxjs/operators";
import {TestBed} from "@angular/core/testing";
import {ApplicationRef, inject, InjectionToken, Injector, INJECTOR} from "@angular/core";
import {UseEffects} from "./context";
import createSpy = jasmine.createSpy;

const Update = Action("Update", props<number>())
const Kind = Action("Kind")
const Failure = Action("Failure", props<Error>())

const actions = [Update, Kind]

type Actions = ActionUnion<typeof actions>

function reducer(state: number, action: Actions) {
    switch (action.kind) {
        case Update.kind: {
            return state + action.data
        }
    }
    return state
}

describe("Store", () => {
    let state: ValueSubject<number>
    beforeEach(() => {
        state = Value(0)
    })

    it("should create", () => {
        const store = Store(reducer, state)
        expect(store.state.value).toBe(0)
    })

    it("should reduce actions", () => {
        const store = Store(reducer, state, actions)
        store.next(Update(10))
        expect(store.state.value).toBe(10)
        store.action.Update(10)
        expect(store.state.value).toBe(20)
    })

    it("should dispatch actions", () => {
        const store = Store(reducer, state, actions)
        const spy = createSpy()
        store.subscribe(spy)
        store.next(Update(10))
        store.action.Update(10)
        expect(spy).toHaveBeenCalledTimes(2)
        expect(spy).toHaveBeenCalledWith(Update(10))
    })

    it("should update state before actions are dispatched", () => {
        const store = Store(reducer, state, actions)
        const spy = createSpy()
        state.subscribe(spy)
        store.subscribe(spy)
        store.next(Update(10))
        store.action.Update(10)
        expect(spy.calls.allArgs()).toEqual([
            [0],
            [10],
            [Update(10)],
            [20],
            [Update(10)]
        ])
    })

    describe("Utils", () => {

        it("should filter actions by kind", () => {
            const store = Store(reducer, state, actions)
            const spy = createSpy()

            store.pipe(
                kindOf(Kind)
            ).subscribe(spy)

            store.next(Update(10))
            store.action.Update(10)
            store.action.Kind()

            expect(spy).toHaveBeenCalledOnceWith(Kind())
        })

        it("should map data to actions", () => {
            const store = Store(reducer, state, actions)

            of(10, 20, 30).pipe(
                action(Update)
            ).subscribe(store)

            expect(state.value).toBe(60)
        })

        it("should map errors to actions", () => {
            const spy = createSpy()

            throwError(new Error()).pipe(
                action(Update, Failure)
            ).subscribe(spy)

            expect(spy).toHaveBeenCalledOnceWith(Failure(new Error()))
        })
    })
    describe("Effects", () => {
        it("should create", () => {
            const factory = () => {
                return mergeMap(() => {
                    return of(Kind())
                })
            }
            const effect = Effect(Update, factory)

            expect(effect.action).toEqual([Update])
            expect(effect.factory).toBe(factory)
        })

        it("should run effects", () => {
            const spy = createSpy()
            const effect = Effect(Update, () => {
                spy()
                return mergeMap(() => {
                    return of(Kind())
                })
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const RUN = new InjectionToken("RUN", { factory: create })
            function create() {
                useEffects(store, effects, inject(INJECTOR))
            }
            TestBed.inject(RUN)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it("should receive actions and dispatch actions", () => {
            const spy = createSpy()
            const effect = Effect(Update, () => {
                return mergeMap((action) => {
                    spy({ action })
                    return of(Kind())
                })
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const RUN = new InjectionToken("RUN", { factory: create })
            function create() {
                useEffects(store, effects, inject(INJECTOR))
            }
            TestBed.inject(RUN)
            store.subscribe(spy)
            store.action.Update(10)
            expect(spy).toHaveBeenCalledWith(Update(10))
            expect(spy).toHaveBeenCalledWith({ action: Update(10) })
            expect(spy).toHaveBeenCalledWith(Kind())
        })

        it("should run with plain observables", () => {
            const spy = createSpy()
            const effect = Effect(() => {
                return of(Kind())
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const RUN = new InjectionToken("RUN", { factory: create })
            function create() {
                useEffects(store, effects, inject(INJECTOR))
            }
            store.subscribe(spy)
            TestBed.inject(RUN)
            expect(spy).toHaveBeenCalledOnceWith(Kind())
        })

        it("should continue after error", () => {
            const logger = spyOn(console, "error")
            const spy = createSpy()
            const effect = Effect(Update, () => {
                return mergeMap((action) => {
                    return action.data > 10 ? throwError(new Error()) : of(Kind())
                })
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const RUN = new InjectionToken("RUN", { factory: create })
            function create() {
                useEffects(store, effects, inject(INJECTOR))
            }
            TestBed.inject(RUN)
            store.subscribe(spy)
            store.action.Update(15)
            store.action.Update(5)
            expect(spy).toHaveBeenCalledTimes(3)
            expect(spy).toHaveBeenCalledWith(Kind())
            expect(logger).toHaveBeenCalledOnceWith("ERROR", new Error())
        })

        it("should stop effects", () => {
            const spy = createSpy()
            const effect = Effect(Update, () => {
                return mergeMap(() => {
                    return of(Kind())
                })
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const RUN = new InjectionToken("RUN", { factory: create })
            function create() {
                const subscription = useEffects(store, effects, inject(INJECTOR))
                subscription.unsubscribe()
            }
            TestBed.inject(RUN)
            store.subscribe(spy)
            store.next(Update(10))
            expect(spy).not.toHaveBeenCalledWith(Kind())
        })

        it("should allow dependency injection", () => {
            const spy = createSpy()
            const effect = Effect(() => {
                spy(inject(ApplicationRef))
                return of(Kind())
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const RUN = new InjectionToken("RUN", { factory: create })
            function create() {
                const subscription = useEffects(store, effects, inject(INJECTOR))
                subscription.unsubscribe()
            }
            TestBed.inject(RUN)
            expect(spy.calls.first().args[0]).toBeInstanceOf(ApplicationRef)
        })
    })

    describe("Composition API", () => {
        it("should run effects with Angular Composition API", () => {
            const spy = createSpy()
            const effect = Effect(Update, () => {
                spy()
                return mergeMap(() => {
                    return of(Kind())
                })
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const EffectsContext = Service(create)
            const RUN = new InjectionToken("RUN", { factory() {
                return new EffectsContext
            }})
            function create() {
                UseEffects(store, effects)
            }
            TestBed.inject(RUN)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it("should stop effects", () => {
            const spy = createSpy()
            const effect = Effect(Update, () => {
                return mergeMap(() => {
                    return of(Kind())
                })
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const EffectsContext = Service(create)
            const RUN = new InjectionToken("RUN", { factory() {
                return new EffectsContext
            }})
            function create() {
                const subscription = UseEffects(store, effects)
                subscription.unsubscribe()
            }
            TestBed.inject(RUN)
            store.subscribe(spy)
            store.next(Update(10))
            expect(spy).not.toHaveBeenCalledWith(Kind())
        })

        it("should allow dependency injection", () => {
            const spy = createSpy()
            const effect = Effect(() => {
                spy(Inject(ApplicationRef))
                return of(Kind())
            })
            const effects = [effect]
            const store = Store(reducer, state, actions)
            const EffectsContext = Service(create)
            const RUN = new InjectionToken("RUN", { factory() {
                return new EffectsContext
            }})
            function create() {
                UseEffects(store, effects)
            }
            TestBed.inject(RUN)
            expect(spy.calls.first().args[0]).toBeInstanceOf(ApplicationRef)
        })
    })
})
