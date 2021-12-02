import {
   Emitter,
   use,
   Value,
   ValueToken,
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

export const Events = new ValueToken<Emitter<StoreEvent>>("Events", {
   factory() {
      return use(Function)
   },
})
