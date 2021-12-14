import {
   ContentChild,
   ContentChildren,
   EventEmitter,
   Type,
   ViewChild,
   ViewChildren,
} from "@angular/core"
import { NextObserver, Observable, Subject, Subscription } from "rxjs"

export interface Check {
   check(): void
}

export interface CheckSubject<T, U = T> extends Observable<T> {
   readonly value: T | U
   readonly __check_phase: CheckPhase
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
      (value: void): T
      (mutate: (value: T) => any): void
      (value: T): void
      next(value: T): void
      onChanges(handler: (previous: T, current: T) => void): () => void
      onError(handler: (error: unknown) => Observable<any> | void): () => void
   }

export type DeferredValue<T> = CheckSubject<T, undefined> &
   NextObserver<T> & {
      readonly __ng_value: true
      (value: void): T | undefined
      (mutate: (value: T) => any): void
      (value: T): T | undefined
      next(value: T): void
      onChanges(handler: (previous: T, current: T) => void): () => void
      onError(handler: (error: unknown) => Observable<any> | void): () => void
   }

export interface ReadonlyValue<T> extends CheckSubject<T> {
   readonly __ng_value: true
   (value: void): T
   onChanges(handler: (previous: T, current: T) => void): () => void
   onError(handler: (error: unknown) => Observable<any> | void): () => void
}

export interface Accessor<T, U> {
   next:
      | ((value: U) => void)
      | NextObserver<U>
   value:
      | Observable<T>
      | (() => T)
}

export interface AccessorValue<T, U> extends CheckSubject<T> {
   readonly __ng_value: true
   readonly __ng_accessor_value: true
   readonly value: T
   (value: void): T
   (mutate: (value: U) => any): void
   (value: U): void
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

export interface ValueOptions<T> {
   behavior?: boolean
   distinct?: (oldValue: T, newValue: T) => boolean
   subject?: Subject<T>
}

export interface DeferredValueOptions<T> extends ValueOptions<T> {
   initial: T
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

export type Change<T> =
   | {
        current: T
        previous: undefined
        first: true
     }
   | {
        current: T
        previous: T
        first: false
     }
