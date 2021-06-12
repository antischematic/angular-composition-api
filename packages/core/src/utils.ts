import {BehaviorSubject, Subject} from "rxjs";
import {EventEmitter} from "@angular/core";

export function get<T>(source: BehaviorSubject<T>): T {
    return source.value;
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
        source.next(valueOrSetter.value);
    } else {
        source.next(valueOrSetter);
    }
}

export function replay(source: any) {
    set(source, get(source));
}

export function emit<T>(source: Subject<T | void>) {
    return function () {
        source.next(void 0)
    }
}

export function Emitter<T>(async?: boolean): EventEmitter<T> {
    return new EventEmitter<T>(async);
}
