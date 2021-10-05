import {select} from "./select"
import {use} from "./common"

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
         next(value: string) {

         },
         value: double
      })
      const b = select({
         next(value: string) {

         },
         value: a
      })

      const spy = jasmine.createSpy()
      double.subscribe(spy)
      expect(double.value).toBe(20)
      expect(double()).toBe(20)
      expect(spy).toHaveBeenCalledOnceWith(20)
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
