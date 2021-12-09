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
   isEmitter,
   onDestroy,
   onError,
   pipe,
   subscribe,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { Query } from "./query"
import { Command } from "./command"
import { bufferCount, interval, map, merge, of, switchMap } from "rxjs"
import { Store } from "./store"
import { Effect } from "./effect"
import { action } from "./utils"
import { StoreLog } from "./plugins/store-log"
import createSpy = jasmine.createSpy

abstract class Service {}

function addProvider(provider: Provider) {
   TestBed.configureTestingModule({
      providers: [provider],
   })
}

describe("Store", () => {
   it("should create", () => {
      const store = new Store("app", {
         tokens: [new ValueToken("count")],
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
            const {
               query: { count },
            } = inject(AppStore)
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
            const {
               query: { count, double },
            } = inject(AppStore)
            subscribe(double, spy)
            count(20)
         },
      })
      TestBed.inject(Service)
      expect(spy).toHaveBeenCalledWith(20)
      expect(spy).toHaveBeenCalledWith(40)
   })

   it("should get command", () => {
      const Log = new Command("log", action<string>())
      const AppStore = new Store("app", {
         tokens: [Log],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            const {
               command: { log },
            } = inject(AppStore)
            expect(log).toBeInstanceOf(EventEmitter)
         },
      })
      TestBed.inject(Service)
   })

   it("should observe command", () => {
      const spy = jasmine.createSpy()
      const Double = new Command("double", (emitter: Emitter<number>) => {
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
            const {
               command: { double },
            } = inject(AppStore)
            subscribe(double, spy)
            double(10)
         },
      })
      TestBed.inject(Service)
      expect(spy).toHaveBeenCalledOnceWith(20)
   })

   it("should run effect", fakeAsync(() => {
      const spy = jasmine.createSpy()
      const Count = new Query("count", () => use(interval(1000)))
      const Buffer = new Effect("buffer", () => {
         return pipe(inject(Count), bufferCount(5))
      })
      const AppStore = new Store("app", {
         tokens: [Count, Buffer],
      })
      addProvider(AppStore.Provider)
      addProvider({
         provide: Service,
         useFactory() {
            inject(AppStore)
         },
      })
      TestBed.inject(Buffer.Token).subscribe(spy)
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
      const effect = new Effect("effect", () => {
         const value = use(0)
         onDestroy(() => {})
         onError(value, () => {})
         return value
      })
      const AppStore = new Store("app", {
         tokens: [query, command, effect],
      })
      addProvider(AppStore.Provider)
      expect(() => TestBed.inject(AppStore)).not.toThrow()
   })

   it("should be strongly typed", () => {
      const Count = new Query("count", () => use(10))
      const Double = new Command("double", () => {
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
            const {
               state,
               query: { count },
               command: { double },
            } = inject(AppStore)

            state({
               count: 20,
            })

            return {
               state,
               count,
               double,
            }
         },
      })
      const result = TestBed.inject(Service) as any
      expect(result.state.value.count).toBe(20)
      expect(result.count.value).toBe(20)
      expect(isEmitter(result.double)).toBeTrue()
   })

   it("should dispatch from a effect", () => {
      const spy = createSpy()
      const spy2 = createSpy()
      const query = new Query("query", () => use<number>(0))
      const command = new Command("command", action<string>())
      const effect = new Effect("effect", ({ event, dispatch }) => {
         return event(query).pipe(
            switchMap(() => merge(of("BOGUS").pipe(dispatch(command)))),
         )
      })
      const AppStore = new Store("app", {
         tokens: [query, command, effect],
         plugins: [StoreLog],
      })
      addProvider(AppStore.Provider)
      subscribe(TestBed.inject(query), spy)
      subscribe(TestBed.inject(command), spy2)
      const {
         query: { query: send },
      } = TestBed.inject(AppStore.Token)
      send(20)
      expect(spy2).toHaveBeenCalledOnceWith("BOGUS")
   })
})
