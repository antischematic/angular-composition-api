import { isQueryToken } from "./query"
import { isCommandToken } from "./command"
import {
   AccessorValue,
   combine,
   Emitter,
   inject,
   isValue,
   onError,
   Service,
   subscribe,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { ErrorHandler, InjectFlags, INJECTOR } from "@angular/core"
import { isEffectToken } from "./effect"
import { StoreConfig, StoreEvent, StoreLike } from "./interfaces"
import { isObservable, of } from "rxjs"
import { getTokenName } from "./utils"
import { ParentStore, StoreContext } from "./providers"

class EventObserver {
   next(value: any) {
      this.events.emit({
         kind: "N",
         name: this.name,
         data: value,
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
   const { tokens, plugins = [] } = config
   const context = inject(StoreContext)
   const events = use<StoreEvent>(Function)
   const errorHandler = inject(ErrorHandler)
   const injector = inject(INJECTOR)
   const query = {} as any
   const command = {} as any
   context.name = name
   context.events = events
   for (const plugin of plugins) {
      injector.get(plugin).create?.(context)
   }
   for (const token of tokens) {
      const value = injector.get(token.Token)
      const tokenName = getTokenName(token)
      const type = isQueryToken(token) ? 0 : isCommandToken(token) ? 1 : 2
      if (type < 2) {
         subscribe(value, new EventObserver(errorHandler, tokenName, events))
      }
      if (type === 0) {
         query[tokenName] = value
      }
      if (type === 1) {
         command[tokenName] = value
      }
   }
   const state = combine(query)
   const store: StoreLike = {
      name,
      events,
      command,
      query,
      state,
      config,
      injector,
      dispatch: context.dispatch,
      parent: context.parent,
   }
   for (const token of tokens) {
      if (isEffectToken(token)) {
         const tokenName = getTokenName(token)
         let value = injector.get(token.Token)
         if (isObservable(value)) {
            value = isValue(value) ? value : use(value)
            onError(value, (error) => {
               events.next({
                  name: tokenName,
                  kind: "E",
                  error: error,
               })
               return of(true)
            })
            subscribe(value)
         }
      }
   }
   for (const plugin of plugins) {
      injector.get(plugin).onStoreInit?.(store)
   }
   return store
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
      provide: ParentStore,
      useExisting: Token,
   }
   Token.Provider = [
      StoreService,
      storeProvider,
      StoreContext,
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
