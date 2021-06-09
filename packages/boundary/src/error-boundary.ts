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
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  PLATFORM_ID,
  QueryList, SkipSelf,
  TemplateRef, Type,
  ViewContainerRef,
  ViewRef,
} from "@angular/core"
import {isPlatformBrowser} from "@angular/common"
import {Renderer} from "./renderer";
import {NgCloak} from "./cloak";

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
export class Fallback {}

@Directive({
  selector: "[catchError]",
})
export class CatchError {
  view?: ViewRef
  constructor(@Optional() private templateRef: TemplateRef<any>, private viewContainerRef: ViewContainerRef, private errorHandler: ErrorHandler, private changeDetectorRef: ChangeDetectorRef) {}

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
export class ErrorBoundary implements AfterContentInit {
  readonly platformBrowser: boolean

  event: ErrorBoundaryEvent | null

  @Input()
  fallback?: Type<any> | Element | TemplateRef<any>

  get catchError() {
    return this.catchErrorQuery?.first
  }

  @ContentChildren(Fallback, { descendants: false, read: ElementRef })
  fallbackQuery?: QueryList<ElementRef>

  @ContentChildren(CatchError, { descendants: false })
  catchErrorQuery?: QueryList<CatchError>

  @Output()
  error: EventEmitter<ErrorBoundaryEvent>

  reset() {
    if (this.event) {
      this.event.closed = true
      this.event = null
      this.renderer.renderChildren()
      if (this.catchError) {
        this.catchError.render()
      }
    }
  }

  handleError(error: any) {
    if (this.event) {
      this.rootErrorHandler.handleError(error)
      return
    }
    try {
      const fallback = this.fallback ?? this.fallbackQuery?.first.nativeElement
      if (fallback && this.platformBrowser) {
        if (!this.event) {
          this.event = new ErrorBoundaryEvent(this, error)
          this.renderer.render(fallback)
          this.error.emit(this.event)
        }
        if (!this.rootErrorHandler.timeout) {
          this.rootErrorHandler.handleError(error)
        }
      } else {
        this.errorHandler.handleError(error)
      }
    } catch (error) {
      this.errorHandler.handleError(error)
    }
  }

  ngAfterContentInit() {
    if (this.catchError) {
      this.catchError.render()
    }
    this.renderer.renderChildren()
  }

  constructor(
      @SkipSelf() private errorHandler: ErrorHandler,
      private rootErrorHandler: BoundaryHandler,
      private renderer: Renderer,
      private changeDetectorRef: ChangeDetectorRef,
      @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.error = new EventEmitter()
    this.platformBrowser = isPlatformBrowser(platformId)
    this.event = null
  }
}

@Injectable({ providedIn: "root" })
export class BoundaryHandler implements ErrorHandler {
  timeout?: number
  errors = new Set()
  handleError(error: any) {
    this.errors.add(error)
    if (this.timeout) return
    const errors = [...this.errors]
    const stacks = new Set(errors.map(() => error?.stack))
    // dedupe repeated errors due to recursion
    const displayErrors = [...this.errors].filter((err: any, i, arr) => {
      if (err?.stack) {
        if (stacks.has(err.stack)) {
          stacks.delete(err.stack)
          return true
        }
        return false
      }
      return true
    })
    this.errors.clear()
    for (const error of displayErrors) {
      console.error(error)
    }
    const appRef = this.injector.get(ApplicationRef)
    this.zone.runOutsideAngular(() => {
      this.timeout = setTimeout(() => {
        this.timeout = void 0
      })
    })
    appRef.tick()
  }
  constructor(private injector: Injector, private zone: NgZone) {}
}
