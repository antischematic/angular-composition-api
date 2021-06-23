import {Inject, Subscribe} from "@mmuscat/angular-composition-api";
import {ErrorHandler} from "@angular/core";
import {Effect, EffectHandler, StoreSubject, subscribe} from "./store";
import {BehaviorSubject} from "rxjs";

export function UseEffects<T extends StoreSubject<any>, U extends Effect<any, EffectHandler<T extends StoreSubject<any, infer R> ? BehaviorSubject<R> : BehaviorSubject<unknown>, any>>[]>(store: T, effects: U) {
    const cleanup = Subscribe()
    const errorHandler = Inject(ErrorHandler)

    subscribe(store, effects, errorHandler, cleanup)

    return cleanup
}
