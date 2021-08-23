import {BehaviorSubject, Observable, PartialObserver, Subscribable, TeardownLogic,} from "rxjs"
import {
   ContentChild,
   ContentChildren,
   EventEmitter,
   QueryList,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import {
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
import {isEmitter, isObserver, isSignal, track} from "./utils"
import {Subscription} from "rxjs/internal/Subscription"
import {addEffect} from "./core";

export class QueryListSubject extends Observable<any> {
   next(value: QueryList<any>) {
      this.queryList.reset(value.toArray())
      this.queryList.notifyOnChanges()
   }
   complete() {
      this.queryList.destroy()
   }

   constructor(private queryList: QueryList<any>) {
      super((subscriber) => {
         subscriber.next(queryList)
         queryList.changes.subscribe(subscriber)
      })
   }
}

function createQueryList<T>(phase: CheckPhase): ReadonlyValue<QueryList<T>> {
   const queryList = new QueryList<T>()
   function getterSetter(nextValue?: QueryList<T>): QueryList<T> | void {
      if (arguments.length === 0) {
         track(getterSetter as any)
         return queryList
      }
      getterSetter.source.next(nextValue!)
      nextValue!.changes.subscribe(getterSetter.source)
   }
   getterSetter.value = queryList
   getterSetter.source = new QueryListSubject(queryList)
   getterSetter.next = getterSetter
   getterSetter.pipe = pipe
   getterSetter.subscribe = sub
   getterSetter[checkPhase] = phase
   getterSetter.__ng_value = true

   return getterSetter as ReadonlyValue<QueryList<T>>
}

function sub(this: Value<any>, nextOrObserver: any) {
   return this.source.subscribe(nextOrObserver)
}

function pipe(this: any, ...operators: any[]) {
   return this.source.pipe(...operators)
}

function get(this: any) {
   return this.source.value
}

function* generator(this: Value<any>) {
   yield this
   yield createEmitter(this)
}

function createValue<T>(source: BehaviorSubject<T>, phase = 0): Value<T> {
   function getterOrSetter(this: Value<any>, nextValue?: T): T | void {
      if (arguments.length === 0) {
         track(getterOrSetter as any)
         return (<any>getterOrSetter).value
      }
      getterOrSetter.source.next(nextValue!)
   }
   Object.defineProperty(getterOrSetter, "value", { get })
   getterOrSetter.next = getterOrSetter
   getterOrSetter.subscribe = sub
   getterOrSetter.source = source
   getterOrSetter.pipe = pipe
   getterOrSetter[Symbol.iterator] = generator
   getterOrSetter[checkPhase] = phase
   getterOrSetter.__ng_value = true
   return getterOrSetter as unknown as Value<T>
}

function defaultFn(value: any) {
   return value
}

function createEmitter<T extends (...args: any[]) => any>(
   fn: T | FunctionConstructor,
): Emitter<T> {
   fn = fn === Function ? (defaultFn as T) : fn

   function next(...args: any[]) {
      next.source.next(fn(...args))
   }

   next.source = new EventEmitter()
   next.subscribe = sub
   next.pipe = pipe
   next.next = next
   next.__ng_emitter = true

   return next as Emitter<T>
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

function isSource(value: any) {
   return typeof value === "object" && value !== null && "next" in value  && typeof value["next"] === "function"
}

export function use<T>(value: QueryListType): ReadonlyValue<QueryList<T>>
export function use<T>(value: QueryType): ReadonlyValue<T>
export function use<T>(value: typeof Function): Emitter<T>
export function use<T extends (...args: any[]) => any>(
   value: T,
): EmitterWithParams<T>
export function use<T>(value: T): Value<T>
export function use<T>(): Value<T | undefined>
export function use(value?: any): unknown {
   if (isQuery(value)) {
      const phase = queryMap.get(value)!
      if (value === ContentChildren || value === ViewChildren) {
         return createQueryList(phase)
      }
      return createValue(new BehaviorSubject(void 0), phase)
   }
   if (isEmitter(value)) {
      return createEmitter(value)
   }
   if(isSource(value)) {
      return createValue(value, 0)
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
   return addEffect(source, observer, signal)
}