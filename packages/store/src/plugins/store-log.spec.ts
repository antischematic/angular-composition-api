import { use } from "@mmuscat/angular-composition-api"
import { Query } from "../query"
import { Store } from "../store"
import { StoreLog } from "./store-log"
import { Provider } from "@angular/core"
import { TestBed } from "@angular/core/testing"

function addProvider(provider: Provider) {
   TestBed.configureTestingModule({
      providers: [provider],
   })
}

describe("StoreLog", () => {
   it("should log events", () => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test", {
         tokens: [Count],
         plugins: [StoreLog],
      })
      const spy = spyOn(console, "log")
      const spy2 = spyOn(console, "groupCollapsed")
      addProvider(TestStore.Provider)
      TestBed.inject(TestStore)
      const count = TestBed.inject(Count) as any
      expect(spy).not.toHaveBeenCalled()
      count(20)
      expect(spy2).toHaveBeenCalledOnceWith(
         "%ctest.count",
         "color: #4CAF50",
         "@",
         jasmine.any(String),
      )
      expect(spy).toHaveBeenCalledWith("%cprevious", "color: #9E9E9E", 0)
      expect(spy).toHaveBeenCalledWith("%ccurrent", "color: #4CAF50", 20)
   })
   it("should exclude events", () => {
      const Count = new Query("count", () => use(0))
      const TestStore = new Store("test", {
         tokens: [Count],
         plugins: [StoreLog],
      })
      const spy = spyOn(console, "log")
      const spy2 = spyOn(console, "groupCollapsed")
      addProvider(
         StoreLog.config({
            redacted: [Count],
         }),
      )
      addProvider(TestStore.Provider)
      TestBed.inject(TestStore)
      const count = TestBed.inject(Count) as any
      count(20)
      expect(spy2).toHaveBeenCalledOnceWith(
         "%ctest.count",
         "color: #4CAF50",
         "@",
         jasmine.any(String),
      )
      expect(spy).toHaveBeenCalledWith(
         "%cprevious",
         "color: #9E9E9E",
         "<<REDACTED>>",
      )
      expect(spy).toHaveBeenCalledWith(
         "%ccurrent",
         "color: #4CAF50",
         "<<REDACTED>>",
      )
   })
})
