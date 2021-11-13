import { OperatorFunction, Subscription } from "rxjs"
import { subscribe, use } from "./common"

export type Operation<TParam, TResult> = (
   param: TParam,
   observer?: any,
) => Subscription

export function pipe<TParam, T, A, B>(
   producer: (param: TParam) => T,
): Operation<TParam, T>
export function pipe<TParam, T, A, B>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
): Operation<TParam, A>
export function pipe<TParam, T, A, B>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
): Operation<TParam, B>
export function pipe<TParam, T, A, B, C>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
): Operation<TParam, C>
export function pipe<TParam, T, A, B, C, D>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
): Operation<TParam, D>
export function pipe<TParam, T, A, B, C, D, E>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
   op5: OperatorFunction<D, E>,
): Operation<TParam, E>
export function pipe<TParam, T, A, B, C, D, E, F>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
   op5: OperatorFunction<D, E>,
   op6: OperatorFunction<E, F>,
): Operation<TParam, F>
export function pipe<TParam, T, A, B, C, D, E, F, G>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
   op5: OperatorFunction<D, E>,
   op6: OperatorFunction<E, F>,
   op7: OperatorFunction<F, G>,
): Operation<TParam, G>
export function pipe<TParam, T, A, B, C, D, E, F, G, H>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
   op5: OperatorFunction<D, E>,
   op6: OperatorFunction<E, F>,
   op7: OperatorFunction<F, G>,
   op8: OperatorFunction<G, H>,
): Operation<TParam, H>
export function pipe<TParam, T, A, B, C, D, E, F, G, H, I>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
   op5: OperatorFunction<D, E>,
   op6: OperatorFunction<E, F>,
   op7: OperatorFunction<F, G>,
   op8: OperatorFunction<G, H>,
   op9: OperatorFunction<H, I>,
): Operation<TParam, I>
export function pipe<TParam, T, A, B, C, D, E, F, G, H, I>(
   producer: (param: TParam) => T,
   op1: OperatorFunction<T, A>,
   op2: OperatorFunction<A, B>,
   op3: OperatorFunction<B, C>,
   op4: OperatorFunction<C, D>,
   op5: OperatorFunction<D, E>,
   op6: OperatorFunction<E, F>,
   op7: OperatorFunction<F, G>,
   op8: OperatorFunction<G, H>,
   op9: OperatorFunction<H, I>,
   ...operations: OperatorFunction<any, any>[]
): Operation<TParam, any>
export function pipe(
   producer: any,
   ...operations: OperatorFunction<any, any>[]
): Operation<any, any> {
   const source = use(producer)
   const destination = (<any>source).pipe(...operations)

   return function operation(param: any, observer) {
      if (cache.has(operation)) {
         subscribe()
         return cache.get(operation)
      }
      const subscription = subscribe(destination, observer)
      source(param)
      return subscription
   }
}

const cache = new WeakMap()
