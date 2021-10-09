import { ViewDef } from "./core"
import {use} from "./common";
import {isEmitter, isValue} from "./utils";
import {BehaviorSubject, of, ReplaySubject, Subject} from "rxjs";
import {select} from "./select";
import {TestBed} from "@angular/core/testing";
import {Component} from "@angular/core";

describe("types", () => {
   it("should convert types correctly", () => {
      function setup() {
         // Primitives
         const number = use(0)
         const string = use("")
         const boolean = use(true)
         const nullable = use(null)
         const undefineable = use(undefined)
         const symbol = use(Symbol())
         const regex = use(/^$/)

         // Builtins
         const object = use({})
         const array = use([])
         const date = use(new Date)
         const map = use(new Map)
         const weakMap = use(new WeakMap)
         const set = use(new Set)
         const weakSet = use(new WeakSet)
         const error = use(new Error)

         // Overloads
         const emitter = use(Function)
         const valueEmitter = use(number)
         const emitterWithParams = use(() => {})
         const fromObservable = use(of(1))
         const fromSubject = use(new Subject<number>())
         const fromBehavior = use(new BehaviorSubject(1))
         const fromReplay = use(new ReplaySubject<number>())
         const fromEmitter = use(emitter)

         // Select
         const computed = select(() => number())
         const accessor = select({
            next: (val: string | number) => {},
            value: number
         })
         const readonlyAccessor = select({
            next: string,
            value: number
         })
         const accessorEmitter = use(accessor)
         const fromAccessorEmitter = use(emitter)

         // Never
         // noinspection JSUnusedLocalSymbols
         const readonlyNever = use(use(of(1)))

         return {
            number,
            string,
            boolean,
            nullable,
            undefineable,
            symbol,
            regex,
            object,
            array,
            date,
            map,
            weakMap,
            set,
            weakSet,
            error,
            emitter,
            valueEmitter,
            emitterWithParams,
            fromObservable,
            fromSubject,
            fromBehavior,
            fromReplay,
            fromEmitter,
            computed,
            accessor,
            accessorEmitter,
            fromAccessorEmitter,
            readonlyAccessor
         }
      }

      @Component({
         template: ``
      })
      class Test extends ViewDef(setup) {}

      TestBed.configureTestingModule({
         declarations: [Test]
      })

      const instance = TestBed.createComponent(Test).componentInstance

      // readonly
      // @ts-expect-error
      instance.readonlyAccessor = 3
      // @ts-expect-error
      instance.emitter = use(Function)

      // writable
      instance.number = 3
      instance.accessor = 3

      expect(instance.number).toEqual(jasmine.any(Number))
      expect(instance.string).toEqual(jasmine.any(String))
      expect(instance.boolean).toEqual(jasmine.any(Boolean))
      expect(instance.nullable).toEqual(null)
      expect(instance.undefineable).toEqual(undefined)
      expect(instance.symbol).toEqual(jasmine.any(Symbol))
      expect(instance.object).toEqual(jasmine.any(Object))
      expect(instance.array).toEqual(jasmine.any(Array))
      expect(instance.date).toEqual(jasmine.any(Date))
      expect(instance.map).toEqual(jasmine.any(Map))
      expect(instance.weakMap).toEqual(jasmine.any(WeakMap))
      expect(instance.set).toEqual(jasmine.any(Set))
      expect(instance.weakSet).toEqual(jasmine.any(WeakSet))
      expect(instance.error).toEqual(jasmine.any(Error))
      expect(isEmitter(instance.emitter)).toBeTrue()
      expect(isEmitter(instance.valueEmitter)).toBeTrue()
      expect(isEmitter(instance.emitterWithParams)).toBeTrue()
      expect(instance.fromObservable).toEqual(1)
      expect(instance.fromSubject).toEqual(undefined)
      expect(instance.fromBehavior).toEqual(1)
      expect(instance.fromReplay).toEqual(undefined)
      expect(isEmitter(instance.fromEmitter)).toBeTrue()
      expect(instance.computed).toEqual(jasmine.any(Number))
      expect(instance.accessor).toEqual(jasmine.any(Number))
      expect(isEmitter(instance.accessorEmitter)).toBeTrue()
      expect(isEmitter(instance.fromAccessorEmitter)).toBeTrue()
      expect(instance.readonlyAccessor).toEqual(jasmine.any(Number))
   })
})
