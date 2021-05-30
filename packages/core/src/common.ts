import {
    AsyncSubject,
    BehaviorSubject,
    Observable,
    PartialObserver,
    ReplaySubject,
    SchedulerLike,
    Subject,
    Subscription,
    TeardownLogic
} from 'rxjs';
import { EventEmitter, QueryList } from '@angular/core';
import { addCheck, addEffect, addTeardown } from './core';
import { CheckPhase } from './interfaces';

export function Async<T>(): AsyncSubject<T> {
    return new AsyncSubject<T>();
}

export function Replay<T>(
    bufferSize?: number,
    windowTime?: number,
    scheduler?: SchedulerLike
): ReplaySubject<T> {
    return new ReplaySubject<T>(bufferSize, windowTime, scheduler);
}

export function Emitter<T>(async?: boolean): EventEmitter<T> {
    return new EventEmitter<T>(async);
}

export function Value<T>(value: T) {
    return new BehaviorSubject(value);
}

export class CheckSubject<T> extends BehaviorSubject<T> {
    check() {
        const value = this.getter();
        if (value !== this.value) {
            super.next(value);
        }
    }
    constructor(public getter: () => T, public observer?: Subject<T>) {
        super(getter());
    }
}

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
) {
    const subscription = new Subscription();
    const effect = new Observable<T>(subscriber => {
        subscription.add(subscriber);
        if (typeof source === 'function') {
            return source();
        } else {
            return source
                .subscribe(subscriber)
                .add(() => subscription.remove(subscriber));
        }
    });
    addEffect(effect, observer);
    addTeardown(subscription);
    return subscription;
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

type ValueOrSetter<T> = T | BehaviorSubject<T> | ((value: any) => T);

export function set<T>(
    source: Subject<T>
): (valueOrSetter: ValueOrSetter<T>) => void;
export function set<T>(
    source: Subject<T>,
    valueOrSetter: ValueOrSetter<T>
): void;
export function set(
    source: Subject<unknown>,
    valueOrSetter?: ValueOrSetter<unknown>
): void | ((valueOrSetter: ValueOrSetter<unknown>) => void) {
    const currentValue =
        source instanceof BehaviorSubject ? source.value : void 0;
    if (arguments.length === 1) {
        return set.bind(null, source);
    }
    if (valueOrSetter instanceof Function) {
        source.next(valueOrSetter(currentValue));
    } else if (valueOrSetter instanceof BehaviorSubject) {
        source.next(currentValue);
    } else {
        source.next(valueOrSetter);
    }
}

export function get<T>(source: BehaviorSubject<T>): T {
    return source.value;
}

export function replay(source: any) {
    set(source, get(source));
}

export function emit<T>(source: Subject<T | void>) {
    return function () {
        source.next(void 0)
    }
}