import {
   BehaviorSubject,
   Observable,
   PartialObserver,
   Subscribable,
   Subscription,
   Unsubscribable,
} from "rxjs"
import { ComputedSubject } from "./core"
import {
   CheckSubject,
   Emitter,
   Value,
   ValueAccessorOptions,
} from "./interfaces"
import { use } from "./common"
import { isEmitter, isValue } from "./utils"

class Subscriber extends Subscription {
   unsubscribe() {
      const { source } = this
      if (source.refCount > 0) {
         source.refCount--
         if (source.refCount === 0) {
            source.subscription?.unsubscribe()
         }
      }
      super.unsubscribe()
   }

   constructor(private source: any, observer: any) {
      super(source.subject.subscribe(observer))
   }
}

class AnonymousSubject<T, U> {
   get value(): U {
      return this.subject.value
   }
   refCount: number
   subscription?: Unsubscribable
   subject: BehaviorSubject<U>
   next(value: T) {
      const { destination } = this
      if (typeof destination === "function") {
         destination(value)
      } else if (destination?.next) {
         destination.next(value)
      }
   }
   error(error: unknown) {
      const { destination } = this
      if (typeof destination !== "function" && destination?.error) {
         destination.error(error)
      }
   }
   complete() {
      const { destination } = this
      if (typeof destination !== "function" && destination?.complete) {
         destination.complete()
      }
   }
   subscribe(observer: any) {
      const { source, subject } = this
      if (this.refCount === 0) {
         this.refCount++
         this.subscription = source.subscribe(subject)
      }
      return new Subscriber(this, observer)
   }
   constructor(
      value: U,
      public source: Subscribable<U>,
      public destination?: ((value: T) => void) | PartialObserver<T>,
   ) {
      this.refCount = 0
      this.subject = new BehaviorSubject<U>(value)
      this.destination = this.destination ?? (this.subject as any)
   }
}

class SelectSubject<T, U> extends AnonymousSubject<T, U> {
   selector
   next(value: T) {
      super.next((this.selector?.(value) as any) ?? value)
   }
   constructor(
      source: Subscribable<T> | (Subscribable<T> & { value: T }),
      selector: (value: T) => U,
      initialValue: U,
   ) {
      const value: any = "value" in source ? source.value : initialValue
      const obs = new Observable(() => {
         return source.subscribe(this)
      })
      super(selector ? selector(value) : (value as U), obs as Subscribable<any>)
      this.selector = selector
   }
}

class ValueAccessorSubject<T, U> extends AnonymousSubject<U, T> {
   constructor(accessor: ValueAccessorOptions<T, U>) {
      const source: any =
         "subscribe" in accessor.value
            ? accessor.value
            : new ComputedSubject(accessor.value)
      const value = "value" in source ? source.value : undefined
      const destination = accessor.next
      super(value as T, source, destination)
   }
}

export type ValueAccessor<T, U> = CheckSubject<T> & {
   readonly __ng_value: true
   readonly source: Observable<T>
   readonly pipe: Observable<T>["pipe"]
   readonly sync: [ValueAccessor<T, U>, Emitter<U>]
   readonly value: T
   (mutate: (value: U) => any): void
   (value: U): void
   (): T
   next(value: U): void
}

export function select<T, U>(
   value: ValueAccessorOptions<T, U>,
): ValueAccessor<T, U>
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
export function select<T, U, V>(
   source: Subscribable<T>,
   selector: (value: T) => U,
   initialValue: V,
): Value<U | V>
export function select<T, U, V>(
   source: Subscribable<T> | (() => U) | ValueAccessorOptions<T, U>,
   selector?: (value: T) => U,
   initialValue?: V,
): unknown {
   if (typeof source === "function" && !isValue(source) && !isEmitter(source)) {
      return use(new ComputedSubject(source)) as any
   }
   if ("next" in source && source.constructor === Object) {
      return use(
         new ValueAccessorSubject(source as ValueAccessorOptions<any, any>),
      )
   }
   return use(
      new SelectSubject<any, any>(source as any, selector!, initialValue!),
   ) as any
}
