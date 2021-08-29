import { provide, ValueToken } from "./provider"
import { TestBed } from "@angular/core/testing"
import { Component, DebugElement } from "@angular/core"
import { By } from "@angular/platform-browser"
import { inject, ViewDef } from "./core"

const Value = new ValueToken("Value", {
   factory() {
      return 0
   }
})

@Component({
   selector: "parent",
   template: `<child></child>`,
   providers: [Value],
})
class Parent {
   constructor() {
      provide(Value, 10)
   }
}

@Component({
   selector: "child",
   template: `<grandchild></grandchild>`,
})
class Child {
   constructor() {}
}

@Component({
   selector: "grandchild",
   template: ``,
})
class GrandChild extends ViewDef(() => {
   return {
      value: inject(Value),
   }
}) {}

describe("provide", () => {
   it("should create", () => {
      expect(() => new ValueToken("Value", {
         factory() {
            return 0
         }
      })).not.toThrow()
   })
   it("should provide a value", () => {
      function test() {
         provide(Value, 10)
      }

      TestBed.configureTestingModule({
         providers: [
            {
               provide: test,
               useFactory: test,
            },
         ],
      })

      TestBed.inject(test)
      const value = TestBed.inject(Value)
      expect(value.get()).toBe(10)
   })
   it("should resolve a value", () => {
      TestBed.configureTestingModule({
         declarations: [Parent, Child, GrandChild],
      })

      const parent = TestBed.createComponent(Parent)
      const child = parent.debugElement.query(By.directive(Child))
      const grandChild = child.query(By.directive(GrandChild))

      expect(grandChild).toBeInstanceOf(DebugElement)
      expect(grandChild.componentInstance.value).toBe(10)
   })
})
