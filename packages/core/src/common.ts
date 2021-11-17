import {
   isObservable,
   Observable,
   PartialObserver,
   Subscription,
   TeardownLogic,
} from "rxjs"
import {
   ContentChild,
   ContentChildren,
   ElementRef,
   InjectionToken,
   QueryList,
   Renderer2,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import {
   AccessorValue,
   CheckPhase,
   Emitter,
   EmitterWithParams, ErrorState,
   QueryListType,
   QueryType,
   ReadonlyValue,
   UnsubscribeSignal,
   UseOptions,
   Value,
} from "./interfaces"
import {accept, isEmitter, isObject, isObserver, isSignal, isValue} from "./utils"
import { addEffect, addTeardown, inject } from "./core"
import {
   DeferredValue,
   Emitter as EmitterType,
   Value as ValueType,
} from "./types"
import { select } from "./select"

export class QueryListValue extends QueryList<any> {
   subscription?: Subscription
   get value() {
      return this
   }
   next(value: QueryList<any>) {
      this.subscription?.unsubscribe()
      this.reset(value.toArray())
      this.notifyOnChanges()
      this.subscription = value.changes.subscribe(this)
   }
   subscribe(observer: any) {
      accept(observer, this, void 0, "N")
      return this.changes.subscribe(observer)
   }
   complete() {
      this.destroy()
   }
}

const queryMap = new Map<Function, CheckPhase>([
   [ContentChild, 6],
   [ContentChildren, 6],
   [ViewChild, 7],
   [ViewChildren, 7],
])

function isQuery(value: any) {
   return queryMap.has(value)
}

export function use<T>(): Value<T | undefined>
export function use<T>(value: QueryListType): ReadonlyValue<QueryList<T>>
export function use<T>(value: QueryType): ReadonlyValue<T | undefined>
export function use<T>(value: typeof Function): Emitter<T>
export function use<T>(value: Value<T>, options?: UseOptions<T>): Emitter<T>
export function use<T, U>(
   value: AccessorValue<T, U>,
   options?: UseOptions<T>,
): Emitter<T>
export function use<T>(value: ReadonlyValue<T>): never
export function use<T>(value: Emitter<T>): Value<T>
export function use<T>(
   value: Observable<T>,
   options?: UseOptions<T>,
): Value<T | undefined>
export function use<T extends (...args: any) => any>(
   value: EmitterWithParams<T>,
): Value<T>
export function use<T extends (...args: any[]) => any>(
   value: T,
): EmitterWithParams<T>
export function use<T>(value: T, options?: UseOptions<T>): Value<T>
export function use(value?: any, options?: UseOptions<unknown>): unknown {
   if (isQuery(value)) {
      const phase = queryMap.get(value)!
      if (value === ContentChildren || value === ViewChildren) {
         return new DeferredValue(new QueryListValue(), phase)
      }
      return new ValueType(void 0, phase, options)
   }
   if (isValue(value) || typeof value === "function" && !isEmitter(value)) {
      return new EmitterType(value)
   }
   if (isObservable(value)) {
      return new DeferredValue(value, 5, options)
   }
   return new ValueType(value, 5, options)
}

export function subscribe<T>(): Subscription
export function subscribe<T>(observer: () => TeardownLogic): Subscription
export function subscribe<T>(source: Observable<T>): Subscription
export function subscribe<T>(
   source: Observable<T>,
   observer: PartialObserver<T>,
): Subscription
export function subscribe<T>(
   source: Observable<T>,
   observer: (value: T) => TeardownLogic,
): Subscription
export function subscribe<T>(
   source: Observable<T>,
   signal: UnsubscribeSignal,
): Subscription
export function subscribe<T>(
   source: Observable<T>,
   observer: PartialObserver<T> | ((value: T) => TeardownLogic),
   signal: UnsubscribeSignal,
): Subscription
export function subscribe<T>(
   source?: Observable<T> | (() => TeardownLogic),
   observerOrSignal?:
      | PartialObserver<T>
      | ((value: T) => TeardownLogic)
      | UnsubscribeSignal,
   signal?: UnsubscribeSignal,
): Subscription {
   const observer = isObserver(observerOrSignal) ? observerOrSignal : void 0
   signal = isSignal(observerOrSignal) ? observerOrSignal : signal

   if (!source) {
      const subscription = new Subscription()
      addTeardown(subscription)
      return subscription
   }

   return addEffect(source, observer, signal)
}

type ListenerFunction<T> = (event: T) => TeardownLogic

export function listen<T>(eventName: string): Emitter<T>
export function listen<T>(handler: ListenerFunction<T>): Emitter<T>
export function listen<T>(
   eventName: string,
   handler?: ListenerFunction<T>,
): Emitter<T>
export function listen<T>(
   target: unknown,
   eventName: string,
   handler?: ListenerFunction<T>,
): Emitter<T>
export function listen<T>(
   target: Observable<unknown>,
   eventName: string,
   handler?: ListenerFunction<T>,
): Emitter<T>
export function listen() {
   let eventName: string | undefined
   let handler: ListenerFunction<any> | undefined
   let target: unknown
   if (arguments.length === 1) {
      if (typeof arguments[0] === "string") {
         eventName = arguments[0]
      } else {
         handler = arguments[0]
      }
   }
   if (arguments.length === 2) {
      if (typeof arguments[1] === "function") {
         eventName = arguments[0]
         handler = arguments[1]
      } else {
         target = arguments[0]
         eventName = arguments[1]
      }
   }
   if (arguments.length === 3) {
      target = arguments[0]
      eventName = arguments[1]
      handler = arguments[2]
   }
   const emitter = use(Function)
   if (eventName) {
      const renderer = inject(Renderer2)
      if (isObservable(target)) {
         subscribe(target, (element) => {
            if (element) {
               renderer.listen(element, eventName!, emitter)
            }
         })
      } else {
         const element = target ?? inject(ElementRef).nativeElement
         renderer.listen(element, eventName, emitter)
      }
   }
   subscribe(emitter, handler!)
   return emitter
}

export const Attribute = new InjectionToken("Attribute", {
   factory() {
      return function getAttribute(qualifiedName: string) {
         const { nativeElement } = inject<ElementRef<HTMLElement>>(ElementRef)
         return nativeElement.getAttribute(qualifiedName)
      }
   },
})

const noCast = (value: string | null) => value

export function attribute<T>(
   qualifiedName: string,
   cast: (value: string | null) => T,
): Value<T>
export function attribute(qualifiedName: string): Value<string | null>
export function attribute(qualifiedName: string, cast = noCast): unknown {
   const getAttribute = inject(Attribute)
   const attr = getAttribute(qualifiedName)
   const value = use(cast(attr === "" ? qualifiedName : attr))
   return select({
      next(nextValue: any) {
         value(cast(nextValue === "" ? qualifiedName : nextValue))
      },
      value,
   })
}

export function onError(value: Value<any>, handler: (error: unknown) => Observable<any> | void): Value<ErrorState | undefined> {
   const error = use<ErrorState | undefined>()
   const signal = subscribe()
   let retries = 0
   const remove = value.onError((e: any) => {
      error({
         error: e,
         message: e?.message,
         retries,
      })
      const result = handler(error.value)
      if (isObservable(result)) {
         const reviver = use(result)
         let done: any
         const sub = subscribe(reviver, () => {
            done = sub ? sub.unsubscribe() : true
            retries++
            error(void 0)
         }, signal)
         if (done) sub.unsubscribe()
         return reviver
      }
      return
   })
   addTeardown(remove)
   return error
}
