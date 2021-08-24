import {
   ComponentFactoryResolver,
   ComponentRef,
   ElementRef,
   Injectable,
   Renderer2,
   TemplateRef,
   Type,
   ViewContainerRef,
   ViewRef,
} from "@angular/core"

@Injectable()
export class Renderer {
   viewRef?: ViewRef | ComponentRef<any>
   renderFallback(
      type: Type<any> | Element | TemplateRef<any>,
      render: boolean,
   ) {
      if (type instanceof Element) {
         this.toggleElement(type, render)
      } else if (type instanceof TemplateRef) {
         this.toggleTemplate(type, render)
      } else if (typeof type === "function") {
         this.toggleComponent(type, render)
      }
      this.renderer.addClass(this.elementRef.nativeElement, "ng-cloak")
   }

   toggleComponent(type: Type<any>, render: boolean) {
      if (render) {
         const factory =
            this.componentFactoryResolver.resolveComponentFactory(type)
         this.viewRef = this.viewContainerRef.createComponent(factory)
      } else {
         this.viewRef?.destroy()
         delete this.viewRef
      }
   }

   toggleTemplate(type: TemplateRef<any>, render: boolean) {
      if (render) {
         this.viewContainerRef.createEmbeddedView(type)
      } else {
         this.viewRef?.destroy()
         delete this.viewRef
      }
   }

   toggleElement(type: Element, render: boolean) {
      const nativeElement = this.elementRef.nativeElement
      const parent = this.renderer.parentNode(nativeElement)
      const nextSibling = this.renderer.nextSibling(nativeElement)
      if (render) {
         this.renderer.insertBefore(parent, type, nextSibling)
         this.renderer.removeClass(type, "ng-cloak")
      } else {
         this.renderer.appendChild(nativeElement, type)
         this.renderer.addClass(type, "ng-cloak")
      }
   }

   renderContent(type: Type<any> | Element | TemplateRef<any>) {
      const nativeElement = this.elementRef.nativeElement
      this.renderFallback(type, false)
      this.renderer.removeClass(nativeElement, "ng-cloak")
   }

   constructor(
      private componentFactoryResolver: ComponentFactoryResolver,
      private renderer: Renderer2,
      private viewContainerRef: ViewContainerRef,
      private elementRef: ElementRef,
   ) {}
}
