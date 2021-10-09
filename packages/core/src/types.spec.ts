import { ViewDef } from "./core"
import { use } from "./common"
import { isEmitter } from "./utils"
import {
   BehaviorSubject,
   from,
   Observable,
   of,
   ReplaySubject,
   Subject,
} from "rxjs"
import { select } from "./select"
import { TestBed } from "@angular/core/testing"
import {
   Component,
   ContentChild,
   ContentChildren,
   ElementRef,
   QueryList,
   ViewChild,
   ViewChildren,
} from "@angular/core"

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
         const date = use(new Date())
         const map = use(new Map())
         const weakMap = use(new WeakMap())
         const set = use(new Set())
         const weakSet = use(new WeakSet())
         const error = use(new Error())

         // Overloads
         const emitter = use<void>(Function)
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
            value: number,
         })
         const readonlyAccessor = select({
            next: string,
            value: number,
         })
         const accessorEmitter = use(accessor)
         const fromAccessorEmitter = use(emitter)

         // Never
         // noinspection JSUnusedLocalSymbols
         const readonlyNever = use(use(of(1)))

         // Observable interop
         // noinspection JSUnusedLocalSymbols
         const obs1 = from(number)
         // noinspection JSUnusedLocalSymbols
         const obs2 = from(emitter)
         // noinspection JSUnusedLocalSymbols
         const obs3 = from(accessor)
         // noinspection JSUnusedLocalSymbols
         const obs4 = number.pipe()
         // noinspection JSUnusedLocalSymbols
         const obs5 = emitter.pipe()
         // noinspection JSUnusedLocalSymbols
         const obs6: Observable<number> = number
         // noinspection JSUnusedLocalSymbols
         const obs7: Observable<void> = emitter

         // Plain values
         const plainFunction = () => {}
         const plainObject = {}
         const plainArray = [] as any[]
         const plainNumber = 1
         const plainBoolean = true
         const plainString = ""
         const plainRegex = /^S/
         const plainDate = new Date()
         const plainMap = new Map()
         const plainWeakMap = new WeakMap()
         const plainSet = new Set()
         const plainWeakSet = new WeakSet()
         const plainObservable = new Observable()
         const plainBehavior = new BehaviorSubject(0)
         const plainSymbol = Symbol()
         const plainNull = null
         const plainUndefined = undefined

         // Queries
         const contentQuery = use<ElementRef>(ContentChild)
         const viewQuery = use<ElementRef>(ViewChild)
         const contentChildren = use<ElementRef>(ContentChildren)
         const viewChildren = use<ElementRef>(ViewChildren)

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
            readonlyAccessor,
            plainFunction,
            plainObject,
            plainArray,
            plainNumber,
            plainBoolean,
            plainString,
            plainRegex,
            plainDate,
            plainMap,
            plainWeakMap,
            plainSet,
            plainWeakSet,
            plainObservable,
            plainBehavior,
            plainSymbol,
            contentQuery,
            viewQuery,
            contentChildren,
            viewChildren,
            plainNull,
            plainUndefined,
         }
      }

      @Component({
         template: ``,
      })
      class Test extends ViewDef(setup) {}

      TestBed.configureTestingModule({
         declarations: [Test],
      })

      const instance = TestBed.createComponent(Test).componentInstance

      // readonly
      // @ts-expect-error
      instance.readonlyAccessor = 3
      // @ts-expect-error
      instance.emitter = use(Function)
      // @ts-expect-error
      instance.plainBoolean = true
      // @ts-expect-error
      instance.plainFunction = () => {}
      // @ts-expect-error
      instance.contentQuery = undefined
      // @ts-expect-error
      instance.contentChildren = new QueryList()

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
      expect(instance.plainFunction).toEqual(jasmine.any(Function))
      expect(instance.plainObject).toEqual(jasmine.any(Object))
      expect(instance.plainArray).toEqual(jasmine.any(Array))
      expect(instance.plainNumber).toEqual(jasmine.any(Number))
      expect(instance.plainBoolean).toEqual(jasmine.any(Boolean))
      expect(instance.plainString).toEqual(jasmine.any(String))
      expect(instance.plainRegex).toEqual(jasmine.any(RegExp))
      expect(instance.plainDate).toEqual(jasmine.any(Date))
      expect(instance.plainSymbol).toEqual(jasmine.any(Symbol))
      expect(instance.plainMap).toEqual(jasmine.any(Map))
      expect(instance.plainWeakMap).toEqual(jasmine.any(WeakMap))
      expect(instance.plainSet).toEqual(jasmine.any(Set))
      expect(instance.plainWeakSet).toEqual(jasmine.any(WeakSet))
      expect(instance.plainObservable).toEqual(jasmine.any(Observable))
      expect(instance.plainBehavior).toEqual(jasmine.any(BehaviorSubject))
      expect(instance.contentQuery).toEqual(undefined)
      expect(instance.viewQuery).toEqual(undefined)
      expect(instance.contentChildren).toEqual(jasmine.any(QueryList))
      expect(instance.viewChildren).toEqual(jasmine.any(QueryList))
      expect(instance.plainNull).toEqual(null)
      expect(instance.plainUndefined).toEqual(undefined)
   })
})
