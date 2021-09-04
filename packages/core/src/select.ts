import {
   BehaviorSubject, Observable,
   PartialObserver,
   Subject,
   Subscribable, Subscriber,
   Subscription,
   Unsubscribable,
} from "rxjs"
import { ComputedSubject } from "./core"
import {CheckSubject, Emitter, Value, ValueAccessorOptions} from "./interfaces"
import { use } from "./common"
import { isEmitter, isValue } from "./utils"

class SelectObserver {
   next(value: any) {
      value = this.subject.selector ? this.subject.selector(value) : value
      if (this.subject.value !== value) {
         this.subject.value = value
         this.subject.next(value)
      }
   }
   error(error: unknown) {
      this.subject.error(error)
   }
   complete() {
      this.subject.complete()
   }
   constructor(private subject: SelectSubject<any, any>) {}
}

// todo: extract delegate behavior
class SelectSubject<T, U> {
   value: U
   refs: number
   subject: Subject<T>
   selector?: (value: T) => U
   subscription?: Unsubscribable
   subscribe(): Subscription
   subscribe(observer: (value: U) => void): Subscription
   subscribe(observer: PartialObserver<U>): Subscription
   subscribe(observer?: any): Subscription {
      if (this.refs === 0) {
         this.subscription = this.subject.subscribe(new SelectObserver(this))
      }
      this.refs++
      return this.subject.subscribe(observer).add(() => {
         this.refs--
         if (this.refs === 0) {
            this.subscription?.unsubscribe()
         }
      })
   }

   next: (value: any) => void

   error(error: any) {
      this.subject.error?.(error)
   }

   complete() {
      this.subject.complete?.()
   }

   constructor(
      source: Subscribable<T> | BehaviorSubject<T> | ValueAccessorOptions<any, any>,
      selector?: (value?: T) => U,
      initialValue?: any,
   ) {
      let next
      let subscribe: any
      if ("next" in source && !(source instanceof BehaviorSubject) && !isValue(source) && !isEmitter(source)) {
         next = source.next
         source = typeof source.subscribe === "function" && !isValue(source.subscribe) && !isEmitter(source.subscribe) ? new ComputedSubject(source.subscribe) : source.subscribe
         Object.defineProperty(this, "value", {
            get() {
               return (<any>source).value
            },
            set(val) {}
         })
      }
      if ("value" in source) {
         initialValue =
            typeof selector === "function"
               ? selector(source.value)
               : source.value
      } else {
         initialValue = typeof selector === "function" ? initialValue : selector
      }

      this.next = next ?? ((value) => this.subject.next(value))
      this.value = initialValue
      this.subject = source as Subject<any>
      this.selector = selector
      this.subscribe = subscribe ?? this.subscribe
      this.refs = 0
   }
}
export type ValueAccessor<T, U> = CheckSubject<T> & {
   readonly __ng_value: true
   readonly source: Observable<T>
   readonly pipe: Observable<T>["pipe"]
   readonly value: T
   (mutate: (value: U) => any): void
   (value: U): void
   (): T
   next(value: T): void
} & [Value<T>, Emitter<U>]

export function select<T, U>(value: ValueAccessorOptions<T, U>): ValueAccessor<T, U>
export function select<T>(source: () => T): Value<T>
export function select<T>(source: Value<T>): Value<T>
export function select<T, U>(
   source: Value<T>,
   selector: (value: T) => U,
): Value<U>
export function select<T>(source: BehaviorSubject<T>): Value<T>
export function select<T, U>(
   source: BehaviorSubject<T>,
   selector: (value: T) => U,
): Value<U>
export function select<T>(source: Subscribable<T>): Value<T | undefined>
export function select<T, U>(
   source: Subscribable<T>,
   initialValue: U,
): Value<T | U>
export function select<T, U>(
   source: Subscribable<T>,
   selector: (value: T) => U,
): Value<U | undefined>
export function select<T, U, V>(
   source: Subscribable<T>,
   selector: (value: T) => U,
   initialValue: V,
): Value<U | V>
export function select<T, U>(
   source: Subscribable<T> | (() => U) | ValueAccessorOptions<T, U>,
   selector?: (value: T) => U,
): Value<U> {
   if (typeof source === "function" && !isValue(source) && !isEmitter(source)) {
      return use(new ComputedSubject(source)) as any
   }
   return use(new SelectSubject<any, any>(source as any, selector)) as any
}
