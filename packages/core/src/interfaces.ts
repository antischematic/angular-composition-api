import {
   ContentChild,
   ContentChildren,
   EventEmitter,
   Type,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs"

export const checkPhase = Symbol("checkPhase")

export interface Check {
   check(): void
}

export interface CheckSubject<T> extends Observable<T> {
   readonly value: T
   readonly [checkPhase]: CheckPhase
}

export type CheckPhase = 5 | 6 | 7

export type State<T, U> = Type<
   {
      [key in keyof T]: T[key] extends CheckSubject<infer R> ? R : T[key]
   } &
      {
         [key in keyof U]: U[key] extends CheckSubject<infer R>
            ? R
            : U[key] extends EventEmitter<infer R>
            ? (value: R) => void
            : U[key]
      }
>

export type UnsubscribeSignal = Subscription | AbortSignal | null

export type Value<T> = CheckSubject<T> &
   BehaviorSubject<T> & {
      readonly __ng_value: true
      readonly source: Observable<T>
      readonly pipe: Observable<T>["pipe"]
      readonly value: T
      (mutate: (value: T) => any): void
      (value: T): void
      (): T
      next(value: T): void
   }

export interface ReadonlyValue<T> extends CheckSubject<T> {
   readonly __ng_value: true
   readonly source: Observable<T>
   readonly pipe: Observable<T>["pipe"]
   readonly value: T
   (): T
}

export interface Accessor<T, U> {
   next:
      | ((value: U) => void)
      | Subject<U>
      | Value<U>
      | ReadonlyValue<U>
      | Emitter<U>
      | AccessorValue<any, U>
   value:
      | Value<T>
      | ReadonlyValue<T>
      | AccessorValue<T, any>
      | BehaviorSubject<T>
      | (() => T)
}

export type AccessorValue<T, U> = CheckSubject<T> & {
   readonly __ng_value: true
   readonly __ng_accessor_value: true
   readonly source: Observable<T>
   readonly pipe: Observable<T>["pipe"]
   readonly value: T
   (mutate: (value: U) => any): void
   (value: U): void
   (): T
   next(value: U): void
}

export interface EmitterWithParams<T extends (...args: any[]) => any>
   extends Subject<ReturnType<T>> {
   readonly __ng_emitter: true
   readonly source: Observable<ReturnType<T>>
   readonly pipe: Observable<ReturnType<T>>["pipe"]
   (...params: Parameters<T>): void
   next(value: ReturnType<T>): void
}

export interface Emitter<T> extends Subject<T> {
   readonly __ng_emitter: true
   readonly source: Observable<T>
   readonly pipe: Observable<T>["pipe"]
   (value: T): void
   next(value: T): void
}

export type QueryType = typeof ContentChild | typeof ViewChild

export type QueryListType = typeof ViewChildren | typeof ContentChildren
