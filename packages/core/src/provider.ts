import { FactoryProvider, InjectionToken, ɵɵdirectiveInject as inject } from "@angular/core"
import { ProvidedIn } from "./core"

export type ValueToken<T> = InjectionToken<T> & {
   __ng_value_token: true
   Provider: FactoryProvider[]
}

export class EmptyValueError extends Error {
   constructor(token: string) {
      super(`No value or default value provided for "${token}".`)
   }
}

export interface ValueTokenStatic {
   new <T>(name: string): ValueToken<T>
   new <T>(name: string, options?: { factory: () => T }): ValueToken<T>
}

const valueMap = new WeakMap<{}, any>()

function keygen() {
   return {}
}

function createValueToken<T>(name: string): ValueToken<T>
function createValueToken<T>(
   name: string,
   options?: { factory: () => T; providedIn: ProvidedIn },
): ValueToken<T>
function createValueToken(
   name: string,
   options?: { factory: () => any; providedIn: ProvidedIn },
): ValueToken<any> {
   const providedIn = options?.providedIn ?? "root"
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
         if (options?.factory) {
            provide(ValueToken, options.factory())
         } else {
            throw new EmptyValueError(name)
         }
      }
      return valueMap.get(key)
   }

   ValueToken.key = Key
   ValueToken.__ng_value_token = true
   ValueToken.overriddenName = name

   ValueToken.Provider = [
      { provide: ValueToken, useFactory: get },
      { provide: Key, useFactory: keygen },
   ]

   return ValueToken
}

export const ValueToken: ValueTokenStatic = createValueToken as any

export function provide<T>(token: ValueToken<T>, value: T): void {
   const key = inject((<any>token).key) as {}
   valueMap.set(key, value)
}
