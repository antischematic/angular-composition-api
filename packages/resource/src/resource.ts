import { Injectable, Type } from "@angular/core"
import {
   AccessorValue,
   inject,
   Service,
   subscribe,
   use,
   Value,
} from "@mmuscat/angular-composition-api"
import {
   exhaust,
   filter,
   materialize,
   repeat,
   sample,
   switchMap,
   takeUntil,
   tap,
} from "rxjs/operators"
import {
   EMPTY,
   merge,
   NextObserver,
   Notification,
   Observable,
   ObservableInput,
   ObservedValueOf,
   Observer,
   of,
   OperatorFunction,
   Subject,
   Subscribable,
} from "rxjs"

export interface QueryOptions<T> {
   initialValue: T
   operator?: <T, O>(
      mapFn: (value: T) => O,
   ) => OperatorFunction<T, ObservedValueOf<O>>
   refetch?: Observable<any>[]
}

export interface Query<T, U> {
   (config: QueryOptions<T>): AccessorValue<Resource<T>, U>
   (
      params: Observable<U> | Observable<U>[],
      config: QueryOptions<T>,
   ): AccessorValue<Resource<T>, U>
}

interface QueryStatic {
   new <T, U>(factory: () => (params: U) => Subscribable<T>): Type<Query<T, U>>
}

export class Resource<T> {
   static createPending(value: any) {
      return new Resource(value, undefined, true, false)
   }
   static createNext(value: any) {
      return new Resource(value, undefined, false, false)
   }
   static createError(value: any, error: any) {
      return new Resource(value, error, false, true)
   }
   static createComplete(value: any) {
      return new Resource(value, undefined, false, true)
   }
   constructor(
      public value: T,
      public error: unknown,
      public pending: boolean,
      public done: boolean,
   ) {}
}

class ResultObserver implements Observer<any> {
   next(value: any) {
      this.value.next(Resource.createNext(value))
   }
   error(error: any) {
      this.value.next(Resource.createError(this.value.value.value, error))
   }
   complete() {
      this.value.next(Resource.createComplete(this.value.value.value))
   }
   constructor(private value: Value<any>) {}
}

class PendingObserver implements NextObserver<any> {
   next() {
      this.value.next(Resource.createPending(this.value.value.value))
   }
   constructor(private value: Value<any>) {}
}

class Cache implements Invalidator {
   params: any
   get(params: any, invalidate?: boolean): any {
      this.params = params
      const { cache, factory } = this
      const key = JSON.stringify(params)
      if (invalidate) {
         cache.delete(key)
      }
      if (cache.has(key)) {
         return of(cache.get(key))
      }
      return factory(params).pipe(tap((value) => cache.set(key, value)))
   }
   invalidate(params: any) {
      return this.get(params, true)
   }
   invalidateAll() {
      this.cache.clear()
      return this.get(this.params, true)
   }
   subscribe() {
      return this
   }
   constructor(
      private factory: (args: any) => Observable<any>,
      private cache: Map<any, any>,
      public unsubscribe: (this: Cache) => void,
   ) {}
}

const invalidators = new WeakMap<any, Set<Invalidator>>()

interface Invalidator {
   invalidate(params: any): void
   invalidateAll(): void
}

function addInvalidator(key: any, value: Invalidator) {
   if (invalidators.has(key)) {
      invalidators.get(key)!.add(value)
   } else {
      invalidators.set(key, new Set([value]))
   }
}

@Injectable({ providedIn: "root" })
class CacheFactory {
   get(token: any, queryFactory: any, value: any) {
      function unsubscribe(this: Cache) {
         invalidators.get(token)?.delete(this)
      }
      const cache = new Cache(queryFactory, new Map(), unsubscribe)

      addInvalidator(token, cache)
      addInvalidator(value, cache)

      return cache
   }
}

function queryFactory(
   factory: () => (args: any) => Observable<any>,
   forwardRef: () => any,
) {
   const cacheFactory = inject(CacheFactory)
   const queryFunction = factory()

   return function query(...params: any[]) {
      const args = params[params.length - 2]
      const options: QueryOptions<any> = params[params.length - 1]
      const value = use(Resource.createNext(options.initialValue))
      const cache = cacheFactory.get(forwardRef(), queryFunction, value)
      const operator = options?.operator ?? switchMap
      const cancel = new Subject()
      const fetch = use((args: any, invalidate: any) => [args, invalidate])
      const result = fetch.pipe(
         operator(([args, invalidate]) => cache.get(args, invalidate)),
         materialize(),
         takeUntil(cancel),
         repeat(),
      )

      subscribe(cache)
      subscribe(fetch, new PendingObserver(value))
      subscribe(result, new ResultObserver(value))

      if (options.refetch) {
         const signal = merge(...options.refetch).pipe(
            filter((value) => (value instanceof Resource ? value.done : true)),
         )
         subscribe(fetch.pipe(sample(signal)), (params) => fetch(params, true))
      }

      if (args) {
         subscribe(merge(...(Array.isArray(args) ? args : [args])), {
            next(value) {
               fetch.next([value, false])
            },
         })
      }

      return value
   }
}

function createQueryFactory(factory: () => Function) {
   const Query: any = new Service(queryFactory, {
      providedIn: "root",
      name: factory.name,
      arguments: [factory, () => Query],
   })
   return Query
}

export const Query: QueryStatic = createQueryFactory as any

interface MutateOptions {
   operator?: () => OperatorFunction<ObservableInput<any>, any>
   cancel?: Observable<any>
}

function mutateFactory(factory: () => (...args: any[]) => Observable<any>) {
   function mutate(params: Observable<any>, options: MutateOptions) {
      const operator = options?.operator?.() ?? exhaust()
      const cancel = options?.cancel ?? EMPTY
      const queue = use<Observable<Notification<any>>>(Function)
      const result = queue.pipe(operator)
      const createStream = factory()
      const value = use(Resource.createNext(undefined))

      function mutate(params: any) {
         queue.next(createStream(params).pipe(materialize(), takeUntil(cancel)))
      }

      subscribe(params, mutate)
      subscribe(queue, new PendingObserver(value))
      subscribe(result, new ResultObserver(value))

      return value
   }

   return mutate
}

export interface Mutation<T, U> {
   (params: Observable<U>, options?: MutateOptions): Value<Resource<T>>
}

export interface MutationStatic {
   new <T, U>(factory: () => (params: U) => Observable<T>): Type<Mutation<T, U>>
}

function createMutationFactory(
   factory: () => (...args: any) => Observable<any>,
) {
   return new Service(mutateFactory, {
      providedIn: "root",
      name: factory.name,
      arguments: [factory],
   })
}

export const Mutation: MutationStatic = createMutationFactory as any

export function invalidate(key: any, params?: any) {
   const invalidator = invalidators.get(key)
   const clear = arguments.length === 1
   if (invalidator) {
      const list = Array.from(invalidator)
      for (const item of list) {
         if (clear) {
            item.invalidateAll()
         } else {
            item.invalidate(params)
         }
      }
   }
}
