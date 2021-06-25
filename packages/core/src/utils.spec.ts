import {Value} from "./common";
import {Emitter, get, set} from "./utils";

describe("set", () => {
    it("should set a value", () => {
        const value = Value(0)
        const setValue = set(value)
        setValue(10)
        expect(value.value).toBe(10)
    })
    it("should emit a value", () => {
        const value = Value(0)
        const emitter = Value(0)
        const setCount = set(value, emitter)
        setCount(10)
        expect(value.value).toBe(10)
        expect(emitter.value).toBe(10)
    })
    it("should use a value setter", () => {
        const value = Value(0)
        const setValue = set(value)
        setValue((current) => current + 10)
        expect(value.value).toBe(10)
    })
    it("should accept behavior subjects as values", () => {
        const value = Value(0)
        const setValue = set(value)
        setValue(Value(10))
        expect(value.value).toBe(10)
    })
})

describe("get", () => {
    it("should get the current value", () => {
        const value = Value(0)
        expect(get(value)).toBe(0)
    })
})

describe("Emitter", () => {
    it("should create", () => {
        expect(() => Emitter()).not.toThrow()
    })
})