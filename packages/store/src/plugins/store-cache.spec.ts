import { Query } from "../query"
import { use } from "@mmuscat/angular-composition-api"
import {Store, withPlugins} from "../store"
import { Provider } from "@angular/core"
import { fakeAsync, TestBed, tick } from "@angular/core/testing"
import { StoreCache } from "./store-cache"

function addProvider(provider: Provider) {
   TestBed.configureTestingModule({
      providers: [provider],
   })
}

describe("StoreCache", () => {
   it("should save state to localstorage", fakeAsync(() => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test", {
         tokens: [Count],
      })
      addProvider(
         StoreCache.config({
            key: "test",
         }),
      )
      addProvider(withPlugins(TestStore, [StoreCache]))
      TestBed.inject(TestStore.Token)
      tick()
      expect(localStorage.getItem("test.test")).toBe(
         JSON.stringify({ count: 0 }),
      )
   }))
   it("should set state from localstorage", () => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test2", {
         tokens: [Count],
      })
      addProvider(withPlugins(TestStore, [StoreCache]))
      addProvider(
         StoreCache.config({
            key: "test2",
         }),
      )
      localStorage.setItem("test2.test2", JSON.stringify({ count: 20 }))
      const store = TestBed.inject(TestStore.Token)
      expect(store.state()).toEqual({ count: 20 })
   })
   it("should throw error if same key used more than once", () => {
      class StoreCache2 {}
      addProvider({ provide: StoreCache2, useClass: StoreCache })
      TestBed.inject(StoreCache)
      expect(() => {
         TestBed.inject(StoreCache2)
      }).toThrowError('A store cache with key "phalanx" already exists.')
   })
})
