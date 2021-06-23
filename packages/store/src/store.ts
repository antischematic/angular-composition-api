import {
    BehaviorSubject,
    isObservable,
    MonoTypeOperatorFunction,
    Observable,
    of,
    OperatorFunction,
    queueScheduler,
    scheduled,
    Subject,
    Subscription,
    throwError
} from "rxjs";
import {catchError, filter, map} from "rxjs/operators";
import {ErrorHandler, Injector} from "@angular/core";

type ActionDispatcher<T extends ActionFactory, TKeys extends string = T["kind"]> = {
    [key in TKeys]: (value: T extends ActionFactory<key, infer R> ? ReturnType<R> : never) => void
}

export class StoreSubject<T extends Action, U extends BehaviorSubject<any> = any, V extends ActionFactory<any, any>[] = []> extends Subject<T> {
    #reducer: (state: U, action: T) => U
    next(value: T): void
    next(value: T extends Action<infer R> ? { kind: R } : never): void
    next(value: any) {
        this.state.next(this.#reducer(this.state.value, value))
        super.next(value)
    }
    action: ActionDispatcher<V[number]>
    state: U
    constructor(state: U, reducer: (state: U, action: T) => U, actions: V) {
        super()
        this.#reducer = reducer
        this.state = state
        this.action = actions.reduce((acc, next) => {
            acc[next.kind] = (...args: any[]) => {
                this.next(next(...args) as any)
            }
            return acc
        }, {} as any)
        return Object.create(this, {
            action: {
                enumerable: true,
                value: this.action
            },
            state: {
                enumerable: true,
                value: this.state
            }
        })
    }
}

type TArgs<T> = T extends (...args: infer R) => any ? R : never

export interface Action<T extends string = string, U = unknown> {
    readonly kind: T
    readonly data: U
}

export type ActionFactory<T extends string = string, U extends (...args: any[]) => any = (...args: any[]) => unknown> = {
    readonly kind: T,
    (...args: TArgs<U>): Action<T, ReturnType<U>>
}

export function Store<T extends BehaviorSubject<any>, U extends (ActionFactory)[]>(reducer: (state: T, action: ActionUnion<U>) => T, initialValue: T, actions?: U): StoreSubject<ActionUnion<U>, T, U>
export function Store<T extends BehaviorSubject<any>, U extends Action<any, any>>(reducer: (state: T, action: U) => T, initialValue: T): StoreSubject<U, T>
export function Store<T extends BehaviorSubject<any>>(reducer: (state: T, action: Action<any>) => T, initialValue: T): StoreSubject<Action<any>, T>
export function Store<T extends BehaviorSubject<any>>(reducer: (state: T, action: Action<any>) => T, initialValue: T, actions = []): StoreSubject<Action<any>, T> {
    return new StoreSubject<any, T, any[]>(initialValue, reducer, actions)
}

export type ActionUnion<T extends ActionFactory[]> = ReturnType<T[number]> & { kind: T[number]["kind"]}

export function Action<T extends string, U extends (...args: any) => any>(kind: T): ActionFactory<T, () => void>
export function Action<T extends string, U extends (...args: any) => any>(kind: T, data: U): ActionFactory<T, U>
export function Action<T extends string, U extends (...args: any) => any>(kind: T, data: U = ((arg: any) => arg) as any): ActionFactory<T, U> {
    function createAction(...args: TArgs<U>[]) {
        return {
            kind,
            data: data(...args)
        }
    }
    createAction.kind = kind
    return createAction
}

export function kindOf<T extends string>(...types: ActionFactory<T>[]): MonoTypeOperatorFunction<Action<T>> {
    return function (source) {
        return source.pipe(
            filter((value) => types.some(type => value.kind === type.kind))
        )
    }
}

export function subscribe<T extends StoreSubject<any>, U extends Effect<any, EffectHandler<T extends StoreSubject<any, infer R> ? BehaviorSubject<R> : BehaviorSubject<unknown>, any>>[]>(store: T, effects: U, errorHandler: ErrorHandler, cleanup: Subscription) {
    const stateRef = Object.freeze(Object.create(store.state))
    function retry(error: unknown, caught: Observable<Action>) {
        errorHandler.handleError(error)
        return caught
    }
    for (const effect of effects) {
        const operator = effect.factory(stateRef)
        if (isObservable(operator)) {
            cleanup.add(operator.pipe(
                catchError(retry)
            ).subscribe(store))
        } else {
            const kinds = Array.isArray(effect.action) ? effect.action : [effect.action]
            cleanup.add(scheduled(store, queueScheduler).pipe(
                kindOf(...kinds),
                operator,
                catchError(retry)
            ).subscribe(store))
        }
    }
}

export function useEffects<T extends StoreSubject<any>, U extends Effect<any, EffectHandler<T extends StoreSubject<any, infer R> ? BehaviorSubject<R> : BehaviorSubject<unknown>, any>>[]>(store: T, effects: U, injector: Injector) {
    const cleanup = new Subscription()
    const errorHandler = injector.get(ErrorHandler)
    const childInjector = Injector.create({
        parent: injector,
        providers: [{
            provide: subscribe,
            useFactory: () => subscribe(store, effects, errorHandler, cleanup)
        }]
    })

    childInjector.get(subscribe)

    return cleanup
}

export type EffectHandler<T, U> = (state: T) => OperatorFunction<U, Action> | Observable<Action>

export interface Effect<T extends ActionFactory<any>, U extends EffectHandler<any, ReturnType<T>>> {
    action?: T,
    factory: U
}

export function Effect<U extends (state: any) => OperatorFunction<Action, Action>>(factory: U): Effect<never, U>
export function Effect<U extends (state: any) => Observable<Action>>(factory: U): Effect<never, U>
export function Effect<T extends ActionFactory<any, any>, U extends (state: any) => OperatorFunction<ReturnType<T>, Action>>(action: T, factory: U): Effect<T, U>
export function Effect<T extends ActionFactory<any, any>, U extends (state: any) => OperatorFunction<ReturnType<T>, Action>>(action: T[], factory: U): Effect<T, U>
export function Effect(actionOrFactory: any, factory: any = actionOrFactory): Effect<any, any> {
    const action = arguments.length === 2 ? actionOrFactory : void 0
    return {
        action,
        factory
    }
}

export function action<T extends ActionFactory, U extends ActionFactory>(action: T, errorAction?: U): OperatorFunction<ReturnType<T>["data"], Action> {
    return function (source) {
        return source.pipe(
            map(action),
            catchError((error) => {
                return errorAction ? of(errorAction(error)) : throwError(error)
            })
        )
    }
}
