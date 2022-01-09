import {
   AfterViewInit,
   Attribute,
   ChangeDetectorRef,
   Component,
   Injector,
   Input,
   OnInit,
} from "@angular/core"
import { FieldSchema, FormContext } from "./form-container.component"
import { ThemeData } from "./theme"
import { AbstractControl, FormControl } from "@angular/forms"
import { FormSchema, Schema } from "./schema"

export abstract class FormField<T = FormControl> {
   abstract name: string
   abstract disabled: boolean
   abstract data: ThemeData
   abstract control: T
   abstract schema: Schema
}

export function provideFormField(
   name: string,
   schema: FieldSchema,
   control: AbstractControl,
   data: ThemeData = {},
) {
   return {
      provide: FormField,
      useValue: {
         name,
         data,
         schema,
         control,
         get label() {
            return schema.label
         },
         get disabled() {
            return control.disabled
         },
      },
   }
}

function createAsyncValidator(schema: FieldSchema) {
   return async function (control: AbstractControl) {
      return null
   }
}

@Component({
   selector: "form-field",
   template: `
      <ng-container
         *ngComponentOutlet="component; injector: injector"
      ></ng-container>
      <ng-content></ng-content>
   `,
})
export class FormFieldComponent implements AfterViewInit, OnInit {
   @Input()
   name: string

   get component() {
      return this.context.getFieldComponent(this.name)
   }

   get injector() {
      const { name, context, parentInjector } = this
      const control = context.getControl(name)
      const schema = context.getFieldSchema(name)
      const data = context.getThemeData(name)
      return Injector.create({
         parent: parentInjector,
         providers: [provideFormField(name, schema, control, data)],
      })
   }

   ngOnInit() {
      const { context, name } = this
      if (!name) {
         throw new Error(`name attribute is required`)
      }
      const { nullable, default: defaultValue } = context.getFieldSchema(
         name,
      )
      if (!nullable && (defaultValue === null || defaultValue === void 0)) {
         throw new Error(
            `${name} is not nullable and has no default value`,
         )
      }
      context.setControl(
         name,
         new FormControl(defaultValue, {
            asyncValidators: [createAsyncValidator(context.getFieldSchema(name))],
         }),
      )
   }

   ngAfterViewInit() {
      this.changeDetectorRef.detach()
   }

   constructor(
      private context: FormContext,
      private parentInjector: Injector,
      private changeDetectorRef: ChangeDetectorRef,
   ) {
      this.name = ""
   }
}
