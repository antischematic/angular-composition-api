import { PartialObserver, Subscription, Unsubscribable } from "rxjs"
import { Emitter, UnsubscribeSignal, Value } from "./interfaces"

export function isObject(value: unknown): value is {} {
   return typeof value === "object" && value !== null
}

export function addSignal(
   teardown: Unsubscribable | (() => void),
   abort: Subscription | AbortSignal,
) {
   const subscription = new Subscription()
   subscription.add(teardown)
   if (abort instanceof AbortSignal) {
      const listener = () => subscription.unsubscribe()
      abort.addEventListener("abort", listener, { once: true })
   } else {
      abort.add(subscription)
   }
}

export function isEmitter(value: any): value is Emitter<any> {
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

export class Notification<T> {
   constructor(
      public kind: "N" | "E" | "C",
      public value: T,
      public error: unknown,
      public complete: boolean,
   ) {}

   static createNext(value: any) {
      return new Notification("N", value, undefined, false)
   }

   static createError(error: any) {
      return new Notification("E", undefined, error, false)
   }

   static createComplete() {
      return new Notification("C", undefined, undefined, true)
   }
}

export function observeNotification<T>(
   notification: Notification<T>,
   observer: PartialObserver<T> | ((value: T) => any),
): any {
   const { kind, value, error } = notification as any
   if (typeof kind !== "string") {
      throw new TypeError('Invalid notification, missing "kind"')
   }
   if (typeof observer === "function") {
      if (kind === "N") return observer(value)
      return
   }
   return kind === "N"
      ? observer.next?.(value!)
      : kind === "E"
      ? observer.error?.(error)
      : observer.complete?.()
}
