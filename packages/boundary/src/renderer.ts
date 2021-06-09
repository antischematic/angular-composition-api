import {
    ComponentFactoryResolver,
    ElementRef,
    Injectable,
    Renderer2,
    TemplateRef,
    Type,
    ViewContainerRef
} from "@angular/core";

@Injectable()
export class Renderer {
    remove: Function
    render(type: Type<any> | Element | TemplateRef<any>) {
        this.remove()
        if (type instanceof Element) {
            const nativeElement = this.elementRef.nativeElement
            const parent = this.renderer.parentNode(nativeElement)
            const nextSibling = this.renderer.nextSibling(nativeElement)
            this.renderer.insertBefore(parent, type, nextSibling)
            this.renderer.removeClass(type, "ng-cloak")
            this.remove = () => {
                this.renderer.appendChild(nativeElement, type)
                this.renderer.addClass(type, "ng-cloak")
            }
        }
        else if (type instanceof TemplateRef) {
            const viewRef = this.viewContainerRef.createEmbeddedView(type)
            this.remove = () => viewRef.destroy()
        }
        else if (typeof type === "function") {
            const factory = this.componentFactoryResolver.resolveComponentFactory(type)
            const viewRef = this.viewContainerRef.createComponent(factory)
            this.remove = () => viewRef.destroy()
        } else {
            throw new Error("Unsupported type")
        }
    }

    renderChildren() {
        const nativeElement = this.elementRef.nativeElement
        this.remove()
        this.renderer.removeClass(nativeElement, "ng-cloak")
        this.remove = () => this.renderer.addClass(nativeElement, "ng-cloak")
    }

    ngOnDestroy() {
        this.remove()
    }

    constructor(private componentFactoryResolver: ComponentFactoryResolver, private renderer: Renderer2, private viewContainerRef: ViewContainerRef, private elementRef: ElementRef) {
        this.remove = () => {}
    }
}
