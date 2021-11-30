import { inject, Value, ValueToken } from "@mmuscat/angular-composition-api"
import { Events, NextEvent } from "./interfaces"
import { filter, map, Observable } from "rxjs"

const tokens = new WeakSet()

export function isSaga(token: any) {
   return tokens.has(token)
}

class SagaFactory {
   factory = () => {
      const events = inject(Events)
      function getEvents(...types: ValueToken<any>[]) {
         const names = types.map((type) => type.toString())
         return events.pipe(
            filter(
               (event): event is NextEvent =>
                  event.kind === "N" && names.includes(event.name),
            ),
            map((event) => event.value),
         )
      }
      return this.createSaga(getEvents)
   }
   constructor(private createSaga: Function) {}
}

function createSaga<TName extends string, TValue>(
   name: TName,
   factory: () => TValue,
): ValueToken<TValue> {
   const token = new ValueToken(name, new SagaFactory(factory))
   tokens.add(token)
   return token
}

export interface SagaStatic {
   new <TName extends string, TValue>(
      name: TName,
      factory: (
         events: <T>(
            type: ValueToken<T>,
         ) => T extends Value<infer R> ? Observable<R> : never,
      ) => TValue,
   ): ValueToken<TValue>
}

export const Saga: SagaStatic = createSaga as any
