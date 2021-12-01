import { inject, ValueToken } from "@mmuscat/angular-composition-api"
import { Events, NextEvent } from "./interfaces"
import { filter, Observable } from "rxjs"

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
         events: <T>(type: ValueToken<T>) => Observable<NextEvent<T extends Observable<infer R> ? R : unknown>>,
      ) => TValue,
   ): ValueToken<TValue>
}

export const Saga: SagaStatic = createSaga as any
