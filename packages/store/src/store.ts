import { isQueryToken } from "./query"
import { isCommandToken } from "./command"
import {
   combine,
   Emitter,
   inject,
   Service,
   subscribe,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import {
   ErrorHandler,
   InjectFlags,
   Injector,
   INJECTOR,
   Type,
} from "@angular/core"
import { isSaga } from "./saga"
import { Events, Inject, StoreConfig, StoreEvent } from "./interfaces"

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

function store(name: string, config: StoreConfig) {
   const parent = inject(Store, null, InjectFlags.SkipSelf)
   const { tokens, plugins = [] } = config
   const events = inject(Events)
   const errorHandler = inject(ErrorHandler)
   const injector = inject(INJECTOR)
   const queries = {} as any
   const commands = {} as any
   function get<T>(token: ValueToken<T>, flags?: InjectFlags): T {
      return injector.get(token, Injector.THROW_IF_NOT_FOUND as any, flags)
   }
   for (const token of tokens) {
      const value = get(token)
      const tokenName = token.toString()
      // noinspection SuspiciousTypeOfGuard
      const type = isQueryToken(token)
         ? 1
         : isCommandToken(token)
         ? 2
         : isSaga(token)
         ? 3
         : 0
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
      name,
      parent,
      events,
      commands,
      queries,
      state,
   }
   for (const plugin of plugins) {
      plugin(store)
   }
   return get
}

function createStore<TName extends string>(name: TName, config: StoreConfig) {
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

export interface StoreStatic {
   new <T extends string>(name: T, config: StoreConfig): ValueToken<Inject>
}

export const Store: StoreStatic = createStore as any
