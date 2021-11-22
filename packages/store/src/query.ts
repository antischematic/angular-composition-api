import {Value, ValueToken} from "@mmuscat/angular-composition-api"

export class QueryToken<T> extends ValueToken<T> {}

function createQuery<TName extends string, TValue>(name: TName, factory: () => Value<TValue>): ValueToken<TValue> {
   return new QueryToken(name, {
      factory
   })
}

export const Query = createQuery
