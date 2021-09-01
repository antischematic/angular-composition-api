import {
   BehaviorSubject, Observable,
   PartialObserver,
   Subject,
   Subscribable, Subscriber,
   Subscription,
   Unsubscribable,
} from "rxjs"
import { ComputedSubject } from "./core"
import {Value, ValueAccessor} from "./interfaces"
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

class SelectSubject<T, U> extends Subject<U | undefined> {
   value: U
   refs: number
   _source: Subscribable<T>
   selector?: (value: T) => U
   subscription?: Unsubscribable
   subscribe(): Subscription
   subscribe(observer: (value: U) => void): Subscription
   subscribe(observer: PartialObserver<U>): Subscription
   subscribe(observer?: any): Subscription {
      if (this.refs === 0) {
         this.subscription = this._source.subscribe(new SelectObserver(this))
      }
      this.refs++
      return super.subscribe(observer).add(() => {
         this.refs--
         if (this.refs === 0) {
            this.subscription?.unsubscribe()
         }
      })
   }

   constructor(
      source: Subscribable<T> | BehaviorSubject<T> | ValueAccessor<any, any>,
      selector?: (value?: T) => U,
      initialValue?: any,
   ) {
      let next
      if ("next" in source && !(source instanceof BehaviorSubject) && !isValue(source) && !isEmitter(source)) {
         next = source.next
         source = typeof source.subscribe === "function" ? new ComputedSubject(source.subscribe) : source
      }
      if ("value" in source) {
         initialValue =
            typeof selector === "function"
               ? selector(source.value)
               : source.value
      } else {
         initialValue = typeof selector === "function" ? initialValue : selector
      }
      super()
      this.next = next ?? this.next
      this.value = initialValue
      this._source = source as Subscribable<T>
      this.selector = selector
      this.refs = 0
   }
}

export function select<T, U>(value: ValueAccessor<T, U>): Value<ValueAccessor<T, U>>
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
   source: Subscribable<T> | (() => U) | ValueAccessor<T, U>,
   selector?: (value: T) => U,
): Value<U> {
   if (typeof source === "function" && !isValue(source) && !isEmitter(source)) {
      return use(new ComputedSubject(source)) as any
   }
   return use(new SelectSubject<any, any>(source as any, selector)) as any
}
