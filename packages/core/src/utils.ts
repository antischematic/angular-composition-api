import {PartialObserver, Subscription} from "rxjs"
import {Emitter, Notification, UnsubscribeSignal, Value} from "./interfaces"

export function isObject(value: unknown): value is {} {
   return typeof value === "object" && value !== null
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

export function accept<T>(observer: PartialObserver<any> | ((value: T) => any), value: T, error: unknown,  kind: string) {
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

export function observeNotification<T>(
   notification: Notification<T>,
   observer: PartialObserver<T> | ((value: T) => any),
): any {
   const { kind, value, error } = notification as any
   if (typeof kind !== "string") {
      throw new TypeError('Invalid notification, missing "kind"')
   }
   return accept(observer, value, error, kind)
}
