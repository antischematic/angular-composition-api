import {PartialObserver, Subscription} from "rxjs"
import {Emitter, ExpandValue, Notification, UnsubscribeSignal, Value} from "./interfaces"

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

export function getPath(value: any, path: string[]): any {
   if (!path.length) return value
   return path.reduceRight((val: any, key) => val[key], value)
}

export function walk<T extends { [key: string]: any }>(object: T, next: (value: any, path: string[]) => any, path: string[] = []): { [key: string]: any } {
   return Object.getOwnPropertyNames(object).reduce((acc, key ) => {
      const value = object[key]
      const currentPath = [key, ...path]
      if (isObject(value)) {
         acc[key] = walk(value, next, currentPath)
      } else {
         acc[key] = next(value, currentPath)
      }
      return acc
   }, {} as any)
}

export function get<T extends {}>(value: T): ExpandValue<T>
export function get<T>(value: Value<T>): T
export function get(value: any) {
   if (isValue(value)) return value()
   return walk(value, (current) => isValue(current) ? current() : current)
}

export function access<T extends {}>(value: T): ExpandValue<T>
export function access<T>(value: Value<T>): T
export function access(value: any) {
   if (isValue(value)) return value.value
   return walk(value, (current) => isValue(current) ? current.value : current)
}
