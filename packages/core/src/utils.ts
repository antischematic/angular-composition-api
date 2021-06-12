import {Subject} from "rxjs";
import {EventEmitter} from "@angular/core";

export function get<T>(source: { value: T }): T {
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
