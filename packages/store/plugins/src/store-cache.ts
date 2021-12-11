import { StoreLike, StorePlugin } from "@mmuscat/angular-phalanx"
import { isPlatformServer } from "@angular/common"
import {
   Inject,
   Injectable,
   InjectionToken,
   PLATFORM_ID,
   ProviderToken,
} from "@angular/core"
import { debounceTime } from "rxjs/operators"
import { Subscription } from "rxjs"

export interface StoreCacheOptions {
   storage?: ProviderToken<Storage>
   destroyStrategy?: "keep" | "discard"
   key: string
}

export const KeyCache = new InjectionToken("KeyCache", {
   providedIn: "platform",
   factory() {
      return new Set<string>()
   },
})

const DefaultStorage = new InjectionToken("DefaultStorage", {
   factory() {
      return localStorage
   },
})

export const StoreCacheOptions = new InjectionToken<StoreCacheOptions>(
   "StoreCacheOptions",
   {
      factory() {
         return {
            key: "phalanx",
         }
      },
   },
)

@Injectable({ providedIn: "root" })
export class StoreCache implements StorePlugin {
   static config(options: StoreCacheOptions) {
      return {
         provide: StoreCacheOptions,
         useValue: options,
      }
   }

   storeMap: Map<number, Subscription>

   onStoreInit({ id, state, name, injector }: StoreLike) {
      if (isPlatformServer(injector.get(PLATFORM_ID))) return
      const {
         key,
         storage = DefaultStorage,
         destroyStrategy = "discard",
      } = this.options
      const uniqueKey = `${key}.${name}`
      const store = injector.get(storage)
      const initialState = store.getItem(uniqueKey)
      if (initialState !== null) {
         state(JSON.parse(initialState))
      }
      const subscription = state.pipe(debounceTime(0)).subscribe((value) => {
         store.setItem(uniqueKey, JSON.stringify(value))
      })
      subscription.add(() => {
         if (destroyStrategy === "discard") {
            store.removeItem(uniqueKey)
         }
      })
      this.storeMap.set(id, subscription)
   }

   onStoreDestroy({ id }: StoreLike) {
      this.storeMap.get(id)!.unsubscribe()
   }

   constructor(
      @Inject(StoreCacheOptions) private options: StoreCacheOptions,
      @Inject(KeyCache) cache: Set<string>,
   ) {
      if (cache.has(options.key)) {
         throw new Error(
            `A store cache with key "${options.key}" already exists.`,
         )
      }
      cache.add(options.key)
      this.storeMap = new Map()
   }
}
