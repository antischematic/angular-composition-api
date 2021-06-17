import {Observable} from "rxjs";
import {Subscription} from "rxjs/internal/Subscription";
import {distinctUntilChanged, map} from "rxjs/operators";
import {ComputedSubject, Inject} from "./core";
import {Type} from "@angular/core";
import {ValueSubject} from "./common";

class SelectSubject<T, U> extends ValueSubject<U> {
    source: Observable<U>
    subscription?: Subscription
    subscribe(observer: any) {
        if (this.observers.length === 0) {
            this.subscription = this.source.subscribe(this)
        }
        return super.subscribe(observer).add(() => {
            if (this.observers.length === 0) {
                this.subscription?.unsubscribe()
            }
        })
    }

    constructor(source: Observable<T>, selector: (value?: T) => U = ((value: any) => value)) {
        super(selector((<any>source).value))
        this.source = source.pipe(
            map(selector),
            distinctUntilChanged()
        )
    }
}

export function Select<T>(source: (() => T)): ValueSubject<T>
export function Select<T>(source: Type<Observable<T>>): ValueSubject<T>
export function Select<T, U>(source: Type<Observable<T>>, selector: (value: T) => U): ValueSubject<U>
export function Select<T>(source: Observable<T>): ValueSubject<T>
export function Select<T, U>(source: Observable<T>, selector: (value: T) => U): ValueSubject<U>
export function Select<T, U>(source: Observable<T> | Type<any> | (() => U), selector?: (value: T) => U): ValueSubject<U> {
    if (typeof source === "function") {
        const value = Inject(source, source)
        if (typeof value === "function") {
            return new ComputedSubject(value)
        }
        source = value
    }
    return new SelectSubject<any, any>(source as Observable<T>, selector)
}
