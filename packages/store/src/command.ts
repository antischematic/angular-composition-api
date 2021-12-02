import {
   AsyncEmitter,
   async,
   Emitter,
   inject,
   isEmitter,
   isValue,
   Service,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { Observable } from "rxjs"

const tokens = new WeakSet()

export function isCommandToken(token: any) {
   return tokens.has(token)
}

function command(name: string, factory: (emitter: Emitter<any>) => any) {
   const emitter = use(Function)
   if (factory) {
      const result = factory(emitter)
      if (isEmitter(result)) {
         return result
      }
      return async({
         next: emitter,
         value: isValue(result) ? result : use(result),
      })
   }
   return emitter
}

function createCommand<TName extends string, TArgs, TValue>(
   name: TName,
   factory?: (emitter: Emitter<TArgs>) => TValue,
): ValueToken<Command<TName, AsyncEmitter<TValue, TArgs>>> {
   const service = new Service(command, {
      providedIn: null,
      name,
      arguments: [name, factory],
   })
   const token = new ValueToken(name, {
      providedIn: null,
      factory() {
         return inject(service)
      },
   })
   token.Provider.push(service)
   tokens.add(token)
   return token
}

export type Command<TName, TEmitter> = TEmitter & {
   __command: TName
}

export interface CommandStatic {
   new <TName extends string, TArgs, TValue>(
      name: TName,
      factory: (emitter: Emitter<TArgs>) => Observable<TValue>,
   ): ValueToken<Command<TName, AsyncEmitter<TValue, TArgs>>>
}

export const Command: CommandStatic = createCommand as any
