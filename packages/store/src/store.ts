import { isQueryToken, Query } from "./query"
import { isCommandToken } from "./command"
import {
   AccessorValue,
   combine,
   Emitter,
   inject,
   isValue,
   onDestroy,
   onError,
   ReadonlyValue,
   Service,
   subscribe,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import {
   ErrorHandler,
   InjectFlags,
   INJECTOR,
   ProviderToken,
   Type,
} from "@angular/core"
import { isEffectToken } from "./effect"
import { StoreConfig, StoreEvent, StoreLike, StorePlugin } from "./interfaces"
import { isObservable, of } from "rxjs"
import { createDispatcher, getTokenName } from "./utils"
import { StoreContext, StoreEvents } from "./providers"

class EventObserver {
   next(value: any) {
      this.events.emit({
         target: this.id,
         kind: "N",
         name: this.name,
         data: value,
      })
   }
   error(error: unknown) {
      this.events.emit({
         target: this.id,
         kind: "E",
         name: this.name,
         error,
      })
      this.errorHandler.handleError(error)
   }
   complete() {
      this.events.emit({
         target: this.id,
         kind: "C",
         name: this.name,
      })
   }
   constructor(
      private id: number,
      private errorHandler: ErrorHandler,
      private name: string,
      private events: Emitter<StoreEvent>,
   ) {}
}
let uid = 0

function extractTokens(acc: ValueToken<any>[], next: ValueToken<any>) {
   if (isStoreToken(next)) {
      const tokens = next.Provider[next.Provider.length - 1] as any[]
      tokens.reduce(extractTokens, acc)
   } else {
      acc.push(next)
   }
   return acc
}

function handleError(
   value: any,
   events: Emitter<StoreEvent>,
   target: number,
   name: string,
) {
   if (isValue(value)) {
      onError(value, (error) => {
         events.next({
            target,
            name,
            kind: "E",
            error: error,
         })
         return of(true)
      })
   }
}

function store(name: string, tokens: ValueToken<any>[]) {
   const id = uid++
   const plugins = inject(StorePlugin, [])
      .filter((option) => option.for === name)
      .map((option) => option.plugin)
   const events = inject(StoreEvents, void 0, InjectFlags.Self)
   const context = inject(StoreContext)
   const dispatch = createDispatcher(name, context)
   const errorHandler = inject(ErrorHandler)
   const injector = inject(INJECTOR)
   const query = {} as any
   const command = {} as any
   tokens = tokens.reduce(extractTokens, [])
   context.name = name
   context.dispatch = dispatch
   context.id = id
   for (const plugin of plugins) {
      injector.get(plugin).onStoreCreate?.(context)
   }
   for (const token of tokens) {
      const value = injector.get(token.Token)
      const tokenName = getTokenName(token)
      const type = isQueryToken(token) ? 0 : isCommandToken(token) ? 1 : 2
      if (type < 2) {
         subscribe(
            value,
            new EventObserver(id, errorHandler, tokenName, events),
         )
      }
      if (type === 0) {
         query[tokenName] = value
      }
      if (type === 1) {
         command[tokenName] = value
         handleError(value, events, id, tokenName)
      }
   }
   const state = combine(query)
   const store: StoreLike = {
      id,
      name,
      events,
      command,
      query,
      state,
      tokens,
      plugins,
      injector,
      dispatch,
   }
   for (const token of tokens) {
      if (isEffectToken(token)) {
         const tokenName = getTokenName(token)
         let value = injector.get(token.Token)
         if (isObservable(value)) {
            value = isValue(value) ? value : use(value)
            handleError(value, events, id, tokenName)
            subscribe(value)
         }
      }
   }
   for (const plugin of plugins) {
      injector.get(plugin).onStoreInit?.(store)
   }
   onDestroy(() => {
      for (const plugin of plugins) {
         injector.get(plugin).onStoreDestroy?.(store)
      }
   })
   return store
}

const storeTokens = new Set()

function isStoreToken(token: any): token is ValueToken<StoreLike> {
   return storeTokens.has(token)
}

function createStore<TName extends string>(
   name: TName,
   { tokens }: StoreConfig<ValueToken<any>[]>,
) {
   const StoreService = new Service(store, {
      providedIn: null,
      name,
      arguments: [name, tokens],
   })
   const Token = new ValueToken(name, {
      providedIn: null,
      factory() {
         return inject(StoreService)
      },
   })
   Token.Provider.push(
      StoreService,
      StoreEvents.Provider,
      StoreContext as Type<StoreContext>,
      tokens.map((Token) => Token.Provider),
   )
   storeTokens.add(Token)
   return Token
}

type Snapshot<T> = {
   [key in keyof T]: T[key] extends Query<any, ReadonlyValue<infer R>>
      ? R
      : never
}

type ExtractQueries<T> = Exclude<
   {
      [key in keyof T as T[key] extends ValueToken<infer R>
         ? "__query" extends keyof R
            ? R["__query"]
            : never
         : never]: T[key] extends ValueToken<infer R> ? R : never
   },
   any[]
>

type Union<T> = {
   [key in keyof T]: T[key]
}[keyof T]

type ExtractStores<
   T,
   U extends string,
   TResult = Union<
      {
         [key in keyof T as T[key] extends ValueToken<infer R>
            ? U extends keyof R
               ? key
               : never
            : never]: T[key] extends ValueToken<infer R>
            ? U extends keyof R
               ? R[U]
               : never
            : never
      }
   >,
> = [TResult] extends [never] ? {} : TResult

type Queries<T> = ExtractQueries<T>

type ExtractCommands<T> = Exclude<
   {
      [key in keyof T as T[key] extends ValueToken<infer R>
         ? "__command" extends keyof R
            ? R["__command"]
            : never
         : never]: T[key] extends ValueToken<infer R> ? R : never
   },
   any[]
>

type Commands<T> = ExtractCommands<T> & ExtractStores<T, "command">

export interface Store<TName extends string, TTokens extends readonly any[]> {
   name: TName
   query: Queries<TTokens>
   command: Commands<TTokens>
   event: Emitter<StoreEvent>
   state: AccessorValue<
      Snapshot<Queries<TTokens>>,
      Partial<Snapshot<Queries<TTokens>>>
   >
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

export function withPlugins(
   store: ValueToken<StoreLike>,
   plugins: ProviderToken<StorePlugin>[],
) {
   const name = getTokenName(store)
   return [
      store.Provider,
      plugins.map((plugin) => ({
         provide: StorePlugin,
         useValue: {
            for: name,
            plugin,
         },
         multi: true,
      })),
   ]
}
