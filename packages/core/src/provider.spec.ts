import {Provider} from "./provider";
import {TestBed} from "@angular/core/testing";
import {inject, Injector} from "@angular/core";
import {Inject, Service} from "./core";
import objectContaining = jasmine.objectContaining;

fdescribe("Provider", () => {
    it("should create", () => {
        const ValueProvider = Provider("ValueProvider", { value: 10 })

        TestBed.configureTestingModule({
            providers: [ValueProvider]
        })

        expect(TestBed.inject(ValueProvider)).toEqual({ value: 10 })
    })

    it("should throw if not provided", () => {
        const ValueProvider = Provider("ValueProvider", { value: 10 })
        expect(() => TestBed.inject(ValueProvider)).toThrow()
    })

    it("should throw if no value is set", () => {
        const ValueProvider = Provider<{ value: number }>("ValueProvider")

        TestBed.configureTestingModule({
            providers: [ValueProvider]
        })

        expect(() => TestBed.inject(ValueProvider)).toThrow()
    })

    it("should throw when attempting to set a provider further up the injector tree", () => {
        const ValueProvider = Provider<{ value: number }>("ValueProvider")

        TestBed.configureTestingModule({
            providers: [ValueProvider]
        })

        const injector = Injector.create({
            parent: TestBed.inject(Injector),
            providers: [{
                provide: setValue,
                useFactory: setValue
            }]
        })
        function setValue() {
            ValueProvider.Value({ value: 10 })
        }

        expect(() => injector.get(setValue)).toThrow()
    })

    it("should set the provider value", () => {
        const ValueProvider = Provider<{ value: number }>("ValueProvider")

        TestBed.configureTestingModule({
            providers: [ValueProvider, {
                provide: create,
                useClass: Service(create)
            }]
        })

        function create() {
            ValueProvider.Value({ value: 10 })
        }

        expect(() => TestBed.inject(create)).not.toThrow()
        expect(TestBed.inject(ValueProvider)).toEqual(objectContaining({ value: 10 }))
    })

    it("should set different values for the same provider", () => {
        const ValueProvider = Provider<{ value: number }>("ValueProvider")

        TestBed.configureTestingModule({
            providers: [ValueProvider, {
                provide: parent,
                useClass: Service(parent)
            }]
        })

        const injector = Injector.create({
            parent: TestBed.inject(Injector),
            providers: [{
                provide: ValueProvider,
                useClass: ValueProvider
            }, {
                provide: child,
                useFactory: child
            }]
        })

        function parent() {
            ValueProvider.Value({ value: 10 })
        }

        function child() {
            ValueProvider.Value({ value: 1337 })
        }

        expect(() => TestBed.inject(parent)).not.toThrow()
        expect(() => injector.get(child)).not.toThrow()
        expect(TestBed.inject(ValueProvider)).toEqual(objectContaining({ value: 10 }))
        expect(injector.get(ValueProvider)).toEqual(objectContaining({ value: 1337 }))
    })
})