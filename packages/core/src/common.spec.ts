import {QueryListSubject, ValueSubject} from "./common";
import createSpy = jasmine.createSpy;
import {QueryList} from "@angular/core";

describe("QueryListSubject", () => {
    it("should notify observers when query list becomes available", () => {
        const spy = createSpy()
        const subject = new QueryListSubject(0)
        subject.subscribe(spy)
        const queryList = new QueryList()
        queryList.reset([1, 2, 3])
        subject.next(queryList)
        expect(spy).toHaveBeenCalledOnceWith(subject)
    })
    it("should notify late subscribers", () => {
        const spy = createSpy()
        const subject = new QueryListSubject(0)
        const queryList = new QueryList()
        queryList.reset([1, 2, 3])
        subject.next(queryList)
        subject.subscribe(spy)
        expect(spy).toHaveBeenCalledOnceWith(subject)

    })
    it("should complete observers when query list is destroyed", () => {
        const subject = new QueryListSubject(0)
        const queryList = new QueryList()
        const spy = createSpy()
        subject.subscribe({
            next: () => {},
            complete: spy
        })
        queryList.reset([1, 2, 3])
        subject.next(queryList)
        queryList.destroy()
        expect(subject.observers.length).toBe(0)
        expect(spy).toHaveBeenCalledTimes(1)
    })
})

describe("ValueSubject", () => {
    it("should create", () => {
        expect(() => new ValueSubject(0)).not.toThrow()
        expect(new ValueSubject(0).value).toBe(0)
    })
    it("should throw when directly setting readonly value", () => {
        expect(() => {
            // @ts-expect-error
            // noinspection JSConstantReassignment
            new ValueSubject(0).value = 10
        }).toThrow()
    })
    it("should set the value", () => {
        const value = new ValueSubject(0)
        value.next(10)
        expect(value.value).toBe(10)
    })
    it("should notify observers on subscribe", () => {
        const value = new ValueSubject(0)
        const spy = createSpy()
        value.subscribe(spy)
        value.next(10)
        expect(spy).toHaveBeenCalledWith(0)
        expect(spy).toHaveBeenCalledWith(10)
    })
    it("should notify late subscribers with latest value", () => {
        const value = new ValueSubject(0)
        const spy = createSpy()
        value.next(10)
        value.subscribe(spy)
        expect(spy).toHaveBeenCalledOnceWith(10)
    })
})
