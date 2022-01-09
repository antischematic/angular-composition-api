import {
   AfterContentInit,
   ComponentRef,
   Directive,
   OnDestroy,
   ViewContainerRef,
} from "@angular/core"
import { FormContext } from "./form-container.component"
import { FormFieldComponent } from "./form-field.component"

@Directive({
   selector: "form-fields",
})
export class FormFieldsDirective implements AfterContentInit, OnDestroy {
   components: Set<ComponentRef<any>>

   ngAfterContentInit() {
      for (const field of this.context.schema.fields) {
         const component =
            this.viewContainerRef.createComponent(FormFieldComponent)
         component.instance.name = field.name
         component.changeDetectorRef.detectChanges()
      }
   }

   ngOnDestroy() {
      for (const component of this.components) {
         component.destroy()
      }
   }

   constructor(
      private viewContainerRef: ViewContainerRef,
      private context: FormContext,
   ) {
      this.components = new Set()
   }
}
