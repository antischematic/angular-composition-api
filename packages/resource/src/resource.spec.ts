import {fakeAsync, TestBed, tick} from "@angular/core/testing";
import {Service, Subscribe} from "@mmuscat/angular-composition-api";
import {mergeMap} from "rxjs/operators";
import {interval, NEVER, of, timer} from "rxjs";
import {cache, Resource, resources} from "./resource";
import {NgModuleRef} from "@angular/core";
import createSpy = jasmine.createSpy;

function runInContext(fn: (after: Function) => any) {
    return fakeAsync(() => {
        let assert = () => {}
        function after(fn: () => {}) {
            assert = fn
        }
        const Run = Service(() => fn(after))
        TestBed.configureTestingModule({
            providers: [Run]
        })
        TestBed.inject(Run)
        TestBed.inject(NgModuleRef).destroy()
        assert()
    })
}

describe("Resource", () => {
    afterEach(() => {
        resources.clear()
        cache.clear()
    })
    it("should create", runInContext(() => {
        function fetcher() {
            return mergeMap(() => {
                return interval(1000)
            })
        }
        expect(() => Resource(["key", of(1)], fetcher)).not.toThrow()
    }))
    it("should receive key argument", runInContext(() => {
        const spy = createSpy()
        Resource(["key", of(1)], spy)
        expect(spy).toHaveBeenCalledOnceWith("key")
    }))
    it("should have initial state", runInContext(() => {
        const resource = Resource(["key", NEVER], () => {
            return () => NEVER
        })
        expect(resource).toEqual(jasmine.objectContaining({
            hasError: false,
            errorThrown: null,
            pending: false,
            value: void 0
        }))
    }))
    it("should receive params", runInContext((assert) => {
        const spy = createSpy()
        const resource = Resource(["key", of(1)], () => {
            return mergeMap((v) => {
                spy(v)
                return of(1)
            })
        })

        Subscribe(resource)

        assert(() => {
            expect(spy).toHaveBeenCalledOnceWith(1)
        })
    }))
    it("should toggle pending state", runInContext((assert) => {
        const resource = Resource(["key", of(1)], () => {
            return mergeMap(() => {
                return timer(1000)
            })
        })

        Subscribe(resource)

        assert(() => {
            tick(500)
            expect(resource.pending).toBe(true)
            tick(500)
            expect(resource.pending).toBe(false)
        })
    }))
    it("should get values from cache", runInContext((assert) => {
        const resource = Resource(["key", of(1)], () => {
            return mergeMap(() => {
                return timer(1000)
            })
        })

        Subscribe(resource)

        assert(() => {
            tick(500)
            expect(resource.pending).toBe(true)
            tick(500)
            expect(resource.pending).toBe(false)
        })
    }))
})
