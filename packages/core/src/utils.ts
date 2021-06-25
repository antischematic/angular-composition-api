import {BehaviorSubject, NextObserver, PartialObserver, Subscription, SubscriptionLike, Unsubscribable} from "rxjs";
import {EventEmitter} from "@angular/core";

let previous: Set<any>
let deps: Set<any>
let track = false

export function trackDeps<T>(fn: () => T): [T, Set<any>] {
    const flushed = new Set()
    track = true
    previous = deps
    deps = flushed
    const value = fn()
    track = false
    deps = previous
    return [value, flushed]
}

export function computeValue<T>(compute: (value?: T) => T) {
    return trackDeps(compute)
}

export function arrayCompare(a: Set<any>, b: Set<any>) {
    const aArr = [...a]
    const bArr = [...b]
    return aArr.every((v, i) => v === bArr[i])
}

export function get<T>(source: { value: T, subscribe(value: (value: T) => void): SubscriptionLike }): T
export function get<T>(source: { value: T, subscribe(value: PartialObserver<T>): SubscriptionLike }): T
export function get<T>(source: { value: T, subscribe(value: PartialObserver<T> | ((value: T) => void)): SubscriptionLike }): T {
    if (track) {
        deps.add(source)
    }
    return source.value;
}

type ValueOrSetter<T> = T | BehaviorSubject<T> | ((value: T) => T);

export function isObject(value: unknown): value is {} {
    return typeof value === "object" && value !== null
}

export function set<T>(
    source: BehaviorSubject<T>,
    observer?: NextObserver<T> | ((value: T) => void)
): (valueOrSetter: ValueOrSetter<T>) => void {
    return function (value) {
        if (value instanceof Function) {
            source.next(value(source.value))
        } else if (value instanceof BehaviorSubject) {
            source.next(value.value)
        } else {
            source.next(value)
        }
        if (typeof observer === "function") {
            observer(source.value)
        } else if (observer) {
            observer.next(source.value)
        }
    }
}

export function Emitter<T>(async?: boolean): EventEmitter<T> {
    return new EventEmitter<T>(async);
}

export function addSignal(teardown: Unsubscribable | Function, abort: Subscription | AbortSignal) {
    const subscription = new Subscription().add(teardown)
    if (abort instanceof AbortSignal) {
        const listener = () => subscription.unsubscribe()
        abort.addEventListener("abort", listener, {once: true})
    } else {
        abort.add(subscription)
    }
}
