import {
   AbstractType,
   ContentChild, ContentChildren,
   ErrorHandler,
   EventEmitter,
   Injector,
   Type, ViewChild, ViewChildren
} from '@angular/core';
import {
   Observable,
   PartialObserver,
   Subject,
   Subscribable,
   Subscription,
   SubscriptionLike
} from 'rxjs';

export const checkPhase = Symbol("checkPhase")

export interface Check {
    check(): boolean;
}

export interface Context {
    injector: Injector;
    error: ErrorHandler;
    subscription: Subscription;
    effects: Set<EffectObserver<any>>;
    scheduler: any
    0: Set<Check>;
    1: Set<Check>;
    2: Set<Check>;
}

export interface CheckSubject<T> extends Subscribable<T> {
    value: T
    readonly [checkPhase]: CheckPhase
}

export type CheckPhase = 0 | 1 | 2;
export type EffectObserver<T> = Subscribable<T>

export type State<T, U> = Type<{
    [key in keyof T]: T[key] extends CheckSubject<infer R> ? R : T[key]
} & {
    [key in keyof U]: U[key] extends CheckSubject<infer R> ? R : U[key] extends EventEmitter<infer R> ? (value: R) => void : U[key]
}>

export type UnsubscribeSignal = Subscription | AbortSignal | null

export type Value<T> = CheckSubject<T> & {
   readonly __ng_value: true
   readonly source: Subject<T>
   readonly pipe: Subject<T>["pipe"]
   readonly value: T
   (): T
   (value: T): void
   next(value: T): void
} & [Value<T>, Emitter<T>]

export interface ReadonlyValue<T> extends CheckSubject<T> {
   readonly __ng_value: true
   readonly source: Observable<T>
   readonly pipe: Observable<T>["pipe"]
   readonly value: T
   (): T
}

export interface EmitterWithParams<T extends (...args: any[]) => any> extends Subscribable<T> {
   readonly __ng_emitter: true
   readonly source: Subject<ReturnType<T>>
   readonly pipe: Subject<ReturnType<T>>["pipe"]
   (...args: Parameters<T>): void
   next(value: ReturnType<T>): void
}

export interface Emitter<T> extends Subscribable<T> {
   readonly __ng_emitter: true
   readonly source: Subject<T>
   readonly pipe: Subject<T>["pipe"]
   (value: T): void
   next(value: T): void
}

export type QueryType =
   | typeof ContentChild
   | typeof ViewChild

export type QueryListType =
   | typeof ViewChildren
   | typeof ContentChildren
