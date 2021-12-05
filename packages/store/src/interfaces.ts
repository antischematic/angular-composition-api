import {
   Emitter,
   Value,
   ValueToken,
   DeferredValue,
   ReadonlyValue
} from "@mmuscat/angular-composition-api"
import {Observable} from "rxjs";

export interface NextEvent<T = unknown> {
   name: string
   kind: "N"
   current: T
   previous?: T
}

export interface ErrorEvent {
   name: string
   kind: "E"
   error: unknown
}

export interface CompleteEvent {
   name: string
   kind: "C"
}

export type StoreEvent<T = unknown> = NextEvent<T> | ErrorEvent | CompleteEvent

export interface StoreLike {
   name: string
   parent: StoreLike | null
   event: Emitter<StoreEvent>
   command: Record<string, Emitter<any>>
   query: Record<string, Value<any>>
   state: Value<any>
   config: StoreConfig<any>
}

export interface StorePlugin {
   (store: StoreLike): any
}

export interface StoreConfig<T extends ValueToken<any>[]> {
   tokens: T
   plugins?: StorePlugin[]
}

export interface Action<T, U> extends Observable<T> {
   readonly __ng_emitter: true
   (value: U): void
   next(value: U): void
   emit(value: U): void
}

export type ToValue<TValue> = TValue extends ReadonlyValue<any> ? TValue : DeferredValue<TValue extends Observable<infer R> ? R : never>
