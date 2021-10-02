import {Component} from "@angular/core"
import {inject, select, use, ViewDef} from "@mmuscat/angular-composition-api"
import {Counter} from "../triangle.component"

function calcStyle(size: number, x: number, y: number) {
   const s = size * 1.3
   return `width: ${s}px; height: ${s}px; left: ${x}px; top: ${y}px; border-radius: ${s / 2}px; line-height: ${s}px;`;
}

function dot() {
   const count = inject(Counter)
   const [hover, hoverChange] = use(false).bindon
   const x = use(0)
   const y = use(0)
   const size = use(0)
   const style = select(() => calcStyle(size(), x(), y()))

   return {
      count,
      hover,
      hoverChange,
      x,
      y,
      size,
      style
   }
}

@Component({
   selector: "app-dot",
   templateUrl: "./dot.component.html",
   styleUrls: ["./dot.component.css"],
   host: {
      "(mouseover)": "hoverChange(true)",
      "(mouseleave)": "hoverChange(false)",
      "[style]": "style"
   },
   inputs: ["x", "y", "size"]
})
export class DotComponent extends ViewDef(dot) {}
