import {
   isObservable,
   NextObserver,
   observable,
   Observable,
   ReplaySubject,
   Subject,
   Subscribable,
   Subscription,
   Unsubscribable,
} from "rxjs"
import { CheckPhase, DeferredValueOptions, ValueOptions } from "./interfaces"
import { EventEmitter } from "@angular/core"
import { isEmitter, isValue } from "./utils"

export const trackedValues = new Map<any, Set<any>>()
export const pendingObservers = new Set<any>()

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

function ValueFn<T>(this: any, nextValue?: any): T | void {
   const value = this.__ng_value
   if (arguments.length === 0) {
      track(value)
      return value.value
   } else if (typeof nextValue === "function") {
      nextValue(value.value)
      value.next(value.value)
   } else {
      value.next(nextValue)
   }
}

class Source<T> extends ReplaySubject<T> {
   next(nextValue: T) {
      this.value = nextValue
      super.next(nextValue)
   }
   constructor(public value: T, emit: boolean) {
      super(1)
      if (emit) this.next(value)
   }
}

export class Value<T> implements NextObserver<T> {
   readonly __ng_value: boolean
   declare readonly __check_phase: number;
   [observable]() {
      return this
   }
   check?: (oldValue: T, newValue: T) => boolean
   source!: Subject<T>
   errors!: Set<(error: unknown) => Observable<any> | void>
   changes!: Set<(previous: T, current: T) => void>
   get value(): T {
      return (<any>this.source).value
   }
   set value(nextValue: T) {
      this.next(nextValue)
   }
   isDirty(value: T) {
      return !this.check!(this.value, value)
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
   pipe(this: any, ...operators: any) {
      return this.asObservable().pipe(...operators)
   }
   next(nextValue: T) {
      this.source.next(nextValue)
      trigger(this)
   }
   asObservable(): Observable<T> {
      return <any>new Observable((subscriber) => {
         return this.subscribe(subscriber)
      })
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
   onError(handler: (error: unknown) => Observable<any> | void) {
      this.errors.add(handler)
      return () => this.errors.delete(handler)
   }
   onChanges(handler: (previous: T, current: T) => void) {
      this.changes.add(handler)
      return () => this.changes.delete(handler)
   }

   constructor(
      { check = Object.is, subject, immediate = true }: ValueOptions<T> = {},
      value?: T,
      phase: CheckPhase = 5,
   ) {
      const self: any = this.__ng_value = Object.setPrototypeOf(ValueFn.bind(this), this)
      self.errors = new Set()
      self.changes = new Set()
      self.source = subject ?? new Source<T>(value!, arguments.length > 1)
      self.__check_phase = phase
      self.check = check
      return self
   }
}

class Reviver extends Subscription {
   next() {
      this.unsubscribe()
      this.connectable.disconnect()
      this.connectable.connect()
   }
   error(error: unknown) {
      this.unsubscribe()
      this.destination.error(error)
   }
   constructor(
      private connectable: Connectable,
      private destination: Subject<any>,
      result: Observable<any>,
   ) {
      super()
      this.add(result.subscribe(this))
   }
}

class Subscriber extends Subscription {
   next(value: unknown) {
      this.destination.next(value)
   }
   error(error: unknown) {
      const handlers = this.errorHandlers
      if (handlers.size) {
         for (const handler of handlers) {
            try {
               const result = handler(error)
               if (isObservable(result)) {
                  new Reviver(this.connectable, this.destination, result)
               }
               break
            } catch (e) {
               error = e
            }
         }
      }
   }
   constructor(
      private connectable: Connectable,
      private errorHandlers: Set<(error: unknown) => Observable<any> | void>,
      private destination: Subject<any>,
      source: Subscribable<any>,
   ) {
      super()
      this.add(source?.subscribe(this))
   }
}

export class DeferredValue<T> extends Value<T> implements Connectable {
   connected: boolean
   refCount: number
   subscription: Subscription

   connect(): void {
      if (!this.connected) {
         this.connected = true
         this.subscription = new Subscriber(
            this,
            this.errors,
            this.source,
            this.subscribable,
         )
      }
   }

   disconnect(): void {
      this.connected = false
      this.subscription.unsubscribe()
   }

   subscribe(observer: any): Subscription {
      return new ConnectedSubscriber(this, observer, this.options?.immediate)
   }

   constructor(
      public subscribable: Subscribable<any>,
      public phase: CheckPhase = 5,
      public options?: ValueOptions<any> | DeferredValueOptions<any>,
   ) {
      super(options)
      this.refCount = 0
      this.connected = false
      this.subscription = Subscription.EMPTY
      if (options && "initial" in options) {
         this.source.next(options.initial)
      }
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

   constructor(public observer: any, public options?: ValueOptions<any>) {
      super(options)
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
   connected: boolean
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

   constructor(
      private accessor: Connectable,
      observer: any,
      immediate: boolean = true,
   ) {
      super()
      accessor.refCount++
      if (accessor.refCount === 1 && !immediate) accessor.connect()
      this.add(accessor.source.subscribe(observer))
      if (accessor.refCount === 1 && immediate) accessor.connect()
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
   options?: ValueOptions<TValue> | DeferredValueOptions<TValue>

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
         this.connected = true
         this.subscription = this.subscribable.subscribe(this.source)
      }
   }

   disconnect() {
      this.connected = false
      this.subscription.unsubscribe()
   }

   subscribe(observer: any): Subscription {
      return new ConnectedSubscriber(this, observer, this.options?.immediate)
   }

   constructor(
      accessor: Accessor<TValue, TNext>,
      options?: ValueOptions<TValue> | DeferredValueOptions<TValue>,
   ) {
      let { value } = accessor
      if (typeof value === "function" && !isValue(value) && !isEmitter(value)) {
         value = new ComputedValue(value, options)
      }
      super(options)
      this.options = options
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

function EmitterFn(this: any, ...params: any[]) {
   this.__ng_emitter.next(params)
}

export class Emitter extends EventEmitter {
   readonly __ng_emitter: boolean
   modifier: (...params: any[]) => any
   next(values: any) {
      values = Array.isArray(values) ? values : [values]
      super.next(this.modifier(...values))
   }
   emit(values: any) {
      this.next(values)
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
   constructor(fn: (...params: any[]) => any) {
      super()
      this.__ng_emitter = Object.setPrototypeOf(EmitterFn.bind(this), this)
      this.modifier = fn === Function ? defaultFn : fn
      return this.__ng_emitter as any
   }
}
