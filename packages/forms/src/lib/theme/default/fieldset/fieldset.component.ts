import { Component } from "@angular/core"
import { FormField } from "../../../form-field.component"

@Component({
   selector: "field-fieldset",
   template: `
      <fieldset [name]="field.name" [disabled]="field.disabled">
         <legend>{{field.schema.label}}</legend>
         <form-fields></form-fields>
      </fieldset>
   `,
})
export class FieldsetComponent {
   constructor(public field: FormField) {}
}
