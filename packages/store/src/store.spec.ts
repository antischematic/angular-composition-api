import {
   discardPeriodicTasks,
   fakeAsync,
   TestBed,
   tick,
} from "@angular/core/testing"
import { EventEmitter, Provider } from "@angular/core"
import {
   Emitter,
   inject,
   onDestroy,
   onError,
   pipe,
   subscribe,
   use,
} from "@mmuscat/angular-composition-api"
import { Query } from "./query"
import { Command } from "./command"
import { bufferCount, interval, map } from "rxjs"
import { Store } from "./store"
import { Saga } from "./saga"

abstract class Service {}

function addProvider(provider: Provider) {
   TestBed.configureTestingModule({
      providers: [provider],
   })
}

describe("Store", () => {
   it("should create", () => {
      const store = new Store("app", {
         tokens: [],
      })
      expect(store).toBeTruthy()
   })

   it("should get query", () => {
      const Count = new Query("count", () => use(0))
      const AppStore = new Store("app", {
         tokens: [Count],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            const get = inject(AppStore)
            const count = get(Count)

            expect(count.value).toBe(0)
         },
      })
      TestBed.inject(Service)
   })

   it("should derive query", () => {
      const spy = jasmine.createSpy()
      const Count = new Query("count", () => use(10))
      const Double = new Query("double", () => {
         return pipe(
            inject(Count),
            map((value) => value * 2),
         )
      })
      const AppStore = new Store("app", {
         tokens: [Count, Double],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            const get = inject(AppStore)
            const count = get(Count)
            const double = get(Double)
            subscribe(double, spy)
            count(20)
         },
      })
      TestBed.inject(Service)
      expect(spy).toHaveBeenCalledWith(20)
      expect(spy).toHaveBeenCalledWith(40)
   })

   it("should get command", () => {
      const Log = new Command("log", (emitter: Emitter<string>) => emitter)
      const AppStore = new Store("app", {
         tokens: [Log],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            const get = inject(AppStore)
            const log = get(Log)
            expect(log).toBeInstanceOf(EventEmitter)
         },
      })
      TestBed.inject(Service)
   })

   it("should observe command", () => {
      const spy = jasmine.createSpy()
      const Double = new Command("log", (emitter: Emitter<number>) => {
         return pipe(
            emitter,
            map((value) => value * 2),
         )
      })
      const AppStore = new Store("app", {
         tokens: [Double],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            const get = inject(AppStore)
            const double = get(Double)
            subscribe(double, spy)
            double(10)
         },
      })
      TestBed.inject(Service)
      expect(spy).toHaveBeenCalledOnceWith(20)
   })

   it("should run saga", fakeAsync(() => {
      const spy = jasmine.createSpy()
      const Count = new Query("count", () => use(interval(1000)))
      const Buffer = new Saga("buffer", (events) => {
         return pipe(
            events(Count),
            map((event) => event.value),
            bufferCount(5),
         )
      })
      const AppStore = new Store("app", {
         tokens: [Count, Buffer],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            const get = inject(AppStore)
            const buffer = get(Buffer)

            subscribe(buffer, spy)
         },
      })
      TestBed.inject(Service)

      tick(7000)
      discardPeriodicTasks()
      expect(spy).toHaveBeenCalledOnceWith([0, 1, 2, 3, 4])
   }))

   it("should be composable", () => {
      const query = new Query("count", () => {
         const value = use(0)
         onDestroy(() => {})
         onError(value, () => {})
         return value
      })
      const command = new Command("command", () => {
         const value = use(0)
         onDestroy(() => {})
         onError(value, () => {})
         return value
      })
      const saga = new Saga("saga", () => {
         const value = use(0)
         onDestroy(() => {})
         onError(value, () => {})
         return value
      })
      const AppStore = new Store("app", {
         tokens: [query, command, saga],
      })
      addProvider(AppStore.Provider)
      expect(() => TestBed.inject(AppStore)).not.toThrow()
   })
})
