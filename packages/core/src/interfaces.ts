import {ErrorHandler, EventEmitter, Injector, Type} from '@angular/core';
import {Notification, Observable, PartialObserver, Subject, Subscribable, Subscription, SubscriptionLike} from 'rxjs';

export const checkPhase = Symbol("checkPhase")

export interface Check {
    check(): boolean;
}

export interface Context {
    injector: Injector;
    error: ErrorHandler;
    subscription: Subscription;
    effects: Set<EffectObservers<any>>;
    0: Set<Check>;
    1: Set<Check>;
    2: Set<Check>;
    3: any
}

export interface ViewFactory {
    <T extends {}>(
        state: () => T,
    ): new () => AsyncState<T>
    <T extends Type<any>, U extends {}>(
        props: T,
        state: (props: InstanceType<T>) => U,
    ): new (...args: T extends new (...args: infer R) => any ? R : void) => AsyncState<InstanceType<T>> & AsyncState<U>
}

export interface CheckSubject<T> {
    readonly [checkPhase]: CheckPhase
    subscribe(...args: any[]): SubscriptionLike
}

export type CheckPhase = 0 | 1 | 2;
export type EffectObservers<T> = Subscribable<T>
export type AsyncState<T> = {
    [key in keyof T]: T[key] extends EventEmitter<infer R>
        ? ((value: R) => void)
        : T[key] extends CheckSubject<infer R>
            ? R
            : T[key]
};
