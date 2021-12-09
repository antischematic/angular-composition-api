import { Emitter, Value, ValueToken } from "@mmuscat/angular-composition-api"
import { Dispatch, Dispatcher, StoreEvent } from "./interfaces"
import { MonoTypeOperatorFunction, Observable, tap } from "rxjs"
import { StoreContext } from "./providers"

function defaultAction<T>(action: Emitter<T>): Emitter<T> {
   return action
}

export function action<T>(): (action: Emitter<T>) => Emitter<T> {
   return defaultAction
}

export function getTokenName(token: ValueToken<any>) {
   return token.toString().replace(/^InjectionToken /, "")
}

function sendEvent(
   events: Emitter<StoreEvent>,
   name: string,
   dispatch: string,
) {
   events.next({
      kind: "N",
      name,
      data: {
         dispatch,
      },
   })
}

export function createDispatcher(
   name: string,
   { injector, events }: StoreContext,
): Dispatcher {
   return function dispatch<T, U>(
      token: ValueToken<Value<T>> | Dispatch<T>,
      selector?: (value: T) => U,
   ): MonoTypeOperatorFunction<T> | void {
      if ("__ng_value_token" in token) {
         const valueToken = token as ValueToken<any>
         const value = injector.get(valueToken.Token)
         const tokenName = getTokenName(valueToken)
         return (source: Observable<T>) => {
            return source.pipe(
               tap((val) => {
                  const nextValue = selector ? selector(val) : val
                  sendEvent(events, name, tokenName)
                  value(nextValue)
               }),
            )
         }
      } else {
         const dispatch = token as Dispatch<T>
         sendEvent(events, name, getTokenName(dispatch.type))
      }
   } as Dispatcher
}
