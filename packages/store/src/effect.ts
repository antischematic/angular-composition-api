import { inject, Service, ValueToken } from "@mmuscat/angular-composition-api"
import { Events, NextEvent, StoreLike } from "./interfaces"
import { filter, Observable } from "rxjs"

const tokens = new WeakSet()

export function isEffectToken(token: any) {
   return tokens.has(token)
}

function effect(
   name: string,
   factory: (store: StoreLike) => any,
) {
   return (store: StoreLike) => factory(store)
}

function createEffect<TName extends string, TValue>(
   name: TName,
   factory: (store: StoreLike) => TValue,
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
      factory: (store: StoreLike) => TValue,
   ): ValueToken<TValue>
}

export const Effect: EffectStatic = createEffect as any
