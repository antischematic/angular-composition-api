import {ErrorHandler, EventEmitter, Injector, Type} from '@angular/core';
import {PartialObserver, Subscribable, Subscription, SubscriptionLike} from 'rxjs';

export const checkPhase = Symbol("checkPhase")

export interface Check {
    check(): boolean;
}

export interface Context {
    injector: Injector;
    error: ErrorHandler;
    subscription: Subscription;
    effects: Set<EffectObserver<any>>;
    0: Set<Check>;
    1: Set<Check>;
    2: Set<Check>;
    3: any
}

export interface CheckSubject<T> {
    value?: T
    readonly [checkPhase]: CheckPhase
    subscribe(observer: PartialObserver<T>): SubscriptionLike
    subscribe(observer: (value: T) => void): SubscriptionLike
}

export type CheckPhase = 0 | 1 | 2;
export type EffectObserver<T> = Subscribable<T>
export type SyncState<T> = {
    [key in keyof T]: T[key] extends EventEmitter<infer R>
        ? ((value: R) => void)
        : T[key] extends CheckSubject<infer R>
            ? R
            : T[key]
};

export type StateFactory<T, U extends (props: Type<T>) => {}> = Type<T> & { create: U }
