import { Component } from "@angular/core"
import { FormField } from "../../../form-field.component"

@Component({
   selector: "field-select",
   template: `
      <select [name]="field.name" [formControl]="field.control">
         <ng-container *ngFor="let field of field.schema.fields">
            <optgroup *ngIf="field.type === OPTGROUP else option" [label]="field.label">
               <ng-container *ngFor="let option of field.fields template option"></ng-container>
            </optgroup>
            <ng-template #option>
               <option [value]="field.default">{{ field.label }}</option>
            </ng-template>
         </ng-container>
      </select>
   `,
})
export class SelectComponent {
   OPTGROUP = "optgroup"
   OPTION = "option"
   constructor(public field: FormField) {}
}
