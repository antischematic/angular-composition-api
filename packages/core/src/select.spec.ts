import { combine, select } from "./select"
import { subscribe, use } from "./common"

describe("select", () => {
   it("should create", () => {
      const value = use(10)
      const sel = select(() => value())
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

describe("combine", () => {
   it("should unwrap values", () => {
      const count = use(0)
      const disabled = use(false)
      const plain = "plain"
      const state = combine({
         count,
         nested: {
            disabled,
            plain,
         },
      })
      expect(state()).toEqual({
         count: 0,
         nested: {
            disabled: false,
            plain: "plain",
         },
      })
   })
   it("should assign values", () => {
      const count = use(0)
      const disabled = use(false)
      const plain = "plain"
      const object = {
         count,
         nested: {
            disabled,
            plain,
         },
      }
      const state = combine(object)
      const expected = {
         count: 10,
         nested: {
            disabled: true,
            plain: "still plain",
         },
      }

      state(expected)

      expect(state()).toEqual(expected)
      expect(count()).toBe(10)
      expect(disabled()).toBe(true)
      expect(object.nested.plain).toBe("still plain")
   })
   it("should subscribe values", () => {
      const spy = jasmine.createSpy()
      const count = use(0)
      const disabled = use(false)
      const plain = "plain"
      const object = {
         count,
         nested: {
            disabled,
            plain,
         },
      }
      const state = combine(object)
      const expected = {
         count: 10,
         nested: {
            disabled: true,
            plain: "still plain",
         },
      }

      subscribe(state, spy)

      state(expected)

      expect(state()).toEqual(expected)
      expect(count()).toBe(10)
      expect(disabled()).toBe(true)
      expect(object.nested.plain).toBe("still plain")
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith({
         count: 0,
         nested: {
            disabled: false,
            plain,
         },
      })
      expect(spy).toHaveBeenCalledWith(expected)
   })

   it("should be triggered by upstream value changes", () => {
      const count = use(0)
      const disabled = use(false)
      const state = combine({
         count,
         disabled,
      })

      count(10)
      disabled(true)

      expect(state()).toEqual({
         count: 10,
         disabled: true,
      })
   })

   it("should accept Value", () => {
      const count = use(0)
      const state = combine(count)

      state(10)
      expect(count()).toBe(10)
      count(20)
      expect(state()).toBe(20)
   })
})
