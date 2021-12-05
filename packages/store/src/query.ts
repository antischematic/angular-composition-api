import {
   inject,
   isValue,
   Service,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { ToValue } from "./interfaces"

const tokens = new WeakSet()

export function isQueryToken(token: any) {
   return tokens.has(token)
}

function createQuery<TName extends string, TValue>(
   name: TName,
   factory: () => TValue,
): ValueToken<TValue> {
   const service = new Service(factory, {
      providedIn: null,
      name,
   })
   const token = new ValueToken(name, {
      providedIn: null,
      factory() {
         const result = inject(service)
         return isValue(result) ? result : use(result)
      },
   })
   token.Provider.push(service)
   tokens.add(token)
   return token
}

export type Query<TName extends string, TValue> = TValue & {
   readonly __query: TName
}

export interface QueryStatic {
   new <TName extends string, TValue>(
      name: TName,
      factory: () => TValue,
   ): ValueToken<Query<TName, ToValue<TValue>>>
}

export const Query: QueryStatic = createQuery as any
