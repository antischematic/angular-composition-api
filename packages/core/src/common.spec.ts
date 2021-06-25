import {QueryList as NgQueryList} from "@angular/core"
import {Query, QueryList, Value} from "./common";
import {checkPhase} from "./interfaces";
import createSpy = jasmine.createSpy;

describe("QueryList", () => {
    it("should notify observers when query list becomes available", () => {
        const spy = createSpy()
        const subject = QueryList()
        subject.subscribe(spy)
        const queryList = new NgQueryList()
        queryList.reset([1, 2, 3])
        subject.next(queryList)
        expect(spy).toHaveBeenCalledWith(subject)
        expect(spy).toHaveBeenCalledTimes(2)
    })
    it("should notify late subscribers", () => {
        const spy = createSpy()
        const subject = QueryList()
        const queryList = new NgQueryList()
        queryList.reset([1, 2, 3])
        subject.next(queryList)
        subject.subscribe(spy)
        expect(spy).toHaveBeenCalledOnceWith(subject)

    })
    it("should complete observers when query list is destroyed", () => {
        const subject = QueryList()
        const queryList = new NgQueryList()
        const spy = createSpy()
        subject.subscribe({
            next: () => {},
            complete: spy
        })
        queryList.reset([1, 2, 3])
        subject.next(queryList)
        queryList.destroy()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should not send values to unsubscribed observers", () => {
        const subject = QueryList()
        const spy = createSpy()
        subject.changes.subscribe(spy).unsubscribe()
        subject.subscribe(spy).unsubscribe()
        subject.notifyOnChanges()
        subject.notifyOnChanges()
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should set checkPhase", () => {
        // @ts-expect-error
        const staticList = QueryList(true)
        const contentList = QueryList()
        const viewList = QueryList(false)
        expect(staticList[checkPhase]).toBe(0)
        expect(contentList[checkPhase]).toBe(1)
        expect(viewList[checkPhase]).toBe(2)
    })
    it("should notify observers when receiving a new query list", () => {
        const spy = createSpy()
        const subject = QueryList()
        const queryList = new NgQueryList()
        const queryList2 = new NgQueryList()
        const queryList3 = new NgQueryList()
        subject.next(queryList)
        subject.subscribe(spy)
        subject.next(queryList2)
        subject.next(queryList3)
        expect(spy).toHaveBeenCalledWith(subject)
        expect(spy).toHaveBeenCalledTimes(3)
    })
})

describe("Query", () => {
    it("should create", () => {
        expect(() => Query()).not.toThrow()
        expect(Query().value).toBe(void 0)
    })
})

describe("Value", () => {
    it("should create", () => {
        expect(() => Value(0)).not.toThrow()
        expect(Value(0).value).toBe(0)
    })
    it("should throw when directly setting readonly value", () => {
        expect(() => {
            // @ts-expect-error
            // noinspection JSConstantReassignment
            Value(0).value = 10
        }).toThrow()
    })
    it("should set the value", () => {
        const value = Value(0)
        value.next(10)
        expect(value.value).toBe(10)
    })
    it("should notify observers on subscribe", () => {
        const value = Value(0)
        const spy = createSpy()
        value.subscribe(spy)
        value.next(10)
        expect(spy).toHaveBeenCalledWith(0)
        expect(spy).toHaveBeenCalledWith(10)
    })
    it("should notify late subscribers with latest value", () => {
        const value = Value(0)
        const spy = createSpy()
        value.next(10)
        value.subscribe(spy)
        expect(spy).toHaveBeenCalledOnceWith(10)
    })
    it("should accept void values", () => {
        const value = Value<number>()
        value.next(10)
        value.next(void 0)
        expect(value.value).toBe(void 0)
    })
    it("should be assignable to other values", () => {
        const value = Value(0)
        const otherValue = Value(value)

        expect(otherValue.value).toBe(0)
    })
    it("should throw when reading value after unsubscribe", () => {
        const value = Value(10)
        value.unsubscribe()
        expect(() => value.value).toThrow()
    })
})
