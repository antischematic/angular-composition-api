import { inject, Service, ValueToken } from "@mmuscat/angular-composition-api"
import { StoreContext } from "./providers"
import { createDispatcher } from "./utils"

const tokens = new WeakSet()

export function isEffectToken(token: any) {
   return tokens.has(token)
}

function effect(name: string, factory: (store: StoreContext) => any) {
   const context = Object.create(inject(StoreContext))
   context.dispatch = createDispatcher(name, context)
   return factory(context)
}

function createEffect<TName extends string, TValue>(
   name: TName,
   factory: (store: StoreContext) => TValue,
): ValueToken<TValue> {
   const service = new Service(effect, {
      providedIn: null,
      name,
      arguments: [name, factory],
   })
   const token = new ValueToken(name, {
      factory() {
         return inject(service)
      },
   })
   token.Provider.push(service)
   tokens.add(token)
   return token
}

export interface EffectStatic {
   new <TName extends string, TValue>(
      name: TName,
      factory: (params: StoreContext) => TValue,
   ): ValueToken<TValue>
}

export const Effect: EffectStatic = createEffect as any
