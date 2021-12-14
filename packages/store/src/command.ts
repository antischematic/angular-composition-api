import {
   Accessor,
   Emitter,
   inject,
   isEmitter,
   noCheck,
   select,
   Service,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { Observable, Subject } from "rxjs"
import { Action } from "./interfaces"
import { StoreContext } from "./providers"
import { createDispatcher } from "./utils"

const tokens = new WeakSet()

export function isCommandToken(token: any) {
   return tokens.has(token)
}

export function action<T, U>(accessor: Accessor<T, U>): Action<T, U>
export function action(source: Accessor<any, any>): unknown {
   const emitter = select(source, {
      immediate: false,
      subject: new Subject(),
   })
   return noCheck(emitter)
}

function command(
   name: string,
   factory: (emitter: Emitter<any>, context: StoreContext) => any,
) {
   const context = Object.create(inject(StoreContext))
   context.dispatch = createDispatcher(name, context)
   const emitter = use(Function)
   const value = factory(emitter, context)
   if (isEmitter(value)) {
      return value
   }
   return action({
      next: emitter,
      value,
   })
}

function createCommand<TName extends string, TArgs, TValue>(
   name: TName,
   factory?: (emitter: Emitter<TArgs>, context: StoreContext) => TValue,
): ValueToken<Command<TName, Action<TValue, TArgs>>> {
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
   readonly __command: TName
}

export interface CommandStatic {
   new <TName extends string, TArgs, TValue>(
      name: TName,
      factory: (
         emitter: Emitter<TArgs>,
         context: StoreContext,
      ) => Observable<TValue>,
   ): ValueToken<Command<TName, Action<TValue, TArgs>>>
}

export const Command: CommandStatic = createCommand as any
