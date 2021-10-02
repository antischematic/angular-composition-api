import { select } from "./select"
import { use } from "./common"
import { asyncScheduler, BehaviorSubject, of, scheduled } from "rxjs"
import { fakeAsync, tick } from "@angular/core/testing"

describe("select", () => {
   it("should create", () => {
      const value = use(10)
      const sel = select(value, (val) => val)
      expect(sel).toBeTruthy()
   })
   it("should use reactive observers", () => {
      const value = use(10)
      const double = select(() => value() * 2)
      const spy = jasmine.createSpy()
      double.subscribe(spy)
      expect(double.value).toBe(20)
      expect(double()).toBe(20)
      expect(spy).toHaveBeenCalledOnceWith(20)
   })
   it("should use observable with initial value", fakeAsync(() => {
      const value = scheduled(of(10), asyncScheduler)
      const double = select(value, (val) => val * 2, 0)
      const spy = jasmine.createSpy()
      expect(double.value).toBe(0)
      double.subscribe(spy)
      tick()
      expect(double.value).toBe(20)
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(0)
      expect(spy).toHaveBeenCalledWith(20)
   }))
   it("should use computed value accessor", () => {
      const value = use(0)
      const double = select({
         next: (val: number) => value(val),
         value: () => value() * 2,
      })
      const spy = jasmine.createSpy()
      expect(double.value).toBe(0)
      double.subscribe(spy)
      double(10)
      expect(double.value).toBe(20)
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(20)
   })
   it("should use subject value accessor", () => {
      const value = use(0)
      const double = select({
         next: (val: number) => value(val * 2),
         value: value,
      })
      const spy = jasmine.createSpy()
      expect(double.value).toBe(0)
      double.subscribe(spy)
      double(10)
      expect(double.value).toBe(20)
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(20)
   })
   it("should use BehaviorSubject", () => {
      const value = new BehaviorSubject(0)
      const double = select(value, (val) => val * 2)
      const spy = jasmine.createSpy()
      expect(double.value).toBe(0)
      double.subscribe(spy)
      double(10)
      expect(double.value).toBe(20)
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(0)
      expect(spy).toHaveBeenCalledWith(20)
   })
})
