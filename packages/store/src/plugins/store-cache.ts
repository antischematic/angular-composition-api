import { StoreLike } from "../interfaces"
import { isPlatformServer } from "@angular/common"
import { inject, onDestroy, subscribe } from "@mmuscat/angular-composition-api"
import { PLATFORM_ID } from "@angular/core"
import { debounceTime } from "rxjs/operators"

export interface StoreCacheOptions {
   storage?: typeof localStorage,
   destroyStrategy?: "keep" | "discard"
   key: string
}

export const keyCache = new Set<string>()

export class StoreCache {
   static create(options: StoreCacheOptions) {
      if (keyCache.has(options.key)) {
         throw new Error(`A store cache with key "${options.key}" already exists.`)
      }
      keyCache.add(options.key)
      return function ({ state }: StoreLike) {
         if (isPlatformServer(inject(PLATFORM_ID))) return
         const { key, storage = localStorage, destroyStrategy = "discard"} = options
         const initialState = storage.getItem(key)
         if (initialState !== null) {
            state(JSON.parse(initialState))
         }
         subscribe(state.pipe(debounceTime(0)), (value) => {
            localStorage.setItem(key, JSON.stringify(value))
         })
         onDestroy(() => {
            keyCache.delete(key)
            if (destroyStrategy === "discard") {
               localStorage.removeItem(key)
            }
         })
      }
   }
}
