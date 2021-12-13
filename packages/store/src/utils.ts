import { Emitter, Value, ValueToken } from "@mmuscat/angular-composition-api"
import {Dispatch, Dispatcher, StoreEvent, StoreLike} from "./interfaces"
import { MonoTypeOperatorFunction, Observable } from "rxjs"
import { tap } from "rxjs/operators"
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
   target: number,
   events: Emitter<StoreEvent>,
   name: string,
   dispatch: string,
) {
   events.next({
      target,
      kind: "N",
      name,
      data: {
         dispatch,
      },
   })
}

export function createDispatcher(
   name: string,
   { injector, events, id }: StoreContext,
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
                  sendEvent(id, events, name, tokenName)
                  value(nextValue)
               }),
            )
         }
      } else {
         const dispatch = token as Dispatch<T>
         sendEvent(id, events, name, getTokenName(dispatch.type))
      }
   } as Dispatcher
}
