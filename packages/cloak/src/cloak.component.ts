import {
    Component,
    ContentChild,
    ElementRef,
    ErrorHandler,
    NgModule, OnDestroy, OnInit,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    ViewRef
} from '@angular/core';
import {PartialObserver, Subject, Notification, Observable, isObservable} from "rxjs";

export class CloakSubject<T> extends Subject<T> {
    next(value: T) {
        Notification.createNext(value).accept(this.destination as any)
        this.action()
    }
    error(error: unknown) {
        this.errorHandler.handleError(error)
        super.error(error)
        this.action()
    }
    complete() {
        super.complete()
        this.action()
    }
    constructor(private action: Function, private errorHandler: ErrorHandler, private destination: PartialObserver<T> | ((value: T) => void)) {
        super();
    }
}

interface Cloak {
    suspend(args?: any): any
    resume(args?: any): any
}

export class CloakObservable<T> extends Observable<T> {
    constructor(action: Function, errorHandler: ErrorHandler, source: Observable<T>) {
        super((subscriber) => {
            return source.subscribe({
                next(value) {
                    subscriber.next(value)
                    action()
                },
                error(error) {
                    errorHandler.handleError(error)
                    action()
                },
                complete() {
                    action()
                }
            })
        });
    }
}

@Component({
    selector: 'ng-cloak',
    template: `
        <ng-template #content>
            <ng-content></ng-content>
        </ng-template>
        <ng-template #fallback>
            <ng-content select="[fallback]"></ng-content>
        </ng-template>
    `,
})
export class NgCloak implements OnInit, OnDestroy {
    contentView?: ViewRef
    fallbackView?: ViewRef

    @ViewChild("content", { static: true })
    content?: TemplateRef<void>

    @ViewChild("fallback", { static: true })
    fallback?: TemplateRef<void>

    suspend<T>(nextFn: (value: T) => T): (value: T) => void
    suspend<T>(observer: PartialObserver<T>): (value: T) => void
    suspend<T>(observable: Observable<T>): Observable<T>
    suspend(): void
    suspend(observerOrNext?: any): any {
        return this.cloak(this.suspend, observerOrNext)
    }

    resume<T>(nextFn: (value: T) => T): (value: T) => void
    resume<T>(observer: PartialObserver<T>): (value: T) => void
    resume<T>(observable: Observable<T>): Observable<T>
    resume(): void
    resume(observerOrNext?: any): any {
        return this.cloak(this.resume, observerOrNext)
    }

    private previousAction?: Function

    private cloak<T>(action: Function, nextFn: (value: T) => T): (value: T) => void
    private cloak<T>(action: Function, observer: PartialObserver<T>): (value: T) => void
    private cloak<T>(action: Function, observable: Observable<T>): Observable<T>
    private cloak(action: Function): any
    private cloak(action: Function, observerOrNext?: any): any {
        if (isObservable(observerOrNext)) {
            if ("next" in observerOrNext && typeof observerOrNext["next"] === "function") {
                return new CloakSubject(action, this.errorHandler, observerOrNext)
            }
            return new CloakObservable(action, this.errorHandler, observerOrNext)
        } else if (typeof observerOrNext === "function") {
            return new CloakSubject(action, this.errorHandler, observerOrNext)
        }

        if (action === this.suspend && this.previousAction !== this.suspend) {
            this.previousAction = this.suspend
            this.substitute(this.contentView, this.fallbackView)
        }
        if (action === this.resume && this.previousAction !== this.resume) {
            this.previousAction = this.resume
            this.substitute(this.fallbackView, this.contentView)
        }
    }

    substitute(viewToRemove?: ViewRef, viewToInsert?: ViewRef) {
        const index = viewToRemove ? this.viewContainerRef.indexOf(viewToRemove) : -1
        if (index > -1) {
            this.viewContainerRef.detach(index)
            if (viewToInsert) {
                this.viewContainerRef.insert(viewToInsert)
            }
        }
    }

    ngOnInit() {
        if (this.content) {
            this.contentView = this.viewContainerRef.createEmbeddedView(this.content)
        }
        if (this.fallback) {
            this.fallbackView = this.viewContainerRef.createEmbeddedView(this.fallback)
        }
        this.cloak(this.resume)
    }

    ngOnDestroy() {
        this.contentView?.destroy()
        this.fallbackView?.destroy()
    }

    constructor(private errorHandler: ErrorHandler, private viewContainerRef: ViewContainerRef) {
        this.suspend = this.suspend.bind(this)
        this.resume = this.resume.bind(this)
    }
}

@NgModule({
    declarations: [
        NgCloak
    ],
    exports: [
        NgCloak
    ]
})
export class CloakModule { }