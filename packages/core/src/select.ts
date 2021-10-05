import {BehaviorSubject, PartialObserver, Subscribable, Subscription, Unsubscribable,} from "rxjs"
import {ComputedSubject} from "./core"
import {Accessor, AccessorValue, Emitter, Value,} from "./interfaces"
import {use} from "./common"

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

class AccessorValueSubject<T, U> extends AnonymousSubject<U, T> {
   constructor(accessor: Accessor<T, U>) {
      const source: any =
         "subscribe" in accessor.value
            ? accessor.value
            : new ComputedSubject(accessor.value)
      const value = "value" in source ? source.value : undefined
      const destination = accessor.next
      super(value as T, source, destination)
   }
}

export function select<T, U>(
   accessor: Accessor<T, U>,
): AccessorValue<T, U>
export function select<T extends Value<any> | Emitter<any>>(source: T): unknown
export function select<T>(source: () => T): Value<T>
export function select(
   source: (() => any) | Accessor<any, any> | Value<any> | Emitter<any>
): unknown {
   if (typeof source === "function") {
      return use(new ComputedSubject(source)) as any
   }
   return use(
      new AccessorValueSubject(source),
   )
}
