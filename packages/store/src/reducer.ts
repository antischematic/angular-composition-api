import { Value, ValueToken } from "@mmuscat/angular-composition-api"
import { ActionDispatcher } from "./action"
import { Observable } from "rxjs"

type ValueType<T> = T extends ValueToken<infer R> ? R : never

export interface Reducer<T> {
   reducers: [
      ActionDispatcher<any, any> | ActionDispatcher<any, any>[],
      StateReducer<any, any>,
   ][]
   add<U extends ValueToken<ActionDispatcher<any, any>>[]>(
      action: U,
      reduce: StateReducer<
         T,
         ValueType<U[number]> extends Observable<infer R> ? R : never
      >,
   ): Reducer<T>
   add<U extends ValueToken<ActionDispatcher<any, any>>>(
      action: U,
      reduce: StateReducer<
         T,
         ValueType<U> extends Observable<infer R> ? R : never
      >,
   ): Reducer<T>
}

type ReducerFactory<T> = (reducer: Reducer<T>) => Reducer<T>

interface ReducerStatic {
   new <T>(name: string, factory?: ReducerFactory<T>): ValueToken<Value<T>>
}

export interface StateReducer<T, U> {
   (state: T, action: U): T
}

function add(this: Reducer<any>, action: any, reduce: any) {
   this.reducers.push([action, reduce])
   return this
}

function createReducer(name: string, factory: ReducerFactory<any>) {
   return new ValueToken(name, {
      factory() {
         return factory({
            reducers: [],
            add,
         })
      },
   })
}

export const Reducer: ReducerStatic = createReducer as any
