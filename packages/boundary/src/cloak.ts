import {
    ContentChildren,
    Directive,
    ElementRef,
    ErrorHandler, Host,
    Inject,
    InjectionToken,
    Input,
    OnDestroy, Optional,
    QueryList, SimpleChanges,
    TemplateRef,
    Type,
    ViewContainerRef
} from '@angular/core';
import {
    asapScheduler,
    asyncScheduler,
    concat,
    forkJoin,
    Observable,
    partition,
    queueScheduler,
    Subject,
    timer
} from "rxjs";
import {distinctUntilChanged, map, scan, share, switchMap, take, takeUntil} from "rxjs/operators";
import {Fallback} from "./error-boundary";
import {Renderer} from "./renderer";

export abstract class CloakBoundary {
    abstract cloak<T>(source: Observable<T>): Observable<T>
}

export interface CloakConfig {
    leading: number
    trailing: number
}

const DEFAULT_CLOAK_CONFIG = {
    leading: 0,
    trailing: 1000,
}

export const NG_CLOAK_CONFIG = new InjectionToken<CloakConfig>("NG_CLOAK_CONFIG")

export class CloakObserver {
    closed: boolean
    next(value: any) {
        this.subscriber.next(value)
        this.unsubscribe()
    }
    error(error: any) {
        this.errorHandler.handleError(error)
        this.subscriber.error(error)
        this.unsubscribe()
    }
    complete() {
        this.subscriber.complete()
        this.unsubscribe()
    }
    unsubscribe() {
        if (!this.closed) {
            this.closed = true
            this.queue.next(-1)
        }
    }
    constructor(private subscriber: any, private queue: Subject<any>, private errorHandler: ErrorHandler) {
        this.closed = false
    }
}

export class CloakObservable<T> extends Observable<T> {
    constructor(source: Observable<T>, queue: Subject<number>, errorHandler: ErrorHandler) {
        super((subscriber) => {
            queue.next(1)
            return source.subscribe(new CloakObserver(subscriber, queue, errorHandler))
        });
    }
}

function selectDelay(time: number) {
    return timer(time, time ? asyncScheduler : asapScheduler)
}

@Directive({
    selector: 'ng-cloak',
    providers: [
        Renderer,
        {
            provide: CloakBoundary,
            useExisting: NgCloak
        }
    ]
})
export class NgCloak implements CloakBoundary, OnDestroy {
    cloaked: boolean
    queue: Subject<number>

    get fallbackType() {
        return this.fallback ?? this.fallbackQuery?.first?.ref
    }

    @Input()
    fallback?: TemplateRef<void> | Element | Type<any>

    @ContentChildren(Fallback, { descendants: false })
    fallbackQuery?: QueryList<Fallback>

    cloak(source: Observable<any>) {
        return new CloakObservable(source, this.queue, this.errorHandler)
    }

    render(cloak: boolean) {
        if (this.cloaked === cloak) return
        this.cloaked = cloak

        if (cloak) {
            this.renderer.renderFallback(this.fallbackType, true)
        } else {
            this.renderer.renderContent(this.fallbackType)
        }
    }

    next(cloaked: boolean) {
        this.render(cloaked)
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.fallback) {
            const { currentValue, previousValue } = changes.fallback
            this.renderer.renderFallback(previousValue, false)
            this.renderer.renderFallback(currentValue, this.cloaked)
        }
    }

    ngOnDestroy() {
        this.queue.complete()
    }

    constructor(private errorHandler: ErrorHandler, private viewContainerRef: ViewContainerRef, private renderer: Renderer, @Inject(NG_CLOAK_CONFIG) @Optional() config: CloakConfig) {
        this.queue = new Subject()
        this.cloaked = false

        this.renderer.renderContent(this.fallbackType)

        config = config ?? DEFAULT_CLOAK_CONFIG

        const [cloak, uncloak] = partition(this.queue.pipe(
            scan((count, next) => count + next, 0),
            map(Boolean),
            distinctUntilChanged(),
            share()
        ), Boolean)

        const debounce = cloak.pipe(
            switchMap(() => {
                return concat(selectDelay(config.leading).pipe(
                    map(() => true),
                    takeUntil(uncloak)
                ), forkJoin([uncloak.pipe(take(1)), selectDelay(config.trailing)]).pipe(
                    map(() => false)
                ))
            })
        )

        debounce.subscribe(this)
    }
}
