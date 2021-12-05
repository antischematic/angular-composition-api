import { Query } from "../query"
import { use } from "@mmuscat/angular-composition-api"
import { Store } from "../store"
import { Provider } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { keyCache, StoreCache } from "./store-cache"

function addProvider(provider: Provider) {
   TestBed.configureTestingModule({
      providers: [provider],
   })
}

describe("StoreCache", () => {
   beforeEach(() => {
      keyCache.clear()
   })
   it("should save state to localstorage", () => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test", {
         tokens: [Count],
         plugins: [StoreCache.create({ key: "test" })],
      })
      addProvider(TestStore.Provider)
      TestBed.inject(TestStore.Token)
      expect(localStorage.getItem("test")).toBe(JSON.stringify({ count: 0 }))
   })
   it("should set state from localstorage", () => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test", {
         tokens: [Count],
         plugins: [StoreCache.create({ key: "test2" })],
      })
      addProvider(TestStore.Provider)
      localStorage.setItem("test2", JSON.stringify({ count: 0 }))
      const store = TestBed.inject(TestStore.Token)
      expect(store.state()).toEqual({ count: 0 })
   })
   it("should throw error if same key used more than once", () => {
      const Count = new Query("count", () => use(0))
      new Store("test", {
         tokens: [Count],
         plugins: [StoreCache.create({ key: "test" })],
      })
      expect(() => {
         new Store("test", {
            tokens: [Count],
            plugins: [StoreCache.create({ key: "test" })],
         })
      }).toThrowError('A store cache with key "test" already exists.')
   })
})
