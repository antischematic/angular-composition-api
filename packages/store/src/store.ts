import { isQueryToken } from "./query"
import { isCommandToken } from "./command"
import {
   AccessorValue,
   combine,
   Emitter,
   inject,
   onError,
   Service,
   subscribe,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { ErrorHandler, InjectFlags, Injector, INJECTOR } from "@angular/core"
import { isEffectToken } from "./effect"
import { StoreConfig, StoreEvent } from "./interfaces"
import { of } from "rxjs"
import { Events, getTokenName } from "./utils"

class EventObserver {
   previousValue?: any
   next(value: any) {
      const { previousValue } = this
      this.previousValue = value
      this.events.emit({
         kind: "N",
         name: this.name,
         current: value,
         previous: previousValue,
      })
   }
   error(error: unknown) {
      this.events.emit({
         kind: "E",
         name: this.name,
         error,
      })
      this.errorHandler.handleError(error)
   }
   complete() {
      this.events.emit({
         kind: "C",
         name: this.name,
      })
   }
   constructor(
      private errorHandler: ErrorHandler,
      private name: string,
      private events: Emitter<StoreEvent>,
   ) {}
}

function store(name: string, config: StoreConfig<ValueToken<any>[]>) {
   const parent = inject(Store, null, InjectFlags.SkipSelf)
   const { tokens, plugins = [] } = config
   const event = inject(Events)
   const errorHandler = inject(ErrorHandler)
   const injector = inject(INJECTOR)
   const query = {} as any
   const command = {} as any
   function get<T>(token: ValueToken<T>, flags?: InjectFlags): T {
      return injector.get(token, Injector.THROW_IF_NOT_FOUND as any, flags)
   }
   for (const token of tokens) {
      const value = get(token)
      const tokenName = getTokenName(token)
      const type = isQueryToken(token) ? 0 : isCommandToken(token) ? 1 : 2
      if (type < 2) {
         subscribe(value, new EventObserver(errorHandler, tokenName, event))
      }
      if (type === 0) {
         query[tokenName] = value
      }
      if (type === 1) {
         command[tokenName] = value
      }
   }
   const state = combine(query)
   const store = {
      name,
      parent,
      event,
      command,
      query,
      state,
      config,
   }
   for (const token of tokens) {
      if (isEffectToken(token)) {
         const tokenName = getTokenName(token)
         const value = get(token)
         onError(value, (error) => {
            event.next({
               name: tokenName,
               kind: "E",
               error: error,
            })
            return of(true)
         })
         subscribe(value)
      }
   }
   for (const plugin of plugins) {
      plugin(store)
   }
   return Object.setPrototypeOf(get, store)
}

function createStore<TName extends string>(
   name: TName,
   config: StoreConfig<ValueToken<any>[]>,
) {
   const StoreService = new Service(store, {
      providedIn: null,
      name,
      arguments: [name, config],
   })
   const Token = new ValueToken(name, {
      providedIn: null,
      factory() {
         return inject(StoreService)
      },
   })
   const storeProvider = {
      provide: Store,
      useExisting: Token,
   }
   Token.Provider = [
      StoreService,
      storeProvider,
      Events.Provider,
      config.tokens.map((Token) => Token.Provider),
   ]
   return Token
}

type Snapshot<T> = {
   [key in keyof T as T[key] extends ValueToken<infer R>
      ? "__query" extends keyof R
         ? R["__query"]
         : never
      : never]: T[key] extends ValueToken<{ value: infer R }> ? R : never
}

type Queries<T> = {
   [key in keyof T as T[key] extends ValueToken<infer R>
      ? "__query" extends keyof R
         ? R["__query"]
         : never
      : never]: T[key] extends ValueToken<infer R> ? R : never
}

type Commands<T> = {
   [key in keyof T as T[key] extends ValueToken<infer R>
      ? "__command" extends keyof R
         ? R["__command"]
         : never
      : never]: T[key] extends ValueToken<infer R> ? R : never
}

export interface Store<TName extends string, TTokens extends readonly any[]> {
   name: TName
   query: Queries<TTokens>
   command: Commands<TTokens>
   event: Emitter<StoreEvent>
   state: AccessorValue<Snapshot<TTokens>, Partial<Snapshot<TTokens>>>
   <T>(token: ValueToken<T>, injectFlags?: InjectFlags): T
   <T>(token: ValueToken<T>, injectFlags?: InjectFlags): T
}

export interface StoreStatic {
   new <
      TName extends string,
      TTokens extends [ValueToken<any>, ...ValueToken<any>[]],
   >(
      name: TName,
      config: StoreConfig<TTokens>,
   ): ValueToken<Store<TName, TTokens>>
}

export const Store: StoreStatic = createStore as any
