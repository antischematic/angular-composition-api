import {
   inject,
   isValue,
   Service,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { InferValue } from "./interfaces"
import { StoreContext } from "./providers"
import { createDispatcher } from "./utils"

const tokens = new WeakSet()

export function isQueryToken(token: any) {
   return tokens.has(token)
}

function query(name: string, factory: (context: StoreContext) => any) {
   const context = Object.create(inject(StoreContext))
   context.dispatch = createDispatcher(name, context)
   return factory(context)
}

function createQuery<TName extends string, TValue>(
   name: TName,
   factory: (context: StoreContext) => TValue,
): ValueToken<TValue> {
   const service = new Service(query, {
      providedIn: null,
      name,
      arguments: [name, factory],
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
      factory: (context: StoreContext) => TValue,
   ): ValueToken<Query<TName, InferValue<TValue>>>
}

export const Query: QueryStatic = createQuery as any
