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
      addProvider(TestStore.Provider)
      TestBed.inject(TestStore)
      const count = TestBed.inject(Count) as any
      expect(spy).not.toHaveBeenCalled()
      count(20)
      expect(spy).toHaveBeenCalledWith("%cprevious", "color: #9E9E9E", {
         count: 0,
      })
      expect(spy).toHaveBeenCalledWith("%cevent", "color: #03A9F4", {
         kind: "N",
         name: "count",
         value: 20,
      })
      expect(spy).toHaveBeenCalledWith("%cnext", "color: #4CAF50", {
         count: 20,
      })
   })
})
