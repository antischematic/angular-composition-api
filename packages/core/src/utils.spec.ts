import { isValue, pipe } from "./utils"
import { use } from "./common"
import { map } from "rxjs/operators"

describe("pipe", () => {
   it("should accept observable source", () => {
      const count = use(0)
      const result = pipe(count)
      expect(result.value).toBeUndefined()
   })

   it("should pipe observable source", () => {
      const count = use(10)
      const result = pipe(count, map((value) => value * 2))
      const spy = jasmine.createSpy()

      result.subscribe(spy)

      expect(isValue(result)).toBeTrue()
      expect(spy).toHaveBeenCalledOnceWith(20)
      expect(result()).toBe(20)

      result.subscribe(spy)

      expect(spy).toHaveBeenCalledTimes(2)
   })
})
