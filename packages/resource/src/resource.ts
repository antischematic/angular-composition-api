import {
   CheckPhase,
   checkPhase,
   Inject,
} from "@mmuscat/angular-composition-api"
import { catchError } from "rxjs/operators"
import { CloakBoundary } from "@mmuscat/angular-error-boundary"
import {
   Observable,
   OperatorFunction,
   PartialObserver,
   Subject,
   Subscription,
} from "rxjs"

export const resources = new Map<string, Set<ResourceSubject>>()
export const cache = new Map<string, unknown>()

function addResource(key: string, resource: ResourceSubject) {
   const set = resources.get(key) ?? resources.set(key, new Set()).get(key)!
   set.add(resource)
}

function clearResource(key: string, resource: ResourceSubject) {
   resources.get(key)?.delete(resource)
}

function getCacheKey(resource: ResourceSubject) {
   const params = JSON.stringify(resource.paramsObserver.value)
   return `${resource.key}=${params}`
}

function setCache(resource: ResourceSubject, value: any) {
   const cacheKey = getCacheKey(resource)
   cache.set(cacheKey, value)
}

function getCache(resource: ResourceSubject) {
   return cache.get(getCacheKey(resource))
}

function clearCache(resource: ResourceSubject) {
   return cache.delete(getCacheKey(resource))
}

class ResourceObserver {
   resource
   next(value: any) {
      setCache(this.resource, value)
      this.resource.next({
         pending: false,
         value,
      })
   }
   complete() {
      this.resource.next({
         pending: false,
      })
   }
   constructor(resource: ResourceSubject) {
      this.resource = resource
   }
}

class ParamsObserver {
   value?: any
   resource
   next(params: any) {
      this.value = params
      const value = getCache(this.resource)
      if (value) {
         this.resource.next({
            value,
         })
      } else {
         this.resource.next({
            pending: true,
         })
         this.resource.emitter.next(params)
      }
   }
   constructor(resource: ResourceSubject) {
      this.resource = resource
   }
}

class NoopBoundary {
   cloak<T>(value: T) {
      return value
   }
   handleError() {}
}

export class ResourceSubject<T = any> extends Subject<ResourceSubject<T>> {
   key
   emitter
   value: any
   pending: boolean
   errorThrown: any
   hasError: boolean
   refCount: number
   subscription?: Subscription;
   [checkPhase]: CheckPhase
   resource
   params
   paramsObserver: ParamsObserver
   boundary
   observer: ResourceObserver

   next(value: any) {
      Object.assign(this, value)
      super.next(this)
   }

   mutate(value?: T) {
      clearCache(this)
      if (arguments.length) {
         this.value = value
         this.next(this)
      }
      this.emitter.next(this.paramsObserver.value)
   }

   subscribe(): Subscription
   subscribe(observer: (value: ResourceSubject<T>) => void): Subscription
   subscribe(observer: PartialObserver<ResourceSubject<T>>): Subscription
   subscribe(observer?: any): Subscription {
      this.refCount++
      if (this.refCount === 1) {
         addResource(this.key, this)
         this.boundary
            .cloak(
               this.emitter.pipe(
                  this.resource,
                  catchError((error, source) => {
                     this.boundary.handleError(error)
                     this.observer.next(error)
                     return source
                  }),
               ),
            )
            .subscribe(this.observer)
         this.params.subscribe(this.paramsObserver)
      }
      observer.next(this)
      return super.subscribe(observer).add(() => {
         this.refCount--
         if (this.refCount === 0) {
            clearResource(this.key, this)
            this.subscription?.unsubscribe()
         }
      })
   }
   constructor(
      key: string,
      params: Observable<any>,
      operator: OperatorFunction<any, any>,
      boundary: CloakBoundary,
   ) {
      super()
      this.key = key
      this.emitter = new Subject<void>()
      this.params = params
      this.paramsObserver = new ParamsObserver(this)
      this.resource = operator
      this.boundary = boundary
      this.observer = new ResourceObserver(this)
      this.refCount = 0
      this[checkPhase] = 0
      this.hasError = false
      this.errorThrown = null
      this.pending = false
      this.value = void 0
   }
}

export function mutate(key: string) {
   for (const resource of resources.get(key) ?? []) {
      resource.mutate()
   }
}

export function Resource(
   [key, params]: [string, Observable<any>],
   factory: (key: string) => OperatorFunction<any, any>,
   options?: { cloak?: boolean },
) {
   return new ResourceSubject(
      key,
      params,
      factory(key),
      options?.cloak
         ? Inject(CloakBoundary, new NoopBoundary())
         : new NoopBoundary(),
   )
}
//
// function getTodosByUserId(url) {
//     const http = Inject(HttpClient);
//
//     return mergeMap(userId => {
//         return http.get(url, {
//             params: { userId }
//         });
//     });
// }

// const GetTodosById = Resource(`//example.com/api/v1/todos`, getTodosByUserId)
