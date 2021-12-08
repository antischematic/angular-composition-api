import { Query } from "../query"
import { use } from "@mmuscat/angular-composition-api"
import { Store } from "../store"
import { Provider } from "@angular/core"
import {fakeAsync, TestBed, tick} from "@angular/core/testing"
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
         plugins: [StoreCache],
      })
      addProvider(TestStore.Provider)
      TestBed.inject(TestStore.Token)
      tick()
      expect(localStorage.getItem("test")).toBe(JSON.stringify({ count: 0 }))
   }))
   it("should set state from localstorage", () => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test", {
         tokens: [Count],
         plugins: [StoreCache],
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
         plugins: [StoreCache],
      })
      expect(() => {
         new Store("test", {
            tokens: [Count],
            plugins: [StoreCache],
         })
      }).toThrowError('A store cache with key "test" already exists.')
   })
})
