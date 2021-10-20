import {
   BehaviorSubject,
   isObservable,
   observable,
   Observable,
   PartialObserver,
   ReplaySubject,
   Subject,
   Subscribable,
   Subscription,
   TeardownLogic,
   ObjectUnsubscribedError,
} from "rxjs"
import {
   ContentChild,
   ContentChildren,
   EventEmitter,
   QueryList,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import {
   AccessorValue,
   CheckPhase,
   checkPhase,
   Emitter,
   EmitterWithParams,
   QueryListType,
   QueryType,
   ReadonlyValue,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import {
   isObserver,
   isSignal,
   isValue,
   Notification,
   observeNotification,
   track,
} from "./utils"
import { addEffect, addTeardown, currentContext } from "./core"

type Callable = (...args: any[]) => any
interface UseSubject extends Callable, Subject<any> {}

abstract class UseSubject {
   get value() {
      return this.source.value
   }
   [observable]() {
      return this
   }
   call(context: any, ...args: any[]) {
      return this(...args)
   }
   apply(context: any, args: any[]) {
      return this(...args)
   }
   subscribe(nextOrObserver: any) {
      return this.source.subscribe(nextOrObserver)
   }
   pipe(...operators: any[]) {
      return this.source.pipe(...operators)
   }
   next(value: any) {
      return this.source.next(value)
   }
   protected constructor(public source: any) {}
}
class ValueSubject extends UseSubject {
   [checkPhase]: number
   __ng_value = true
   constructor(source: any, phase: any) {
      super(source)
      this[checkPhase] = phase
   }
}
class EmitterSubject extends UseSubject {
   __ng_emitter = true

   next(values: any[]): any {
      values = Array.isArray(values) ? values : [values]
      return super.next(this.modifier(...values))
   }

   constructor(source: any, private modifier: Function) {
      super(source)
   }
}

export class QueryListSubject extends QueryList<any> {
   subscription?: Subscription
   get value() {
      return this
   }
   next(value: QueryList<any>) {
      this.subscription?.unsubscribe()
      this.reset(value.toArray())
      this.notifyOnChanges()
      this.subscription = value.changes.subscribe(this)
   }
   subscribe(observer: any) {
      observeNotification(Notification.createNext(this), observer)
      return this.changes.subscribe(observer)
   }
   complete() {
      this.destroy()
   }
}

export class ObservableSubject extends ReplaySubject<any> {
   subscription = new Subscription()
   refCount = 0
   private _value: any
   get value() {
      if (this.hasError) {
         throw this.thrownError
      } else if (this.closed) {
         throw new ObjectUnsubscribedError()
      }
      return this._value
   }
   next(value?: any) {
      this._value = value
      super.next(value)
   }
   subscribe(observer: any) {
      this.refCount++
      if (this.refCount === 1) {
         this.subscription = this._source.subscribe(this)
      }
      const subscription = super.subscribe(observer)
      return new Subscription(() => {
         subscription.unsubscribe()
         if (this.refCount > 1) {
            this.refCount--
            if (this.refCount === 0) {
               this.subscription.unsubscribe()
            }
         }
      })
   }
   constructor(private _source: Observable<any>) {
      super(1)
   }
}

function createQueryList<T>(phase: CheckPhase): ReadonlyValue<QueryList<T>> {
   const queryList = new QueryListSubject()
   const valueType: ValueSubject = Object.setPrototypeOf(
      getterSetter,
      new ValueSubject(queryList, phase),
   )
   function getterSetter(nextValue?: QueryList<T>): QueryList<T> | void {
      if (arguments.length === 0) {
         track(valueType)
         return queryList
      }
      valueType.next(nextValue!)
   }
   return valueType as ReadonlyValue<QueryList<T>>
}

function createValue<T>(
   source: BehaviorSubject<T> | ObservableSubject,
   phase = 0,
): Value<T> {
   const valueType: ValueSubject = Object.setPrototypeOf(
      getterSetter,
      new ValueSubject(source, phase),
   )
   function getterSetter(this: Value<any>, nextValue?: any): T | void {
      if (arguments.length === 0) {
         track(valueType)
         return valueType.value
      }
      if (typeof nextValue === "function") {
         nextValue(valueType.value)
         valueType.next(valueType.value)
      } else {
         valueType.next(nextValue!)
      }
   }
   return valueType as Value<T>
}

function defaultFn(value: any) {
   return value
}

function createEmitter<T extends (...args: any[]) => any>(
   fn: T | FunctionConstructor,
): Emitter<T> {
   fn = fn === Function ? (defaultFn as T) : fn
   const emitterType: EmitterSubject = Object.setPrototypeOf(
      next,
      new EmitterSubject(new EventEmitter(), fn),
   )

   function next(...args: any[]) {
      emitterType.next(args)
   }

   return emitterType as Emitter<any>
}

const queryMap = new Map<Function, CheckPhase>([
   [ContentChild, 1],
   [ContentChildren, 1],
   [ViewChild, 2],
   [ViewChildren, 2],
])

function isQuery(value: any) {
   return queryMap.has(value)
}

function isBehavior(value: any) {
   return (
      typeof value === "object" &&
      value !== null &&
      "next" in value &&
      typeof value["subscribe"] === "function" &&
      "value" in value
   )
}

export function use<T>(): Value<T | undefined>
export function use<T>(value: QueryListType): ReadonlyValue<QueryList<T>>
export function use<T>(value: QueryType): ReadonlyValue<T | undefined>
export function use<T>(value: typeof Function): Emitter<T>
export function use<T>(value: BehaviorSubject<T>): Value<T>
export function use<T>(value: Subject<T>): Value<T | undefined>
export function use<T, U>(value: AccessorValue<T, U>): Emitter<T>
export function use<T>(value: Value<T>): Emitter<T>
export function use<T>(value: ReadonlyValue<T>): never
export function use<T>(value: Emitter<T>): Emitter<T>
export function use<T>(value: Subscribable<T>): ReadonlyValue<T | undefined>
export function use<T extends (...args: any) => any>(
   value: EmitterWithParams<T>,
): EmitterWithParams<T>
export function use<T extends (...args: any[]) => any>(
   value: T,
): EmitterWithParams<T>
export function use<T>(value: T): Value<T>
export function use(value?: any): unknown {
   if (isQuery(value)) {
      const phase = queryMap.get(value)!
      if (value === ContentChildren || value === ViewChildren) {
         return createQueryList(phase)
      }
      return createValue(new BehaviorSubject(void 0), phase)
   }
   if (isValue(value) || typeof value === "function") {
      return createEmitter(value)
   }
   if (isBehavior(value)) {
      return createValue(value)
   }
   if (isObservable(value)) {
      return createValue(new ObservableSubject(value))
   }
   return createValue(new BehaviorSubject(value))
}

export function subscribe<T>(): Subscription
export function subscribe<T>(observer: () => TeardownLogic): Subscription
export function subscribe<T>(source: Subscribable<T>): Subscription
export function subscribe<T>(
   source: Subscribable<T>,
   observer: PartialObserver<T>,
): Subscription
export function subscribe<T>(
   source: Subscribable<T>,
   observer: (value: T) => TeardownLogic,
): Subscription
export function subscribe<T>(
   source: Subscribable<T>,
   signal: UnsubscribeSignal,
): void
export function subscribe<T>(
   source: Subscribable<T>,
   observer: PartialObserver<T> | ((value: T) => TeardownLogic),
   signal: UnsubscribeSignal,
): void
export function subscribe<T>(
   source?: Subscribable<T> | (() => TeardownLogic),
   observerOrSignal?:
      | PartialObserver<T>
      | ((value: T) => TeardownLogic)
      | UnsubscribeSignal,
   signal?: UnsubscribeSignal,
): Subscription | void {
   const observer = isObserver(observerOrSignal) ? observerOrSignal : void 0
   signal = isSignal(observerOrSignal) ? observerOrSignal : signal

   if (!currentContext) {
      const subscription = new Subscription()
      subscription.add(
         typeof source === "function" ? source() : source?.subscribe(observer as any ?? {}),
      )
      return subscription
   }

   if (!source) {
      const subscription = new Subscription()
      addTeardown(subscription)
      return subscription
   }

   return addEffect(source, observer, signal)
}
