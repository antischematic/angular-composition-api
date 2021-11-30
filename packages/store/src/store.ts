import { isQueryToken } from "./query"
import { isCommandToken } from "./command"
import {
   combine,
   Emitter,
   inject,
   subscribe,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { ErrorHandler, InjectFlags, Injector, INJECTOR } from "@angular/core"
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

class StoreFactory {
   factory = () => {
      const parent = inject(Store, null, InjectFlags.SkipSelf)
      const { tokens, plugins = [] } = this.config
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
   constructor(private name: string, private config: StoreConfig) {}
}

function createStore<TName extends string>(name: TName, config: StoreConfig) {
   const Token = new ValueToken(name, new StoreFactory(name, config))
   const store = {
      provide: Store,
      useExisting: Token,
   }
   Token.Provider = [
      store,
      Events.Provider,
      config.tokens.map((Token) => Token.Provider),
   ]
   return Token
}

export interface StoreStatic {
   new <T extends string>(name: T, config: StoreConfig): ValueToken<Inject>
}

export const Store: StoreStatic = createStore as any
