import {
   ContentChild,
   ContentChildren,
   EventEmitter,
   Type,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import {
   BehaviorSubject,
   NextObserver,
   Observable,
   Subject,
   Subscription,
} from "rxjs"

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
   NextObserver<T> & {
      readonly __ng_value: true
      readonly value: T
      (value: T): T
      (): T
      next(value: T): void
   onChanges(handler: (previous: T, current: T) => void): () => void
      onError(handler: (error: unknown) => Observable<any> | void): () => void
   }

export interface ReadonlyValue<T> extends CheckSubject<T> {
   readonly __ng_value: true
   readonly value: T
   (): T
   onChanges(handler: (previous: T, current: T) => void): () => void
   onError(handler: (error: unknown) => Observable<any> | void): () => void
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

export interface AccessorValue<T, U> extends CheckSubject<T> {
   readonly __ng_value: true
   readonly __ng_accessor_value: true
   readonly value: T
   (mutate: (value: U) => any): T
   (value: U): T
   (): T
   next(value: U): void
   onChanges(handler: (previous: T, current: T) => void): () => void
   onError(handler: (error: unknown) => Observable<any> | void): () => void
}

export interface EmitterWithParams<T extends (...args: any[]) => any>
   extends EventEmitter<ReturnType<T>> {
   readonly __ng_emitter: true
   (...params: Parameters<T>): void
}

export interface Emitter<T> extends EventEmitter<T> {
   readonly __ng_emitter: true
   (value: T): void
}

export type QueryType = typeof ContentChild | typeof ViewChild

export type QueryListType = typeof ViewChildren | typeof ContentChildren

export interface UseOptions<T> {
   distinct?: (oldValue: T, newValue: T) => boolean
}

export interface Notification<T> {
   kind: "N" | "E" | "C"
   value: T
   error: unknown
   complete: boolean
}

export type ExpandValue<T, TPartial extends boolean = false> = T extends Value<
   infer R
>
   ? R
   : true extends TPartial
   ? T extends any[]
      ? T
      : {
           [key in keyof T]?: ExpandValue<T[key], TPartial>
        }
   : T extends any[]
   ? T
   : {
        [key in keyof T]: ExpandValue<T[key], TPartial>
     }

export interface ErrorState {
   error: unknown
   message?: string
   retries: number
}

export type Change<T> = {
   current: T,
   previous: undefined,
   first: true,
} | {
   current: T,
   previous: T,
   first: false,
}
