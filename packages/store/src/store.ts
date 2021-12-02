import { isQueryToken, Query } from "./query"
import { Command, isCommandToken } from "./command"
import {
   AccessorValue,
   combine,
   Emitter,
   inject, ReadonlyValue,
   Service,
   subscribe, use, Value,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { ErrorHandler, InjectFlags, InjectionToken, Injector, INJECTOR } from "@angular/core"
import { isSagaToken } from "./saga"
import { Events, StoreConfig, StoreEvent } from "./interfaces"

class EventEmitter {
   next(value: any) {
      this.events.emit({
         kind: "N",
         name: this.name,
         value,
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
      const tokenName = token.toString().replace(/^InjectionToken /, '')
      // noinspection SuspiciousTypeOfGuard
      const type = isQueryToken(token)
         ? 1
         : isCommandToken(token)
         ? 2
         : isSagaToken(token)
         ? 3
         : 0
      if (type > 0) {
         subscribe(value, new EventEmitter(errorHandler, tokenName, event))
      }
      if (type === 1) {
         query[tokenName] = value
      }
      if (type === 2) {
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
   }
   for (const plugin of plugins) {
      plugin(store)
   }
   return Object.setPrototypeOf(get, store)
}

function createStore<TName extends string>(name: TName, config: StoreConfig<ValueToken<any>[]>) {
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
   [key in keyof T as T[key] extends ValueToken<infer K> ? K extends Query<infer S, any> ? "__query" extends keyof K ? K["__query"] : never : never : never]: T[key] extends ValueToken<Value<infer R>> ? R : never
}

type Queries<T> = Exclude<{
   [key in keyof T as T[key] extends ValueToken<infer K> ? K extends Query<infer S, any> ? "__query" extends keyof K ? K["__query"] : never : never : never]: T[key] extends ValueToken<infer R> ? R : never
}, any[]>

type Commands<T> = Exclude<{
   [key in keyof T as T[key] extends ValueToken<infer K> ? K extends Command<infer S, any> ? "__command" extends keyof K ? K["__command"] : never : never : never]: T[key] extends ValueToken<infer R> ? R : never
}, any[]>

export interface Store<TName extends string, TTokens extends [ValueToken<any>, ...ValueToken<any>[]]> {
   name: TName
   query: Queries<TTokens>
   command: Commands<TTokens>
   event: Emitter<StoreEvent>
   state: AccessorValue<Snapshot<TTokens>, Partial<Snapshot<TTokens>>>
   <T>(token: ValueToken<T>, injectFlags?: InjectFlags): T
   <T>(token: ValueToken<T>, injectFlags?: InjectFlags): T
}

export interface StoreStatic {
   new <TName extends string, TTokens extends [ValueToken<any>, ...ValueToken<any>[]]>(name: TName, config: StoreConfig<TTokens>): ValueToken<Store<TName, TTokens>>
}

export const Store: StoreStatic = createStore as any

export function getState() {}
