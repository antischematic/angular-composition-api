import { InjectFlags, InjectionToken, Injector, Provider } from "@angular/core"
import { inject, ProvidedIn } from "./core"

export type ValueToken<T> = InjectionToken<T> & {
   __ng_value_token: true
   Provider: Provider[]
   Token: InjectionToken<T>
}

export class EmptyValueError extends Error {
   constructor(token: string) {
      super(`No value or default value provided for "${token}".`)
   }
}

export interface ValueTokenStatic {
   new <T>(name: string): ValueToken<T>
   new <T>(
      name: string,
      options?: {
         providedIn?: ProvidedIn
         factory: () => T
      },
   ): ValueToken<T>
}

const valueMap = new WeakMap<{}, any>()

function keygen() {
   return {}
}

function createValueToken<T>(name: string): ValueToken<T>
function createValueToken<T>(
   name: string,
   options?: { factory?: () => T; providedIn?: ProvidedIn },
): ValueToken<T>
function createValueToken(
   name: string,
   {
      providedIn = "root",
      factory,
   }: { factory?: () => any; providedIn?: ProvidedIn } = {},
): ValueToken<any> {
   const ValueToken = new InjectionToken(name, {
      factory: get,
      providedIn,
   }) as any
   const Key = new InjectionToken(`keygen:${name}`, {
      factory: keygen,
      providedIn,
   })

   function get() {
      const key = inject(Key)
      if (!valueMap.has(key)) {
         if (factory) {
            provide(ValueToken, factory())
         } else {
            throw new EmptyValueError(name)
         }
      }
      return valueMap.get(key)
   }

   ValueToken.key = Key
   ValueToken.__ng_value_token = true
   ValueToken.overriddenName = name

   ValueToken.Token = ValueToken

   ValueToken.Provider = [
      { provide: ValueToken, useFactory: get },
      { provide: Key, useFactory: keygen },
   ]

   return ValueToken
}

export const ValueToken: ValueTokenStatic = createValueToken as any

export function provide<T>(token: ValueToken<T>, value: T): void {
   const key = inject(
      (<any>token).key,
      Injector.THROW_IF_NOT_FOUND,
      InjectFlags.Self,
   ) as {}
   valueMap.set(key, value)
}
