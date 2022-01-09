import { NgModule } from "@angular/core"
import { CommonModule } from "@angular/common"
import { DefaultThemeModule } from "./theme/default/default-theme.module"
import { FormFieldModule } from "./form-field.module"

@NgModule({
   imports: [CommonModule, FormFieldModule, DefaultThemeModule],
   exports: [FormFieldModule]
})
export class FormsModule {}
