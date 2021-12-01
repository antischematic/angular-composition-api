import { get } from "./utils"
import { use } from "./common"

describe("get", () => {
   it("should flatten values", () => {
      const doNotUnwrap = use(10)
      const value = get({
         count: use(0),
         nested: {
            disabled: use(false),
            deep: {
               counts: [doNotUnwrap],
            },
         },
      })

      expect(value).toEqual({
         count: 0,
         nested: {
            disabled: false,
            deep: {
               counts: [doNotUnwrap],
            },
         },
      })
   })
})
