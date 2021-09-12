import { Injectable, Type } from "@angular/core"
import {
   inject,
   select,
   Service,
   subscribe,
   use,
   Value,
   ValueAccessor,
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
   merge,
   NextObserver,
   Notification,
   Observable,
   Observer,
   of,
   OperatorFunction,
   Subject,
} from "rxjs"

export interface QueryOptions<T> {
   initialValue: T
   refetch?: Observable<any>[]
}

export interface Query<T, U> {
   (config: QueryOptions<T>): ValueAccessor<Resource<T>, U>
   (
      params: Observable<U> | Observable<U>[],
      config: QueryOptions<T>,
   ): ValueAccessor<Resource<T>, U>
}

interface QueryStatic {
   new <T, U>(factory: () => (params: U) => Observable<T>): Type<Query<T, U>>
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
      console.log(this.mutation.value)
   }
   constructor(private value: Value<any>, private mutation: any) {}
}

class PendingObserver implements NextObserver<any> {
   next() {
      this.value.next(Resource.createPending(this.value.value.value))
   }
   constructor(private value: Value<any>) {}
}

class Cache {
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
   clear() {
      this.cache.clear()
   }
   invalidate() {
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

const globalCache = new Map<Type<any>, Set<Cache>>()

@Injectable({ providedIn: "root" })
class CacheFactory {
   get(token: any, queryFactory: any) {
      function unsubscribe(this: Cache) {
         globalCache.get(token)?.delete(this)
      }
      const cache = new Cache(queryFactory, new Map(), unsubscribe)
      if (globalCache.has(token)) {
         globalCache.get(token)!.add(cache)
         return cache
      } else {
         globalCache.set(token, new Set([cache]))
         return cache
      }
   }
}

export interface QueryConfig {
   operator?: () => OperatorFunction<any, any>
}

function queryFactory(
   factory: () => (args: any) => Observable<any>,
   forwardRef: () => any,
   config: QueryConfig,
) {
   const cacheFactory = inject(CacheFactory)
   const queryFunction = factory()

   return function query(...params: any[]) {
      const args = params[params.length - 2]
      const options = params[params.length - 1]
      const value = use(Resource.createNext(options.initialValue))
      const query = select({
         next(valueOrCommand: any) {
            if (valueOrCommand instanceof Command) {
               switch (valueOrCommand.signal) {
                  case CANCEL:
                     cancel.next()
                     break
                  case INVALIDATE:
                     if (valueOrCommand.params) {
                        fetch(valueOrCommand.params, true)
                     } else {
                        cache.clear()
                     }
                     break
                  default:
                     throwInvalidCommand()
               }
            } else {
               value(valueOrCommand)
            }
         },
         value,
      })
      const cache = cacheFactory.get(forwardRef(), queryFunction)
      const operator = config?.operator ?? switchMap
      const cancel = new Subject()
      const fetch = use((args: any, invalidate: any) => [
         args,
         invalidate,
      ]) as any
      const result = fetch.pipe(
         operator(([args, invalidate]) => cache.get(args, invalidate)),
         materialize(),
         takeUntil(cancel),
         repeat(),
      )

      subscribe(cache)
      subscribe(fetch, new PendingObserver(value))
      subscribe(result, new ResultObserver(value, value))

      if (options.refetch) {
         const signal = merge(...options.refetch).pipe(
            filter((value) => (value instanceof Resource ? value.done : true)),
         )
         subscribe(fetch.pipe(sample(signal)), (params) => fetch(params, true))
      }

      if (args) {
         subscribe(merge(...(Array.isArray(args) ? args : [args])), fetch)
      }

      return query
   }
}

function createQueryFactory(factory: () => Function, config?: any) {
   const Query = new Service(queryFactory, {
      providedIn: "root",
      name: factory.name,
      arguments: [factory, () => Query, config],
   })
   return Query
}

export const Query: QueryStatic = createQueryFactory as any

const CANCEL = 0
const INVALIDATE = 1

class Command {
   constructor(public signal: number, public params?: any) {}
}

function throwInvalidCommand() {
   throw new Error("Invalid command")
}

function mutateFactory(
   factory: () => (...args: any[]) => Observable<any>,
   config: MutationConfig,
) {
   const operator = config?.operator?.() ?? exhaust()
   const queue = use<Observable<Notification<any>>>(Function)
   const cancel = new Subject()
   const result = queue.pipe(operator)
   const createStream = factory()
   const value = use(Resource.createNext(undefined))
   function mutate(params: any) {
      if (params instanceof Command) {
         switch (params.signal) {
            case CANCEL:
               return cancel.next()
            default:
               throwInvalidCommand()
         }
      }
      queue.next(createStream(params).pipe(materialize(), takeUntil(cancel)))
   }
   const mutation = select({
      next: mutate,
      value,
   })

   subscribe(queue, new PendingObserver(value))
   subscribe(result, new ResultObserver(value, mutation))

   return mutation
}

export interface MutationConfig {
   operator?: () => OperatorFunction<Observable<any>, any>
}

export interface MutationStatic {
   new <T, U>(
      factory: () => (params: U) => Observable<T>,
      config?: MutationConfig,
   ): Type<ValueAccessor<Resource<T>, U>>
}

function createMutationFactory(
   factory: () => (...args: any) => Observable<any>,
   config: MutationConfig,
) {
   return new Service(mutateFactory, {
      providedIn: "root",
      name: factory.name,
      arguments: [factory, config],
   })
}

export const Mutation: MutationStatic = createMutationFactory as any

export function cancel(resource: any) {
   resource.next(new Command(CANCEL))
}

export function invalidate(query: any, params?: any) {
   if (query.__ng_value) {
      query.next(new Command(INVALIDATE, params))
   } else {
      const set = globalCache.get(query) ?? []
      for (const cache of set) {
         cache.clear()
         cache.invalidate()
      }
   }
}
