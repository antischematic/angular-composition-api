import {Type} from "@angular/core";
import {decorate, State} from "@mmuscat/angular-composition-api";

export function State<T, U>(base: Type<T> & { create?: (base: T) => U}, _ = base = decorate(base)): State<T, U> {
    return base as any
}