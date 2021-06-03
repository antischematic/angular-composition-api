import {
  AfterContentInit,
  ChangeDetectorRef,
  ContentChild,
  Directive,
  DoCheck, ElementRef,
  ErrorHandler, EventEmitter, Inject,
  NgModule,
  OnDestroy, OnInit, Optional, Output, PLATFORM_ID, Renderer2,
  TemplateRef,
  ViewContainerRef,
  ViewRef
} from '@angular/core';
import {isPlatformBrowser} from "@angular/common";

export abstract class Fallback {
  abstract handleError(error: any): void
  abstract reset(): void
}

export abstract class CatchError {
  abstract handleError(error: any): void
  abstract reset(): void
}

@Directive({
  selector: "[fallback]",
  providers: [{
    provide: Fallback,
    useExisting: DefaultFallback
  }]
})
export class DefaultFallback implements Fallback, OnInit, OnDestroy {
  view?: ViewRef
  comment: Comment

  handleError(error: any) {
    this.substitute(this.elementRef.nativeElement, this.comment, false)
    if (this.templateRef) {
      this.view = this.viewContainerRef.createEmbeddedView(this.templateRef, {$implicit: error})
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
      @Optional() private templateRef: TemplateRef<any> | null
  ) {
    this.comment = renderer.createComment("Fallback")
  }
}

@Directive({
  selector: "[catchError]",
  providers: [{
    provide: CatchError,
    useExisting: DefaultCatchError
  }, {
    provide: ErrorHandler,
    useExisting: DefaultCatchError
  }]
})
export class DefaultCatchError implements CatchError, DoCheck, AfterContentInit, OnDestroy {
  view?: ViewRef

  handleError(error: unknown) {
    this.destroy()
    this.boundary.handleError(error)
  }

  reset() {
    try {
      this.view = this.templateRef.createEmbeddedView({})
      this.viewContainerRef.clear()
      this.viewContainerRef.insert(this.view)
      this.view.detach()
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
    this.reset()
  }

  ngOnDestroy() {
    this.destroy()
  }

  constructor(private boundary: ErrorBoundary, private templateRef: TemplateRef<any>, private viewContainerRef: ViewContainerRef) {
    this.handleError = this.handleError.bind(this)
  }
}

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
  selector: "error-boundary, [errorBoundary]",
  exportAs: "errorBoundary"
})
export class ErrorBoundary {
  readonly platformBrowser: boolean

  event: ErrorBoundaryEvent | null

  @ContentChild(Fallback)
  fallback?: Fallback

  @ContentChild(CatchError, { static: true })
  catchError?: CatchError

  @Output()
  error: EventEmitter<ErrorBoundaryEvent>

  reset() {
    if (this.event) {
      this.event.closed = true
      this.event = null
      this.fallback?.reset()
      this.catchError?.reset()
    }
  }

  handleError(error: any) {
    if (this.event) {
      throw error
    }
    try {
      if (this.fallback && this.platformBrowser) {
        console.error(error)
        this.fallback.handleError(error)
        this.event = new ErrorBoundaryEvent(this, error)
        this.error.emit(this.event)
      } else {
        this.errorHandler.handleError(error)
      }
    } catch (error) {
      this.errorHandler.handleError(error)
    }
  }

  constructor(private errorHandler: ErrorHandler, @Inject(PLATFORM_ID) platformId: Object) {
    this.error = new EventEmitter()
    this.platformBrowser = isPlatformBrowser(platformId)
    this.event = null
  }
}

@NgModule({
  declarations: [
    ErrorBoundary,
    DefaultFallback,
    DefaultCatchError
  ],
  exports: [
    ErrorBoundary,
    DefaultFallback,
    DefaultCatchError,
  ]
})
export class BoundaryModule { }
