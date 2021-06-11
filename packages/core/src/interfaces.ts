import {ErrorHandler, EventEmitter, Injector, Type} from '@angular/core';
import {Notification, Observable, PartialObserver, Subject, Subscribable, Subscription} from 'rxjs';

export interface Check {
    check(): void;
}

export interface Context {
    injector: Injector;
    error: ErrorHandler;
    subscription: Subscription;
    effects: Set<EffectObservers<any>>;
    0: Set<Check>;
    1: Set<Check>;
    2: Set<Check>;
}

export interface ViewFactory {
    <T extends {}>(
        state: () => T,
    ): new () => AsyncState<T>
    <T extends Type<any>, U extends {}>(
        props: T,
        state: (props: InstanceType<T>) => U,
    ): new (...args: T extends new (...args: infer R) => any ? R : void) => InstanceType<T> & AsyncState<U>
}

export type CheckPhase = 0 | 1 | 2;
export type EffectObservers<T> = Subscribable<T>
export type AsyncState<T> = {
    [key in keyof T]: T[key] extends EventEmitter<infer R>
        ? ((value: R) => void)
        : T[key] extends Observable<infer R>
            ? R
            : T[key]
};
