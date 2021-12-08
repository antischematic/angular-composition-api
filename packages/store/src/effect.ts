import { inject, Service, ValueToken } from "@mmuscat/angular-composition-api"
import { StoreContext } from "./providers"

const tokens = new WeakSet()

export function isEffectToken(token: any) {
   return tokens.has(token)
}

function effect(factory: (store: StoreContext) => any) {
   return factory(inject(StoreContext))
}

function createEffect<TName extends string, TValue>(
   name: TName,
   factory: (store: StoreContext) => TValue,
): ValueToken<TValue> {
   const service = new Service(effect, {
      providedIn: null,
      name,
      arguments: [factory],
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
