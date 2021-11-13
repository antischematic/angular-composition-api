import {
   NextObserver,
   observable,
   Observable,
   ReplaySubject,
   Subscribable,
   Subscription,
   Unsubscribable,
} from "rxjs"
import {CheckPhase, checkPhase, UseOptions} from "./interfaces"
import { EventEmitter } from "@angular/core"
import {isEmitter, isValue} from "./utils"

const trackedValues = new Map<any, Set<any>>()
const pendingObservers = new Set<any>()

let currentObserver: any

function track(value: any) {
   if (!currentObserver) return
   if (!trackedValues.has(value)) {
      trackedValues.set(value, new Set())
   }
   trackedValues.get(value)!.add(currentObserver)
}

let pending = false

export function setPending(value: boolean) {
   const previous = pending
   pending = value
   return previous
}

function trigger(value: any) {
   const observers = trackedValues.get(value)
   if (observers) {
      let list = new Set(observers)
      observers.clear()
      for (const observer of list) {
         observer.dirty = true
         if (pending) {
            pendingObservers.add(observer)
         } else {
            observer.observe()
         }
      }
      // @ts-ignore
      list = null
   }
}

export function flush() {
   let list = new Set(pendingObservers)
   pendingObservers.clear()
   for (const observer of list) {
      observer.observe()
   }
   // @ts-ignore
   list = null
}

function setObserver(value: any) {
   const previous = currentObserver
   currentObserver = value
   return previous
}

export class Value<T> implements NextObserver<T> {
   readonly __ng_value: boolean;
   [checkPhase]: number;
   [observable]() {
      return this
   }
   check: (oldValue: T, newValue: T) => boolean
   source: ReplaySubject<T>
   get value(): T {
      return this._value!
   }
   set value(nextValue: T) {
      this.next(nextValue)
   }
   isDirty(value: T) {
      return !this.check(this.value, value)
   }
   call(this: any, context: any, ...args: any[]) {
      return this(...args)
   }
   apply(this: any, context: any, args: any[]) {
      return this(...args)
   }
   bind() {
      return this
   }
   subscribe(observer: any) {
      return this.source.subscribe(observer)
   }
   lift(operator: any) {
      return this.source.lift(operator)
   }
   pipe(this: any, ...observers: any) {
      return this.source.pipe(...observers)
   }
   next(nextValue: T) {
      this.source.next(nextValue)
      trigger(this)
   }
   asObservable(): Observable<T> {
      return this.source.asObservable()
   }
   forEach(
      next: (value: any) => void,
      promiseCtor: PromiseConstructorLike,
   ): Promise<void> {
      return this.source.forEach(next, promiseCtor)
   }
   toPromise(promiseCtor: any): Promise<T | undefined> {
      return this.source.toPromise(promiseCtor)
   }

   constructor(public _value?: T, public phase: CheckPhase = 5, options?: UseOptions<T>) {
      const value: this = Object.setPrototypeOf(function Value(
         nextValue?: any,
      ): T | void {
         if (arguments.length === 0) {
            track(value)
            return value.value
         }
         if (typeof nextValue === "function") {
            nextValue(value.value)
            value.next(value.value)
         } else {
            value.next(nextValue)
         }
      },
      this)
      this.__ng_value = true
      this[checkPhase] = phase
      this.check = options?.distinct ?? Object.is
      this.source = new ReplaySubject(1)
      this.source.subscribe((value) => (this._value = value))
      if (arguments.length > 0) this.source.next(_value!)
      return value
   }
}

export class DeferredValue extends Value<any> implements Connectable {
   refCount: number
   subscription: Unsubscribable

   connect(): void {
      this.disconnect()
      this.subscription = this.subscribable.subscribe(this.source)
   }

   disconnect(): void {
      this.subscription.unsubscribe()
   }

   subscribe(observer: any): Subscription {
      return new ConnectedSubscriber(this, observer)
   }

   constructor(public subscribable: Subscribable<any>, phase: CheckPhase = 5, options?: UseOptions<any>) {
      super()
      this.refCount = 0
      this.phase = phase
      this.check = options?.distinct ?? Object.is
      this.subscription = Subscription.EMPTY
   }
}

export class ComputedValue extends Value<any> {
   dirty: boolean
   closed: boolean
   get value() {
      this.observe()
      return super.value
   }
   observe() {
      if (this.dirty && !this.closed) {
         this.dirty = false
         const previous = setObserver(this)
         const value = this.observer.call()
         setObserver(previous)
         this.next(value)
      }
   }
   stop() {
      this.closed = true
   }
   subscribe(observer: any): Subscription {
      this.observe()
      const subscription = super.subscribe(observer)
      subscription.add(() => this.stop())
      return subscription
   }

   constructor(public observer: any) {
      super()
      this.dirty = true
      this.closed = false
   }
}

type Next<T> = ((param: T) => void) | NextObserver<T>

interface Accessor<TValue, TNext> {
   next: Next<TNext>
   value: Subscribable<TValue> | (() => TValue)
}

interface Connectable {
   connect(): void
   disconnect(): void
   refCount: number
   source: Subscribable<any>
}

class ConnectedSubscriber extends Subscription {
   unsubscribe() {
      const { accessor } = this
      if (accessor.refCount > 1) {
         accessor.refCount--
         if (accessor.refCount === 0) {
            accessor.disconnect()
         }
      }
      super.unsubscribe()
   }

   constructor(private accessor: Connectable, observer: any) {
      super()
      accessor.refCount++
      if (accessor.refCount === 1) {
         accessor.connect()
      }
      this.add(accessor.source.subscribe(observer))
   }
}

export class AccessorValue<TValue, TNext>
   extends Value<TValue>
   implements Connectable
{
   refCount: number
   subscription: Unsubscribable
   subscribable: Subscribable<TValue>
   accessor: Accessor<TValue, TNext>
   connected: boolean

   get value() {
      this.connect()
      return super.value
   }

   next(value: TNext): void
   next(value: never): void
   next(value: TNext) {
      const {
         accessor: { next },
      } = this
      typeof next === "function" ? next(value) : next.next(value)
   }

   connect() {
      if (!this.connected) {
         this.disconnect()
         this.connected = true
         this.subscription = this.subscribable.subscribe(this.source)
      }
   }

   disconnect() {
      this.connected = false
      this.subscription.unsubscribe()
   }

   subscribe(observer: any): Subscription {
      return new ConnectedSubscriber(this, observer)
   }

   constructor(accessor: Accessor<TValue, TNext>) {
      let { value } = accessor
      if (typeof value === "function" && !isValue(value) && !isEmitter(value)) {
         value = new ComputedValue(value)
      }
      super("value" in value ? value["value"] : void 0)
      this.accessor = accessor
      this.refCount = 0
      this.subscription = Subscription.EMPTY
      this.subscribable = value
      this.connected = false
   }
}

export function defaultFn(value: any) {
   return value
}

export class Emitter extends EventEmitter {
   readonly __ng_emitter: boolean
   modifier: (...params: any[]) => any
   next(values: any) {
      values = Array.isArray(values) ? values : [values]
      if (isValue(this.modifier)) {
         this.modifier(values[0])
         super.next(this.modifier.value)
      } else {
         super.next(this.modifier(...values))
      }
   }
   emit(values: any) {
      this.next(values)
   }
   constructor(fn: (...params: any[]) => any) {
      super()
      this.__ng_emitter = true
      this.modifier = fn === Function ? defaultFn : fn
      const emitter: this = Object.setPrototypeOf(function Emitter(
         ...params: any[]
      ) {
         emitter.next(params)
      },
      this)
      return emitter
   }
}
