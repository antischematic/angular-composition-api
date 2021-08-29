import { Value, ValueToken } from "@mmuscat/angular-composition-api"
import { ActionDispatcher } from "./action"
import { Observable } from "rxjs"

export interface Reducer<T> extends ValueToken<Value<T>> {
   reducers: [
      ActionDispatcher<any, any> | ActionDispatcher<any, any>[],
      StateReducer<any, any>,
   ][]
   add<U extends ValueToken<ActionDispatcher<any, any>>[]>(
      action: U,
      reduce: StateReducer<
         T,
         InstanceType<U[number]> extends Observable<infer R> ? R : never
      >,
   ): Reducer<T>
   add<U extends ValueToken<ActionDispatcher<any, any>>>(
      action: U,
      reduce: StateReducer<
         T,
         InstanceType<U> extends Observable<infer R> ? R : never
      >,
   ): Reducer<T>
}

interface ReducerStatic {
   new <T>(name: string): Reducer<T>
}

export interface StateReducer<T, U> {
   (state: T, action: U): T
}

function add(this: { reducers: any[] }, action: any, reduce: any) {
   this.reducers.push([action, reduce])
   return this
}

function createReducer(name: string) {
   const token = new ValueToken(name)
   Object.defineProperty(token, "reducers", { value: [] })
   Object.defineProperty(token, "add", { value: add })
   return token
}

export const Reducer: ReducerStatic = createReducer as any
