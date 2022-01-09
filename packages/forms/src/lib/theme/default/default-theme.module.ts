import { NgModule } from "@angular/core"
import { CommonModule } from "@angular/common"
import { TextComponent } from "./text/text.component"
import { FormTheme } from "../../theme"
import { ReactiveFormsModule } from "@angular/forms";
import { SelectComponent } from './select/select.component';
import { TextareaComponent } from './textarea/textarea.component';
import { FieldsetComponent } from './fieldset/fieldset.component'
import { FormsModule } from "../../forms.module"
import { FormFieldModule } from "../../form-field.module";
import { FormComponent } from './form/form.component'

export const types = [
   "button",
   "checkbox",
   "color",
   "date",
   "datetime",
   "email",
   "file",
   "hidden",
   "image",
   "month",
   "number",
   "password",
   "radio",
   "range",
   "reset",
   "search",
   "submit",
   "tel",
   "text",
   "time",
   "url",
   "week",
]

const DEFAULT_THEME: FormTheme = {
   select: {
      component: SelectComponent
   },
   textarea: {
      component: TextareaComponent
   },
   default: {
      component: TextComponent,
      data: {
         type: "text"
      }
   },
}

for (const type of types) {
   DEFAULT_THEME[type] = {
      component: TextComponent,
      data: {
         type
      }
   }
}

@NgModule({
   declarations: [TextComponent, SelectComponent, TextareaComponent, FieldsetComponent, FormComponent],
   imports: [CommonModule, ReactiveFormsModule, FormFieldModule],
   providers: [{
      provide: FormTheme,
      useValue: DEFAULT_THEME
   }],
})
export class DefaultThemeModule {}
