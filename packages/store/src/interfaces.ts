import {
   Emitter,
   Value,
   ValueToken,
   use,
} from "@mmuscat/angular-composition-api"
import { InjectFlags } from "@angular/core"

export interface NextEvent<T = unknown> {
   name: string
   kind: "N"
   value: T
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
   parent: StoreLike[] | null
   events: Emitter<StoreEvent>
   commands: Record<string, Emitter<any>>
   queries: Record<string, Value<any>>
   state: Value<any>
}

export interface StorePlugin {
   (store: StoreLike): any
}

export interface StoreConfig {
   tokens: ValueToken<any>[]
   plugins?: StorePlugin[]
}

export type Inject = <T>(token: ValueToken<T>, injectFlags?: InjectFlags) => T

export const Events = new ValueToken<Emitter<StoreEvent>>("Events", {
   factory() {
      return use(Function)
   },
})
