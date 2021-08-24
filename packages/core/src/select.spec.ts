import { select } from "./select"
import { use } from "./common"
import createSpy = jasmine.createSpy

describe("select", () => {
   it("should create", () => {
      const value = use(10)
      expect(() => select(value, (val) => val)).not.toThrow()
   })
   it("should use reactive observers", () => {
      const value = use(10)
      const double = select(() => value() * 2)
      const spy = createSpy()
      double.subscribe(spy)
      expect(double.value).toBe(20)
      expect(double()).toBe(20)
      expect(spy).toHaveBeenCalledOnceWith(20)
   })
})
