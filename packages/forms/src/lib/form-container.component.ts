import {
   AfterContentChecked,
   Component, ContentChild,
   Directive, EventEmitter,
   Inject,
   Injectable,
   InjectionToken,
   Input, OnChanges, OnInit,
   Optional, Output,
   SimpleChanges,
   SkipSelf,
   Type,
} from "@angular/core"
import { AbstractControl, FormArray, FormControl, FormGroup } from "@angular/forms"
import { FormTheme } from "./theme"
import { FormSchema } from "./schema"
import { Observable } from "rxjs"
import { FormArrayDirective } from "./form-array.directive"

export interface FieldSchema {
   name: string
   label?: string
   type?: string
   default?: any
   nullable?: boolean
   data?: {
      [key: string]: any
   }
   fields?: FieldSchema[]
}

const EMPTY_SCHEMA = new FormSchema("EMPTY_SCHEMA", {
   name: "empty",
   label: "Empty",
   fields: [],
})

const EMPTY_VALUE = {}

const EMPTY_MODEL = new FormGroup({})

@Injectable()
export class FormContext {
   schema: FormSchema
   theme: FormTheme
   model: FormGroup | FormArray
   setSchema(schema: FormSchema) {
      this.schema = schema
   }
   setTheme(theme: FormTheme) {
      this.theme = theme
   }
   setModel(model: FormGroup | FormArray) {
      this.model = model
   }
   getFieldSchema(name: string): FieldSchema {
      return this.schema.findFieldByName(name)
   }
   getFieldTheme(name: string) {
      const field = this.getFieldSchema(name)
      return this.theme[field?.type ?? "default"]
   }
   getFieldComponent(name: string): Type<any> {
      return this.getFieldTheme(name).component
   }
   getThemeData(name: string) {
      return this.getFieldTheme(name).data
   }
   getControl(name: string) {
      if (this.model.get(name)) {
         return this.model.get(name)!
      } else {
         throw new Error(`Context does not contain form control "${name}"`)
      }
   }
   setControl(name: string | number, control: AbstractControl) {
      this.model.setControl(name as string & number, control)
   }
   constructor(@Inject(FormTheme) theme: FormTheme) {
      this.schema = EMPTY_SCHEMA
      this.model = EMPTY_MODEL
      this.theme = theme
   }
}

@Injectable({ providedIn: "root" })
class HttpTransport {}

const DEFAULT_OPTIONS = {
   transport: HttpTransport,
}

export const FormConfig = new InjectionToken("FormConfig", {
   factory() {
      return DEFAULT_OPTIONS
   },
})

@Component({
   selector: "form-container",
   template: `
      <form *ngIf="parent === null else content" [name]="schema.name" [formGroup]="model!" (ngSubmit)="ngSubmit.emit($event)">
         <ng-container *ngTemplateOutlet="content"></ng-container>
      </form>
      <ng-template #content>
         <ng-container *ngIf="!formArray else array">
            <ng-content></ng-content>
         </ng-container>
      </ng-template>
   `,
   providers: [FormContext],
})
export class FormContainerComponent<T extends { [key: string]: any }> implements OnChanges, AfterContentChecked {
   @Input() schema: FormSchema
   @Input() value: T

   @Output()
   ngSubmit: EventEmitter<SubmitEvent>

   @Output()
   valueChange: Observable<T>

   @Output()
   statusChange: Observable<'VALID' | 'INVALID' | 'PENDING' | 'DISABLED' | string>

   @ContentChild(FormArrayDirective)
   formArray?: FormArrayDirective

   changes?: SimpleChanges

   get model() {
      return this.context.model
   }

   get parent() {
      return this.parentContext
   }

   get controls() {
      return this.context.model.controls
   }

   get status() {
      return this.context.model.status
   }

   flushChanges(): SimpleChanges {
      const { changes } = this
      this.changes = undefined
      return changes ?? {}
   }

   setSchema() {
      if (this.schema === EMPTY_SCHEMA) {
         throw new Error("schema is required")
      }
      if (this.value === EMPTY_VALUE) {
         throw new Error("value is required")
      }
      this.context.setSchema(this.schema)
      let model
      switch (this.context.schema.type) {
         case "array": {
            model = new FormArray([])
            break
         }
         default: {
            model = new FormGroup({})
         }
      }
      this.context.setModel(model)
   }

   ngOnChanges(changes: SimpleChanges) {
      this.changes = changes
      if (changes.schema) {
         this.setSchema()
      }
   }

   ngAfterContentChecked() {
      const changes = this.flushChanges()
      if (changes.value) {
         this.model.patchValue(changes.value.currentValue)
      }
   }

   constructor(
      private context: FormContext,
      @Optional() @SkipSelf() private parentContext: FormContext | null,
      @Inject(FormConfig) private config: any,
   ) {
      this.schema = EMPTY_SCHEMA
      this.value = EMPTY_VALUE as T
      this.valueChange = this.model.valueChanges
      this.statusChange = this.model.statusChanges
      this.ngSubmit = new EventEmitter<SubmitEvent>()
   }
}
