import { Component } from "@angular/core"
import { FormField } from "../../../form-field.component"

@Component({
   selector: "field-text",
   template: `
      <input [name]="field.name" [type]="field.data.type" [formControl]="field.control"/>
   `,
})
export class TextComponent {
   constructor(public field: FormField) {}
}
