import { ErrorHandler, EventEmitter, Injector, Type } from '@angular/core';
import { Notification, Observable, PartialObserver, Subscription } from 'rxjs';

export interface Check {
    check(): void;
}

export interface Context {
    injector: Injector;
    error: ErrorHandler;
    subscription: Subscription;
    effects: Map<any, EffectObservers<any>>;
    0: Set<Check>;
    1: Set<Check>;
    2: Set<Check>;
}

export interface ViewFactory {
    <T extends {}, U extends {}>(
        state: (props: T) => U,
    ): new () => T & AsyncState<U>
    <T extends {}, U extends {}>(
        props: Type<T>,
        state: (props: T) => U,
    ): new () => T & AsyncState<U>
}

export type CheckPhase = 0 | 1 | 2;
export type EffectObservers<T> = Set<
    | PartialObserver<T | Notification<T>>
    | ((value: T | Notification<T>) => void)
    | undefined
    >;
export type AsyncState<T> = {
    [key in keyof T]: T[key] extends EventEmitter<infer R>
        ? ((value: R) => void)
        : T[key] extends Observable<infer R>
            ? R
            : T[key]
};
