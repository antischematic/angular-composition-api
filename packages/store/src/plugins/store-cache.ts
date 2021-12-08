import { StoreLike, StorePlugin } from "../interfaces"
import { isPlatformServer } from "@angular/common"
import { inject, onDestroy, subscribe } from "@mmuscat/angular-composition-api"
import { Inject, Injectable, InjectionToken, PLATFORM_ID, ProviderToken } from "@angular/core"
import { debounceTime } from "rxjs/operators"

export interface StoreCacheOptions {
   storage?: ProviderToken<Storage>
   destroyStrategy?: "keep" | "discard"
   key: string
}

export const KeyCache = new InjectionToken("KeyCache", {
   factory() {
      return new Set<string>()
   }
})

const DefaultStorage = new InjectionToken("DefaultStorage", {
   factory() {
      return localStorage
   },
})

export const StoreCacheOptions = new InjectionToken<StoreCacheOptions>("StoreCacheOptions", {
   factory() {
      return {
         key: "phalanx"
      }
   }
})

@Injectable({ providedIn: "root" })
export class StoreCache implements StorePlugin {
   onStoreInit({ state, name }: StoreLike) {
      if (isPlatformServer(inject(PLATFORM_ID))) return
      const {
         key,
         storage = DefaultStorage,
         destroyStrategy = "discard",
      } = this.options
      const uniqueKey = `${key}.${name}`
      const store = inject(storage)
      const initialState = store.getItem(uniqueKey)
      if (initialState !== null) {
         state(JSON.parse(initialState))
      }
      subscribe(state.pipe(debounceTime(0)), (value) => {
         store.setItem(uniqueKey, JSON.stringify(value))
      })
      onDestroy(() => {
         if (destroyStrategy === "discard") {
            store.removeItem(uniqueKey)
         }
      })
   }
   constructor(@Inject(StoreCacheOptions) private options: StoreCacheOptions, @Inject(KeyCache) cache: Set<string>) {
      if (cache.has(options.key)) {
         throw new Error(
            `A store cache with key "${options.key}" already exists.`,
         )
      }
      cache.add(options.key)
   }
}
