import {
  AfterContentInit,
  ApplicationRef,
  ChangeDetectorRef,
  ContentChild,
  ContentChildren,
  Directive,
  DoCheck,
  ElementRef,
  ErrorHandler,
  EventEmitter,
  Inject,
  Injectable,
  Injector,
  NgModule,
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  PLATFORM_ID,
  QueryList,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  ViewRef,
} from "@angular/core"
import { isPlatformBrowser } from "@angular/common"

export abstract class Fallback {
  abstract handleError(error: any): void
  abstract reset(): void
}

export abstract class CatchError {
  abstract handleError(error: any): void
  abstract reset(options?: { create: boolean }): void
}

export class ErrorBoundaryEvent {
  error: any
  closed: boolean
  reset(options?: { create: boolean }) {
    if (this.closed) return
    this.closed = true
    this.boundary.reset(options)
  }
  constructor(private boundary: ErrorBoundary, error: any) {
    this.closed = false
    this.error = error
  }
}

@Directive({
  selector: "[fallback]",
  providers: [
    {
      provide: Fallback,
      useExisting: DefaultFallback,
    },
  ],
})
export class DefaultFallback implements Fallback, OnInit, OnDestroy {
  view?: ViewRef
  comment: Comment

  handleError(error: any) {
    this.substitute(this.elementRef.nativeElement, this.comment, false)
    if (this.templateRef) {
      this.view = this.viewContainerRef.createEmbeddedView(this.templateRef, {
        $implicit: error,
      })
    }
  }

  reset() {
    this.substitute(this.comment, this.elementRef.nativeElement, true)
  }

  substitute(elementToInsert: any, elementToRemove: any, isHost: boolean) {
    const { renderer } = this
    const parent = renderer.parentNode(elementToRemove)

    renderer.insertBefore(parent, elementToInsert, elementToRemove)
    renderer.removeChild(parent, elementToRemove, isHost)
  }

  ngOnInit() {
    this.reset()
  }

  ngOnDestroy() {
    this.view?.destroy()
  }

  constructor(
    private viewContainerRef: ViewContainerRef,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    @Optional() private templateRef: TemplateRef<any> | null,
  ) {
    this.comment = renderer.createComment("Fallback")
  }
}

@Directive({
  selector: "[catchError]",
  providers: [
    {
      provide: CatchError,
      useExisting: DefaultCatchError,
    },
    {
      provide: ErrorHandler,
      useExisting: DefaultCatchError,
    },
  ],
})
export class DefaultCatchError
  implements CatchError, DoCheck, AfterContentInit, OnDestroy
{
  view?: ViewRef

  handleError(error: unknown) {
    if (this.view) {
      const index = this.viewContainerRef.indexOf(this.view)
      if (index > -1) {
        this.viewContainerRef.detach(this.viewContainerRef.indexOf(this.view))
      }
    }
    this.boundary.handleError(error)
  }

  reset(options?: { create: boolean }) {
    try {
      if (options?.create) {
        this.destroy()
        this.view = this.templateRef.createEmbeddedView({})
        this.viewContainerRef.clear()
        this.viewContainerRef.insert(this.view)
        this.view.detectChanges()
        this.view.detach()
      } else if (this.view) {
        this.viewContainerRef.insert(this.view)
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  destroy() {
    try {
      if (this.view && !this.view.destroyed) {
        this.view.destroy()
      }
    } catch (error) {
      console.warn("An error occurred while trying to destroy a view", error)
    }
  }

  ngDoCheck() {
    if (this.view && !this.view.destroyed) {
      try {
        this.view?.detectChanges()
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  ngAfterContentInit() {
    this.reset({ create: true })
  }

  ngOnDestroy() {
    this.destroy()
  }

  constructor(
    private boundary: ErrorBoundary,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
  ) {
    this.handleError = this.handleError.bind(this)
  }
}

@Directive({
  selector: "error-boundary, [errorBoundary]",
  exportAs: "errorBoundary",
})
export class ErrorBoundary {
  readonly platformBrowser: boolean

  event: ErrorBoundaryEvent | null

  get fallback() {
    return this.fallbackQuery?.first
  }

  @ContentChildren(Fallback, { descendants: false })
  fallbackQuery?: QueryList<Fallback>

  @ContentChild(CatchError, { static: true })
  catchError?: CatchError

  @Output()
  error: EventEmitter<ErrorBoundaryEvent>

  reset(options?: { create: boolean }) {
    if (this.event) {
      this.event.closed = true
      this.event = null
      this.fallback?.reset()
      this.catchError?.reset(options)
    }
  }

  handleError(error: any) {
    if (this.event) {
      this.rootErrorHandler.handleError(error)
      return
    }
    try {
      if (this.fallback && this.platformBrowser) {
        if (!this.event) {
          this.event = new ErrorBoundaryEvent(this, error)
          this.fallback.handleError(this.event)
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

  constructor(
    private errorHandler: ErrorHandler,
    private rootErrorHandler: ErrorBoundaryHandler,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.error = new EventEmitter()
    this.platformBrowser = isPlatformBrowser(platformId)
    this.event = null
  }
}

@Injectable()
export class ErrorBoundaryHandler implements ErrorHandler {
  timeout
  errors = new Set()
  handleError(error) {
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
        this.timeout = null
      })
    })
    appRef.tick()
  }
  constructor(private injector: Injector, private zone: NgZone) {}
}

@NgModule({
  declarations: [ErrorBoundary, DefaultFallback, DefaultCatchError],
  exports: [ErrorBoundary, DefaultFallback, DefaultCatchError],
  providers: [
    ErrorBoundaryHandler,
    {
      provide: ErrorHandler,
      useExisting: ErrorBoundaryHandler,
    },
  ],
})
export class BoundaryModule {}
