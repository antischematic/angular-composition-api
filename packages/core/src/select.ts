import {BehaviorSubject, Observable, PartialObserver} from "rxjs";
import {Subscription} from "rxjs/internal/Subscription";
import {ComputedSubject} from "./core";
import {ValueSubject} from "./common";

class SelectObserver {
    next(value: any) {
        value = this.subject.selector ? this.subject.selector(value) : value
        if (this.subject.value !== value) {
            this.subject.next(value)
        }
    }
    error(error: unknown) {
        this.subject.error(error)
    }
    complete() {
        this.subject.complete()
    }
    constructor(private subject: SelectSubject<any, any>) {}
}

class SelectSubject<T, U> extends ValueSubject<U | undefined> {
    refs: number
    source: Observable<T>
    selector?: (value: T) => U
    subscription?: Subscription
    subscribe(): Subscription
    subscribe(observer: (value: U) => void): Subscription
    subscribe(observer: PartialObserver<U>): Subscription
    subscribe(observer?: any): Subscription {
        if (this.refs === 0) {
            this.subscription = this.source.subscribe(new SelectObserver(this))
        }
        this.refs++
        return super.subscribe(observer).add(() => {
            this.refs--
            if (this.refs === 0) {
                this.subscription?.unsubscribe()
            }
        })
    }

    constructor(source: Observable<T> | BehaviorSubject<T>, selector?: ((value?: T) => U), initialValue?: any) {
        if ("value" in source) {
            initialValue = typeof selector === "function" ? selector(source.value) : source.value
        } else {
            initialValue = typeof selector === "function" ? initialValue : selector
        }
        super(initialValue)
        this.source = source
        this.selector = selector
        this.refs = 0
    }
}

export function Select<T>(source: (() => T)): ValueSubject<T>
export function Select<T>(source: BehaviorSubject<T>): ValueSubject<T>
export function Select<T, U>(source: BehaviorSubject<T>, selector: (value: T) => U): ValueSubject<U>
export function Select<T>(source: Observable<T>): ValueSubject<T | undefined>
export function Select<T, U>(source: Observable<T>, initialValue: U): ValueSubject<T | U>
export function Select<T, U>(source: Observable<T>, selector: (value: T) => U): ValueSubject<U | undefined>
export function Select<T, U, V>(source: Observable<T>, selector: (value: T) => U, initialValue: V): ValueSubject<U | V>
export function Select<T, U>(source: Observable<T> | (() => U), selector?: (value: T) => U): ValueSubject<U> {
    if (typeof source === "function") {
        return new ComputedSubject(source)
    }
    return new SelectSubject<any, any>(source, selector)
}
