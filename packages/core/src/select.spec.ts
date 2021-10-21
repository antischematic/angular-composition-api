import { select } from "./select"
import { use } from "./common"
import {of} from "rxjs";

describe("select", () => {
   it("should create", () => {
      const value = use(10)
      const sel = select(value)
      expect(sel).toBeTruthy()
   })
   it("should use reactive observers", () => {
      const value = use(10)
      const double = select(() => value() * 2)

      const a = select({
         next(value: string) {},
         value: double,
      })
      const b = select({
         next(value: string) {},
         value: a,
      })

      const spy = jasmine.createSpy()
      double.subscribe(spy)
      expect(double.value).toBe(20)
      expect(double()).toBe(20)
      expect(spy).toHaveBeenCalledOnceWith(20)
   })
   it("should update", () => {
      const value = use(0)
      const a = select(() => value() * 2)
      const b = select(() => value() * 4)
      const c = select(() => a() + b())

      value(10)

      expect(a.value).toBe(20)
      expect(b.value).toBe(40)
      expect(c.value).toBe(60)
   })
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
})
