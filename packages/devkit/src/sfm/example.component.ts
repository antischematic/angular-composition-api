import { ViewDef } from "@mmuscat/angular-composition-api";
// noinspection BadExpressionStatementJS
import { use, inject, listen, subscribe, ValueToken, } from "@mmuscat/angular-composition-api";
import { EMPTY } from "rxjs";
import { Component, ViewChild } from "@angular/core";
import MyCounter from "./example.component";
export const Child = new ValueToken("Child");
export const API = new ValueToken<any>("API", {
    factory() {
        return {
            save() { },
        };
    },
});
export function ngTemplateContextGuard(dir: MyCounter) {
    dir.save();
}
function setup() {
    const api = inject(API);
    const count = use(0);
    const countChange = listen(count);
    const result = use(EMPTY);
    function increment() {
        countChange(count() + 1);
    }
    function save() {
        api.save(count()).subscribe(result);
    }
    subscribe(count, console.log);
    return {
        count,
        countChange,
        result,
        increment,
        save
    };
}
@Component({
    selector: "my-counter",
    providers: [
        {
            provide: Child,
            useExisting: MyCounter
        }
    ],
    inputs: ["count"],
    outputs: ["countChange"],
    host: ({
        class: "count",
    }),
    queries: ({
        viewChild: new ViewChild("viewChild"),
    }),
    styles: [`
   .button {
      background-color: blue
   }
`],
    template: `
   <div>{{ count }}</div>
   <button class="button" (click)="increment()">
      Increment
   </button>
`
})
export default class MyCounterComponent extends ViewDef(setup) {
    static ngTemplateContextGuard(dir: MyCounter) {
        dir.save();
    }
}
