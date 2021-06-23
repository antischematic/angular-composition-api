import {PartialObserver, Subject, Subscription, SubscriptionLike, Unsubscribable} from "rxjs";
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

type ValueOrSetter<T> = T | { value: T } | ((value: T) => T);

export function isObject(value: unknown): value is {} {
    return typeof value === "object" && value !== null
}

export function set<T>(
    source: Subject<T>
): (valueOrSetter: ValueOrSetter<T>) => void;
export function set<T>(
    source: Subject<T>,
    valueOrSetter: ValueOrSetter<T>
): void;
export function set(
    source: Subject<unknown>,
    valueOrSetter?: ValueOrSetter<void>
): void | ((valueOrSetter: ValueOrSetter<void>) => void) {
    const currentValue =
        isObject(source) && "value" in source ? source["value"] : void 0;
    if (arguments.length === 1) {
        return set.bind(null, source);
    }
    if (valueOrSetter instanceof Function) {
        source.next(valueOrSetter(currentValue));
    } else if (isObject(valueOrSetter) && "value" in valueOrSetter) {
        source.next(valueOrSetter.value);
    } else {
        source.next(valueOrSetter);
    }
}

export function Emitter<T>(async?: boolean): EventEmitter<T> {
    return new EventEmitter<T>(async);
}

export function addSignal(teardown: Unsubscribable | Function, abort: Subscription | AbortSignal) {
    const subscription = new Subscription().add(teardown)
    if (abort instanceof AbortSignal) {
        const listener = () => subscription.unsubscribe()
        abort.addEventListener("abort", listener, { once: true })
    } else {
        abort.add(subscription)
    }
}
