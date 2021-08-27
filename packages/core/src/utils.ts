import {
   BehaviorSubject,
   MonoTypeOperatorFunction,
   NextObserver,
   Observable,
   PartialObserver,
   Subscribable,
   Subscription,
   SubscriptionLike,
   Unsubscribable,
} from "rxjs"
import { EventEmitter } from "@angular/core"
import { UnsubscribeSignal, Value } from "./interfaces"
import { audit, filter, sample } from "rxjs/operators"
import { getContext, Scheduler, Lifecycle } from "./core"

let previous: Set<any>
let deps: Set<any>
let tracking = false

export function trackDeps<T>(fn: () => T): [T, Set<any>] {
   const flushed = new Set()
   tracking = true
   previous = deps
   deps = flushed
   const value = fn()
   tracking = false
   deps = previous
   return [value, flushed]
}

export function computeValue<T>(compute: (value?: T) => T) {
   return trackDeps(compute)
}

export function arrayCompare(a: Set<any>, b: Set<any>) {
   const aArr = [...a]
   const bArr = [...b]
   return aArr.every((v, i) => v === bArr[i])
}

export function track<T>(source: {
   value: T
   subscribe(value: (value: T) => void): SubscriptionLike
}): void
export function track<T>(source: {
   value: T
   subscribe(value: PartialObserver<T>): SubscriptionLike
}): void
export function track<T>(source: {
   value: T
   subscribe(value: PartialObserver<T> | ((value: T) => void)): SubscriptionLike
}): void {
   if (tracking) {
      deps.add(source)
   }
}

type ValueOrSetter<T> = T | BehaviorSubject<T> | ((value: T) => T)

export function isObject(value: unknown): value is {} {
   return typeof value === "object" && value !== null
}

export function set<T>(
   source: BehaviorSubject<T>,
   observer?: NextObserver<T> | ((value: T) => void),
): (valueOrSetter: ValueOrSetter<T>) => void {
   return function (value) {
      if (value instanceof Function) {
         source.next(value(source.value))
      } else if (value instanceof BehaviorSubject) {
         source.next(value.value)
      } else {
         source.next(value)
      }
      if (typeof observer === "function") {
         observer(source.value)
      } else if (observer) {
         observer.next(source.value)
      }
   }
}

export function Emitter<T>(async?: boolean): EventEmitter<T> {
   return new EventEmitter<T>(async)
}

export function addSignal(
   teardown: Unsubscribable | Function,
   abort: Subscription | AbortSignal,
) {
   const subscription = new Subscription().add(teardown)
   if (abort instanceof AbortSignal) {
      const listener = () => subscription.unsubscribe()
      abort.addEventListener("abort", listener, { once: true })
   } else {
      abort.add(subscription)
   }
}

export function isEmitter(value: any) {
   return typeof value === "function" && "__ng_emitter" in value
}

export function isValue(value: any): value is Value<any> {
   return typeof value === "function" && "__ng_value" in value
}

export function isSignal(value: any): value is UnsubscribeSignal {
   return (
      value === null ||
      value instanceof Subscription ||
      value instanceof AbortSignal
   )
}

export function isObserver(
   observer: any,
): observer is PartialObserver<any> | Function {
   return (observer && "next" in observer) || typeof observer === "function"
      ? observer
      : void 0
}

export function updateOn<T>(
   lifecycle: Lifecycle,
   scheduler: Observable<Lifecycle>,
): MonoTypeOperatorFunction<T> {
   const selector = scheduler.pipe(filter((value) => value === lifecycle))
   return function (source) {
      return source.pipe(audit(() => selector))
   }
}
