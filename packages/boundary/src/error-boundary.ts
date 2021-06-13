import {
  AfterContentInit,
  ApplicationRef, ChangeDetectorRef,
  ContentChildren,
  Directive,
  DoCheck,
  ElementRef,
  ErrorHandler,
  EventEmitter,
  Inject,
  Injectable,
  Injector, Input,
  NgModule,
  NgZone, OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  PLATFORM_ID,
  QueryList, SimpleChanges, SkipSelf,
  TemplateRef, Type,
  ViewContainerRef,
  ViewRef,
} from "@angular/core"
import {isPlatformBrowser} from "@angular/common"
import {Renderer} from "./renderer";
import {NgCloak} from "./cloak";
import {EventManager} from "@angular/platform-browser";

export class ErrorBoundaryEvent {
  error: any
  closed: boolean
  reset() {
    if (this.closed) return
    this.closed = true
    this.boundary.reset()
  }
  constructor(private boundary: ErrorBoundary, error: any) {
    this.closed = false
    this.error = error
  }
}

@Directive({
  selector: "[fallback]",
  host: {
    "[class.ng-cloak]": "true"
  }
})
export class Fallback {
  ref: any
  constructor(@Optional() @Inject(ElementRef) elementRef: ElementRef, @Optional() @Inject(TemplateRef) templateRef: TemplateRef<any>) {
    this.ref = templateRef ?? elementRef.nativeElement
  }
}

@Directive({
  selector: "[catchError]",
})
export class CatchError {
  view?: ViewRef
  constructor(@Optional() private templateRef: TemplateRef<any>, private viewContainerRef: ViewContainerRef, private errorHandler: ErrorHandler) {}

  ngDoCheck() {
    try {
      this.view?.detectChanges()
    } catch (error) {
      this.errorHandler.handleError(error)
    }
  }

  ngOnDestroy() {
    this.view?.destroy()
  }

  render() {
    this.view?.destroy()
    this.view = this.viewContainerRef.createEmbeddedView(this.templateRef)
    this.view.detach()
    this.view.detectChanges()
  }
}

@Directive({
  selector: "error-boundary, [errorBoundary]",
  exportAs: "errorBoundary",
  providers: [
    Renderer,
    {
      provide: ErrorHandler,
      useExisting: ErrorBoundary
    }
  ]
})
export class ErrorBoundary implements OnChanges, AfterContentInit {
  readonly platformBrowser: boolean

  event: ErrorBoundaryEvent | null

  @Input()
  fallback?: Type<any> | Element | TemplateRef<any>

  get catchError() {
    return this.catchErrorQuery?.first
  }

  get fallbackType() {
    return this.fallback ?? this.fallbackQuery?.first?.ref
  }

  @ContentChildren(Fallback, { descendants: false })
  fallbackQuery?: QueryList<Fallback>

  @ContentChildren(CatchError, { descendants: false })
  catchErrorQuery?: QueryList<CatchError>

  @Output()
  error: EventEmitter<ErrorBoundaryEvent>

  reset() {
    if (this.event) {
      this.event.closed = true
      this.event = null
      this.renderer.renderContent(this.fallbackType)
      if (this.catchError) {
        this.catchError.render()
      }
    }
  }

  handleError(error: any) {
    if (this.platformBrowser && !this.event) {
        this.event = new ErrorBoundaryEvent(this, error)
        this.renderer.renderFallback(this.fallbackType, true)
        this.error.emit(this.event)
    }
    this.errorHandler.handleError(error)
  }

  ngOnChanges(changes: SimpleChanges) {
      const { currentValue, previousValue } = changes.fallback
      this.renderer.renderFallback(previousValue, false)
      this.renderer.renderFallback(currentValue, !!this.event)
  }

  ngAfterContentInit() {
    if (this.catchError) {
      this.catchError.render()
    }
  }

  constructor(
      @SkipSelf() private errorHandler: ErrorHandler,
      private renderer: Renderer,
      private changeDetectorRef: ChangeDetectorRef,
      @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.error = new EventEmitter()
    this.platformBrowser = isPlatformBrowser(platformId)
    this.event = null
  }
}
