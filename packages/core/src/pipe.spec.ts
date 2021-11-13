import { pipe } from "./pipe"
import { exhaustAll, map, mapTo, share } from "rxjs/operators"
import { fakeAsync, tick } from "@angular/core/testing"
import { timer } from "rxjs"
import { subscribe, use } from "./common"

describe("pipe", () => {
   it("should create", () => {
      const process = pipe(() => {})
      expect(process).toBeTruthy()
   })
   it("should pipe value", () => {
      const param = {}
      const spy = jasmine.createSpy()
      const process = pipe((value) => value)

      process(param, spy)

      expect(spy).toHaveBeenCalledWith(param)
   })
   it("should use pipe operations", () => {
      const param = 10
      const spy = jasmine.createSpy()
      const process = pipe(
         (value: number) => value,
         map((value) => value * 2),
      )

      process(param, spy)

      expect(spy).toHaveBeenCalledWith(param * 2)
   })
   it("should use higher order operations", fakeAsync(() => {
      const spy = jasmine.createSpy()
      const process = pipe(
         (value: number) => timer(1000).pipe(mapTo(value)),
         exhaustAll(),
         share(),
      )

      process(10, spy)
      expect(spy).not.toHaveBeenCalled()
      tick(1000)
      expect(spy).toHaveBeenCalledWith(10)
      process(20, spy)
      tick(500)
      process(30, spy)
      tick(1000)
      expect(spy).toHaveBeenCalledWith(20)
      expect(spy).not.toHaveBeenCalledWith(30)
      expect(spy).toHaveBeenCalledTimes(2)
   }))
   it("should be resumable", fakeAsync(() => {
      const trigger = use<number>(Function)
      const spy = jasmine.createSpy()
      const process = pipe(
         (value: number) => timer(1000).pipe(mapTo(value)),
         exhaustAll(),
         share(),
      )
      let subs = [] as any[]
      subscribe(trigger, (value) => {
         subs.push(process(value, spy))
      })

      trigger(10)
      expect(spy).not.toHaveBeenCalled()
      tick(1000)
      expect(spy).toHaveBeenCalledWith(10)
      trigger(20)
      tick(500)
      expect(spy).not.toHaveBeenCalledWith(20)
      trigger(30)
      tick(1000)
      expect(spy).toHaveBeenCalledWith(20)
      expect(spy).not.toHaveBeenCalledWith(30)
      expect(spy).toHaveBeenCalledTimes(2)
   }))
})
