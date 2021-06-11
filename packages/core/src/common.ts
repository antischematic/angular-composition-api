import {BehaviorSubject, Observable, PartialObserver, Subject, Subscription, TeardownLogic} from 'rxjs';
import {InjectFlags, ProviderToken, QueryList} from '@angular/core';
import {addCheck, addEffect, addTeardown, beginContext, endContext, getContext} from './core';
import {CheckPhase} from './interfaces';
import {CheckSubject, Value} from "./utils";
import {CloakBoundary} from "@mmuscat/angular-error-boundary";

export function Check<T>(
    getter: () => T,
    observer?: Subject<T>,
    phase: CheckPhase = 0
): CheckSubject<T> {
    const subject = new CheckSubject<T>(getter, observer);
    addCheck(phase, subject);
    return subject;
}

export function DoCheck<T>(
    getter: () => T,
    observer?: Subject<T>
): CheckSubject<T> {
    return Check<T>(getter, observer, 0);
}

export function ContentCheck<T>(
    getter: () => T,
    observer?: Subject<T>
): CheckSubject<T> {
    return Check<T>(getter, observer, 1);
}

export function ViewCheck<T>(
    getter: () => T,
    observer?: Subject<T>
): CheckSubject<T> {
    return Check<T>(getter, observer, 2);
}

export function Subscribe<T>(observer: () => TeardownLogic): Subscription;
export function Subscribe<T>(
    source: Observable<T>,
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription;
export function Subscribe<T>(
    source: Observable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription {
    return addEffect(source, observer);
}

export function Suspend<T>(
    source: Observable<T>,
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription {
    const boundary = Inject(CloakBoundary)
    return Subscribe(boundary.cloak(source), observer)
}

export function Query<T extends QueryList<any>>(
    getter: () => T | undefined,
    phase: CheckPhase = 0
): BehaviorSubject<T> {
    const viewCheck = Check(getter, void 0, phase);
    const subject = Value<T>(new QueryList() as T);

    Subscribe(viewCheck, queryList => {
        if (queryList) {
            queryList.changes.subscribe(subject);
            subject.next(queryList);
        }
    });

    return subject;
}

export function ContentQuery<T extends QueryList<any>>(
    getter: () => T | undefined
): BehaviorSubject<T> {
    return Query(getter, 1);
}

export function ViewQuery<T extends QueryList<any>>(
    getter: () => T | undefined
): BehaviorSubject<T> {
    return Query(getter, 2);
}

export function Inject<T>(token: ProviderToken<T>, notFoundValue?: T, flags?: InjectFlags): T {
    const { injector } = getContext();
    const previous = beginContext(void 0);
    const value = injector.get(token, notFoundValue, flags);
    endContext(previous);
    return value
}

