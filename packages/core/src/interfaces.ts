import {AbstractType, ErrorHandler, EventEmitter, Injector, Type} from '@angular/core';
import {Observable, PartialObserver, Subscribable, Subscription, SubscriptionLike} from 'rxjs';

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

export interface CheckSubject<T> {
    value: T
    readonly [checkPhase]: CheckPhase
    subscribe(observer: PartialObserver<T>): SubscriptionLike
    subscribe(observer: (value: T) => void): SubscriptionLike
}

export type CheckPhase = 0 | 1 | 2;
export type EffectObserver<T> = Subscribable<T>

export type State<T, U> = Type<{
    [key in keyof T]: T[key] extends CheckSubject<infer R> ? R : T[key]
} & {
    [key in keyof U]: U[key] extends CheckSubject<infer R> ? R : U[key] extends EventEmitter<infer R> ? (value: R) => void : U[key]
}>

export type UnsubscribeSignal = Subscription | AbortSignal | null