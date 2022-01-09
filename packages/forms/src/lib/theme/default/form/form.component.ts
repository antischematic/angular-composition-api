import { Component } from "@angular/core"
import { FormField } from "../../../form-field.component"
import { FormGroup } from "@angular/forms"

@Component({
   selector: "field-form",
   template: `
      <form [name]="field.name" [formGroup]="field.control">
         <ng-content></ng-content>
      </form>
   `,
})
export class FormComponent {
   constructor(public field: FormField<FormGroup>) {}
}
