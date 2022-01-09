import { NgModule } from "@angular/core"
import { FormFieldComponent } from "./form-field.component"
import { FormContainerComponent } from "./form-container.component"
import { CommonModule } from "@angular/common";
import { FormFieldsDirective } from './form-fields.directive'
import { ReactiveFormsModule } from "@angular/forms";
import { FormArrayDirective } from './form-array.directive'

@NgModule({
   imports: [CommonModule, ReactiveFormsModule],
   declarations: [FormFieldComponent, FormContainerComponent, FormFieldsDirective, FormArrayDirective],
   exports: [FormFieldComponent, FormContainerComponent, FormFieldsDirective],
})
export class FormFieldModule {}
