import { inject, Service, ValueToken } from "@mmuscat/angular-composition-api"
import { Events, NextEvent } from "./interfaces"
import { filter, Observable } from "rxjs"

const tokens = new WeakSet()

export function isSagaToken(token: any) {
   return tokens.has(token)
}

function saga(
   name: string,
   factory: (events: (token: ValueToken<any>) => Observable<any>) => any,
) {
   const events = inject(Events)
   function getEvents(type: ValueToken<any>) {
      const name = type.toString().replace(/^InjectionToken /, '')
      return events.pipe(
         filter(
            (event): event is NextEvent =>
               event.kind === "N" && event.name === name,
         ),
      )
   }
   return factory(getEvents)
}

function createSaga<TName extends string, TValue>(
   name: TName,
   factory: (events: (token: ValueToken<any>) => Observable<any>) => TValue,
): ValueToken<TValue> {
   const service = new Service(saga, {
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

export interface SagaStatic {
   new <TName extends string, TValue>(
      name: TName,
      factory: (
         events: <T>(
            type: ValueToken<T>,
         ) => Observable<
            NextEvent<T extends Observable<infer R> ? R : unknown>
         >,
      ) => TValue,
   ): ValueToken<TValue>
}

export const Saga: SagaStatic = createSaga as any
