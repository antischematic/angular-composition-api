import { inject, Service, ValueToken } from "@mmuscat/angular-composition-api"

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
         return inject(service)
      },
   })
   token.Provider.push(service)
   tokens.add(token)
   return token
}

export interface QueryStatic {
   new <TName extends string, TValue>(
      name: TName,
      factory: () => TValue,
   ): ValueToken<TValue>
}

export const Query: QueryStatic = createQuery as any
