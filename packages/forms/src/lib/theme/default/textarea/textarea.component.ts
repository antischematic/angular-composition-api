import { Component } from "@angular/core"
import { FormField } from "../../../form-field.component"

@Component({
   selector: "field-textarea",
   template: `
      <textarea [name]="field.name" [formControl]="field.control"></textarea>
   `
})
export class TextareaComponent {
   constructor(public field: FormField) {}
}
