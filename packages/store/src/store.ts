import {QueryToken} from "./query"
import {CommandToken} from "./command"
import {
   combine,
   Emitter,
   inject,
   subscribe,
   use,
   Value,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import {ErrorHandler, InjectFlags, INJECTOR, Injector} from "@angular/core"

interface NextEvent {
   name: string
   kind: "N"
   value: unknown
}

interface ErrorEvent {
   name: string
   kind: "E"
   error: unknown
}

interface CompleteEvent {
   name: string
   kind: "C"
}

type StoreEvent = NextEvent | ErrorEvent | CompleteEvent

interface Store {
   parent: Store[] | null,
   events: Emitter<StoreEvent>
   commands: Record<string, Emitter<any>>
   queries: Record<string, Value<any>>
   state: Value<any>
}

interface StorePlugin {
   (store: Store): any
}

interface StoreConfig {
   tokens: ValueToken<any>[]
   plugins: StorePlugin[]
}

type Inject = <T>(token: ValueToken<T>) => T

export class StoreToken extends ValueToken<Inject> {}

class EventEmitter {
   next(value: any) {
      this.events.emit({
         kind: "N",
         name: this.name,
         value
      })
   }
   error(error: unknown) {
      this.events.emit({
         kind: "E",
         name: this.name,
         error
      })
      this.errorHandler.handleError(error)
   }
   complete() {
      this.events.emit({
         kind: "C",
         name: this.name
      })
   }
   constructor(private errorHandler: ErrorHandler, private name: string, private events: Emitter<StoreEvent>) {}
}

class StoreFactory {
   factory() {
      const parent = inject(Store, null, InjectFlags.SkipSelf)
      const { tokens, plugins = [] } = this.config
      const events = use<StoreEvent>(Function)
      const parentInjector = inject(INJECTOR)
      const errorHandler = inject(ErrorHandler)
      const injector = Injector.create({
         parent: parentInjector,
         providers: tokens.map((token) => token.Provider),
      })
      const queries = {} as any
      const commands = {} as any
      function get<T>(token: ValueToken<T>): T {
         return injector.get(token)
      }
      for (const token of tokens) {
         const value = get(token)
         const tokenName = token.toString()
         // noinspection SuspiciousTypeOfGuard
         const type = token instanceof QueryToken ? 1 : token instanceof CommandToken ? 2 : 0
         if (type > 0) {
            subscribe(value, new EventEmitter(errorHandler, tokenName, events))
         }
         if (type === 1) {
            queries[tokenName] = value
         }
         if (type === 2) {
            commands[tokenName] = value
         }
      }
      const state = combine(queries)
      const store = {
         parent,
         events,
         commands,
         queries,
         state
      }
      for (const plugin of plugins) {
         plugin(store)
      }
      return get
   }
   constructor(private name: string, private config: StoreConfig) {
      this.factory = this.factory.bind(this)
   }
}

function createStore<TName extends string>(
   name: TName,
   config: StoreConfig,
) {
   const Token = new StoreToken(name, new StoreFactory(name, config))
   Token.Provider.push({
      provide: Store,
      useExisting: Token,
      multi: true
   })
}

export const Store = createStore
