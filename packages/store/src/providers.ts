import { Emitter, Value, ValueToken } from "@mmuscat/angular-composition-api"
import { Dispatch, NextEvent, StoreEvent, StoreLike } from "./interfaces"
import { getTokenName } from "./utils"
import { filter, map, MonoTypeOperatorFunction, Observable, tap } from "rxjs"
import {
   Inject,
   Injectable,
   InjectionToken,
   Injector,
   Optional,
   SkipSelf,
} from "@angular/core"

@Injectable()
export class StoreContext {
   name!: string
   events!: Emitter<StoreEvent>
   event(token: ValueToken<any>) {
      const tokenName = getTokenName(token)
      return this.events.pipe(
         filter(
            (event): event is NextEvent =>
               event.kind === "N" && event.name === tokenName,
         ),
         map((event) => event.data),
      )
   }

   dispatch<T>(token: Dispatch<T>): void
   dispatch<T>(token: ValueToken<Value<T>>): MonoTypeOperatorFunction<T>
   dispatch<T, U>(
      token: ValueToken<Value<U>>,
      selector: (value: T) => U,
   ): MonoTypeOperatorFunction<T>
   dispatch<T, U>(
      token: ValueToken<Value<T>> | Dispatch<T>,
      selector?: (value: T) => U,
   ): MonoTypeOperatorFunction<T> | void {
      if ("__ng_value_token" in token) {
         const valueToken = token as ValueToken<any>
         const value = this.injector.get(valueToken.Token)
         const tokenName = getTokenName(valueToken)
         return (source: Observable<T>) => {
            return source.pipe(
               tap((val) => {
                  const nextValue = selector ? selector(val) : val
                  this.sendEvent(tokenName, nextValue)
                  value(nextValue)
               }),
            )
         }
      } else {
         const dispatch = token as Dispatch<T>
         this.sendEvent(getTokenName(dispatch.type), dispatch.payload)
      }
   }

   private sendEvent(dispatch: string, payload: any) {
      this.events.next({
         kind: "N",
         name: this.name,
         data: {
            dispatch,
            payload,
         },
      })
   }

   constructor(
      @Inject(ParentStore)
      @SkipSelf()
      @Optional()
      public parent: StoreLike | null,
      private injector: Injector,
   ) {
      this.dispatch = this.dispatch.bind(this)
      this.event = this.event.bind(this)
   }
}

export const ParentStore = new InjectionToken<StoreLike>("ParentStore")
