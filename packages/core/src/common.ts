import {
   BehaviorSubject,
   isObservable, Observable,
   PartialObserver,
   Subject,
   Subscribable,
   Subscription,
   TeardownLogic,
} from "rxjs"
import {
   ContentChild,
   ContentChildren,
   QueryList,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import {
   AccessorValue,
   CheckPhase,
   Emitter,
   EmitterWithParams,
   QueryListType,
   QueryType,
   ReadonlyValue,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import {
   isObserver,
   isSignal,
   isValue,
   Notification,
   observeNotification,
} from "./utils"
import { addEffect, addTeardown } from "./core"
import {
   DeferredValue,
   Emitter as EmitterType,
   Value as ValueType,
} from "./types"

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
      observeNotification(Notification.createNext(this), observer)
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
export function use<T>(value: Value<T>): Emitter<T>
export function use<T>(value: BehaviorSubject<T>): Value<T>
export function use<T>(value: Subject<T>): Value<T | undefined>
export function use<T, U>(value: AccessorValue<T, U>): Emitter<T>
export function use<T>(value: ReadonlyValue<T>): never
export function use<T>(value: Emitter<T>): Emitter<T>
export function use<T>(value: Observable<T>): ReadonlyValue<T | undefined>
export function use<T extends (...args: any) => any>(
   value: EmitterWithParams<T>,
): EmitterWithParams<T>
export function use<T extends (...args: any[]) => any>(
   value: T,
): EmitterWithParams<T>
export function use<T>(value: T): Value<T>
export function use(value?: any): unknown {
   if (isQuery(value)) {
      const phase = queryMap.get(value)!
      if (value === ContentChildren || value === ViewChildren) {
         return new DeferredValue(new QueryListValue(), phase)
      }
      return new ValueType(void 0, phase)
   }
   if (isValue(value) || typeof value === "function") {
      return new EmitterType(value)
   }
   if (isObservable(value)) {
      return new DeferredValue(value)
   }
   return new ValueType(value)
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
): void
export function subscribe<T>(
   source: Observable<T>,
   observer: PartialObserver<T> | ((value: T) => TeardownLogic),
   signal: UnsubscribeSignal,
): void
export function subscribe<T>(
   source?: Observable<T> | (() => TeardownLogic),
   observerOrSignal?:
      | PartialObserver<T>
      | ((value: T) => TeardownLogic)
      | UnsubscribeSignal,
   signal?: UnsubscribeSignal,
): Subscription | void {
   const observer = isObserver(observerOrSignal) ? observerOrSignal : void 0
   signal = isSignal(observerOrSignal) ? observerOrSignal : signal

   if (!source) {
      const subscription = new Subscription()
      addTeardown(subscription)
      return subscription
   }

   return addEffect(source, observer, signal)
}
