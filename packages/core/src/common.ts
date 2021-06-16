import {BehaviorSubject, Notification, PartialObserver, Subscription} from 'rxjs';
import {QueryList as NgQueryList} from '@angular/core';
import {checkPhase, CheckPhase, CheckSubject} from './interfaces';
import {Subscribe} from "./core";

export class QueryListObserver {
    next(value: NgQueryList<any>) {
        this.queryList.reset(value.toArray())
        this.queryList.notifyOnChanges()
    }
    complete() {
        this.queryList.destroy()
    }
    constructor(private queryList: QueryListSubject<any>) {}
}

export class QueryListSubject<T> extends NgQueryList<T> implements CheckSubject<QueryListSubject<T>> {
    value!: QueryListSubject<T>
    readonly [checkPhase]: CheckPhase
    private subscription?: Subscription
    next(value: NgQueryList<T>) {
        const observer = new QueryListObserver(this)
        observer.next(value)
        this.subscription?.unsubscribe()
        this.subscription = value.changes.subscribe(observer)
    }

    subscribe(observer: (value: QueryListSubject<T>) => void): Subscription
    subscribe(observer: PartialObserver<QueryListSubject<T>>): Subscription
    subscribe(observer: any): Subscription {
        Notification.createNext(this).accept(observer)
        return this.changes.subscribe(observer)
    }
    constructor(check: CheckPhase, emitDistinctChangesOnly?: boolean) {
        super(emitDistinctChangesOnly);
        this[checkPhase] = check
    }
}

export class ValueSubject<T> extends BehaviorSubject<T> implements CheckSubject<T> {
    private upstreamSubscription?: Subscription
    readonly [checkPhase]: CheckPhase

    unsubscribe() {
        this.upstreamSubscription?.unsubscribe()
        super.unsubscribe();
    }

    constructor(value: T, check: CheckPhase = 0) {
        super(value);
        this[checkPhase] = check
        if (value instanceof BehaviorSubject) {
            this.upstreamSubscription = Subscribe(value, this)
        }
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

export function QueryList<T>(checkContent?: undefined, emitDistinctChangesOnly?: boolean): QueryListSubject<T>
export function QueryList<T>(checkView: false, emitDistinctChangesOnly?: boolean): QueryListSubject<T>
export function QueryList(check?: boolean, emitDistinctChangesOnly?: boolean): QueryListSubject<unknown> {
    return new QueryListSubject(toCheckPhase((check)), emitDistinctChangesOnly)
}

export function Value<T>(): ValueSubject<T | undefined>
export function Value<T>(value: T[]): ValueSubject<T[]>
export function Value<T extends {}>(value: WeakSet<T>): ValueSubject<WeakSet<T>>
export function Value<T>(value: Set<T>): ValueSubject<Set<T>>
export function Value<T extends {}, U>(value: WeakMap<T, U>): ValueSubject<WeakMap<T, U>>
export function Value<T, U>(value: Map<T, U>): ValueSubject<Map<T, U>>
export function Value<T>(value: ValueSubject<T>): ValueSubject<T>
export function Value<T>(value: T): ValueSubject<T>
export function Value(value: unknown = void 0): ValueSubject<any> {
    return new ValueSubject(value)
}
