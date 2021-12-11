import {
   DeferredValue,
   Emitter,
   ReadonlyValue,
   Value,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { MonoTypeOperatorFunction, Observable } from "rxjs"
import {InjectionToken, Injector, ProviderToken} from "@angular/core"
import { StoreContext } from "./providers"

export interface NextEvent {
   name: string
   kind: "N"
   data: unknown
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

export type StoreEvent = NextEvent | ErrorEvent | CompleteEvent

export interface StoreLike {
   id: number
   name: string
   parent: StoreLike | null
   events: Emitter<StoreEvent>
   command: Record<string, Emitter<any>>
   query: Record<string, Value<any>>
   state: Value<any>
   plugins: ProviderToken<StorePlugin>[]
   tokens: ValueToken<any>[]
   dispatch: Dispatcher
   injector: Injector
}

export interface StorePlugin {
   onStoreCreate?(store: StoreContext): void
   onStoreInit?(store: StoreLike): void
   onStoreDestroy?(store: StoreLike): void
}

export interface StorePluginOptions {
   for: string
   plugin: ProviderToken<StorePlugin>
}

export const StorePlugin = new InjectionToken<StorePluginOptions[]>(
   "StorePlugin",
)

export interface StoreConfig<T extends ValueToken<any>[]> {
   tokens: T
   primary?: boolean
}

export interface Action<T, U> extends Observable<T> {
   readonly __ng_emitter: true
   (value: U): void
   next(value: U): void
   emit(value: U): void
}

export type InferValue<TValue> = TValue extends ReadonlyValue<any>
   ? TValue
   : DeferredValue<TValue extends Observable<infer R> ? R : never>

export type Dispatch<T> = T extends Observable<infer R>
   ? R extends void
      ? {
           type: ValueToken<T>
           payload?: void
        }
      : {
           type: ValueToken<T>
           payload: R
        }
   : never

export interface Dispatcher {
   <T>(token: Dispatch<T>): void
   <T>(token: ValueToken<Value<T>>): MonoTypeOperatorFunction<T>
   <T, U>(
      token: ValueToken<Value<U>>,
      selector: (value: T) => U,
   ): MonoTypeOperatorFunction<T>
}
