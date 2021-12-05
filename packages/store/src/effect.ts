import {
   Emitter,
   inject,
   isValue,
   Service,
   use,
   Value,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { NextEvent, StoreEvent, ToValue } from "./interfaces"
import { Events, getTokenName } from "./utils"
import { filter, map, MonoTypeOperatorFunction, Observable, tap } from "rxjs"
import { Injector, INJECTOR } from "@angular/core"

const tokens = new WeakSet()

export class EffectParams {
   event = (token: ValueToken<any>) => {
      const tokenName = getTokenName(token)
      return this.events.pipe(
         filter(
            (event): event is NextEvent =>
               event.kind === "N" && event.name === tokenName,
         ),
         map((event) => event.current),
      )
   }
   dispatch = <T>(token: ValueToken<Value<T>>): MonoTypeOperatorFunction<T> => {
      const value = this.injector.get(token.Token)
      return (source: Observable<T>) => {
         return source.pipe(
            tap((nextValue) => {
               this.events.next({
                  kind: "N",
                  name: this.name,
                  current: nextValue,
               })
               value(nextValue)
            }),
         )
      }
   }
   constructor(
      private name: string,
      private events: Emitter<StoreEvent>,
      private injector: Injector,
   ) {}
}

export function isEffectToken(token: any) {
   return tokens.has(token)
}

function effect(name: string, factory: (store: EffectParams) => any) {
   return factory(new EffectParams(name, inject(Events), inject(INJECTOR)))
}

function createEffect<TName extends string, TValue>(
   name: TName,
   factory: (store: EffectParams) => TValue,
): ValueToken<TValue> {
   const service = new Service(effect, {
      providedIn: null,
      name,
      arguments: [name, factory],
   })
   const token = new ValueToken(name, {
      factory() {
         const result = inject(service)
         return isValue(result) ? result : use<unknown>(result)
      },
   })
   token.Provider.push(service)
   tokens.add(token)
   return token
}

export type Effect<TValue> = ToValue<TValue>

export interface EffectStatic {
   new <TName extends string, TValue>(
      name: TName,
      factory: (params: EffectParams) => TValue,
   ): ValueToken<Effect<TValue>>
}

export const Effect: EffectStatic = createEffect as any
