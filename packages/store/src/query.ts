import { ValueToken } from "@mmuscat/angular-composition-api"

const tokens = new WeakSet()

export function isQueryToken(token: any) {
   return tokens.has(token)
}

function createQuery<TName extends string, TValue>(
   name: TName,
   factory: () => TValue,
): ValueToken<TValue> {
   const token = new ValueToken(name, {
      factory,
   })
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
