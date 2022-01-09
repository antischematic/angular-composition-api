import { Directive, TemplateRef, ViewContainerRef } from "@angular/core"

@Directive({
  selector: '[formTemplate]'
})
export class FormArrayDirective {
  constructor(private vcr: ViewContainerRef, private tpl: TemplateRef<any>) { }
}
