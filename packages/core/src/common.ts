import {
    BehaviorSubject,
    Notification,
    Observable,
    PartialObserver,
    Subscription,
    SubscriptionLike,
    TeardownLogic
} from 'rxjs';
import {QueryList as NgQueryList} from '@angular/core';
import {addEffect, checkPhase} from './core';
import {CheckPhase} from './interfaces';

export class QueryListObserver {
    next(value: any) {
        this.call(Notification.createNext(value))
    }
    error(error: unknown) {
        this.call(Notification.createError(error))
    }
    complete() {
        this.call(Notification.createComplete())
        this.queryList.destroy()
        this.queryList.observers.length = 0
    }
    call(notification: Notification<any>) {
        for (const observer of this.queryList.observers) {
            notification.accept(observer)
        }
    }
    constructor(private queryList: QueryListSubject<any>) {}
}

export class QueryListSubject<T> extends NgQueryList<T> {
    [checkPhase]: CheckPhase
    observers: (PartialObserver<NgQueryList<T>> | ((value: NgQueryList<T>) => void))[] = []
    private subscription?: Subscription
    next(value: NgQueryList<T>) {
        this.subscription?.unsubscribe()
        this.subscription = value.changes.subscribe(new QueryListObserver(this))
        this.reset(value.toArray())
        this.notifyOnChanges()
    }

    subscribe(observer?: PartialObserver<NgQueryList<T>> | ((value: NgQueryList<T>) => void)): SubscriptionLike {
        if (observer) {
            this.observers.push(observer)
            Notification.createNext(this).accept(observer)
        }
        return new Subscription().add(() => {
            if (observer) {
                this.observers.splice(this.observers.indexOf(observer), 1)
            }
        })
    }
    constructor(check: CheckPhase, emitDistinctChangesOnly?: boolean) {
        super(emitDistinctChangesOnly);
        this[checkPhase] = check
    }
}

export class ValueSubject<T> extends BehaviorSubject<T> {
    [checkPhase]: CheckPhase
    constructor(value: T, check: CheckPhase = 0) {
        super(value);
        this[checkPhase] = check
    }
}

function toCheckPhase(value?: boolean): CheckPhase {
    return value === undefined ? 1 : value ? 0 : 2
}

export function Query<T>(checkStatic: true): ValueSubject<T | undefined>
export function Query<T>(checkContent?: undefined): ValueSubject<T | undefined>
export function Query<T>(checkView: false): ValueSubject<T | undefined>
export function Query<T>(check?: boolean): ValueSubject<any> {
    return new ValueSubject(void 0, toCheckPhase(check))
}

export function QueryList<T>(checkContent?: true, emitDistinctChangesOnly?: boolean): QueryListSubject<T>
export function QueryList<T>(checkView: true, emitDistinctChangesOnly?: boolean): QueryListSubject<T>
export function QueryList(check?: boolean, emitDistinctChangesOnly?: boolean): QueryListSubject<unknown> {
    return new QueryListSubject(toCheckPhase((check)), emitDistinctChangesOnly)
}

export function Value<T>(value: T): ValueSubject<T> {
    return new ValueSubject(value)
}

export function Subscribe<T>(observer: () => TeardownLogic): Subscription;
export function Subscribe<T>(
    source: Observable<T>,
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): SubscriptionLike;
export function Subscribe<T>(
    source: Observable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): SubscriptionLike {
    return addEffect(source, observer);
}
