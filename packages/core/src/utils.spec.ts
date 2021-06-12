import {Value} from "./common";
import {Emitter, get, set} from "./utils";
import {Subject} from "rxjs";
import createSpy = jasmine.createSpy;

describe("set", () => {
    it("should set immediate value", () => {
        const value = Value(0)
        set(value, 10)
        expect(value.value).toBe(10)
    })
    it("should copy value", () => {
        const value = Value(0)
        const copy = Value(10)
        set(value, copy)
        expect(value.value).toBe(10)
    })
    it("should use value setter", () => {
        const value = Value(0)
        set(value, (current) => current + 10)
        expect(value.value).toBe(10)
    })
    it("should return a setter function", () => {
        const value = Value(0)
        const setValue = set(value)
        setValue(10)
        setValue((current) => current + 10)
        setValue(Value(10))
        expect(value.value).toBe(10)
    })
    it("should emit to emitters", () => {
        const spy = createSpy()
        const emitter = Emitter<number>()
        emitter.subscribe(spy)
        set(emitter, 10)
        expect(spy).toHaveBeenCalledOnceWith(10)
    })
    it("should emit to void emitters", () => {
        const spy = createSpy()
        const emitter = Emitter<void>()
        emitter.subscribe(spy)
        set(emitter, void 0)
        expect(spy).toHaveBeenCalledOnceWith(void 0)
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