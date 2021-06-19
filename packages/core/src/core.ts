import {
    ChangeDetectorRef,
    ErrorHandler,
    EventEmitter,
    inject,
    Injectable,
    InjectFlags,
    Injector,
    INJECTOR,
    NgModuleRef,
    ProviderToken,
    Type,
    ɵɵdirectiveInject as directiveInject
} from '@angular/core';
import {
    BehaviorSubject, combineLatest,
    Notification,
    Observable,
    PartialObserver,
    Subject,
    Subscribable,
    Subscription,
    TeardownLogic,
} from 'rxjs';
import {checkPhase, CheckPhase, CheckSubject, Context} from './interfaces';
import {arrayCompare, computeValue, isObject} from "./utils";
import {distinctUntilChanged, skip, switchMap} from "rxjs/operators";

let currentContext: any;
const contextMap = new WeakMap<{}, Context>();

export function beginContext(value: any) {
    const previousContext = currentContext;
    currentContext = value;
    return previousContext;
}

export function endContext(previous: any) {
    currentContext = previous;
}

export class CallContextError extends Error {
    constructor() {
        super('Call out of context');
    }
}

export function getContext() {
    const context = contextMap.get(currentContext);
    if (context) {
        return context;
    }
    throw new CallContextError();
}

function runInContext<T extends (...args: any[]) => any>(
    context: any,
    fn: T,
    ...args: any[]
): any {
    const previous = beginContext(context);
    const value = fn(...args);
    endContext(previous);
    return value;
}

function createContext(context: {}, injector: Injector, error: ErrorHandler, scheduler?: Scheduler, additionalContext?: any) {
    contextMap.set(context, {
        injector,
        error,
        subscription: new Subscription(),
        scheduler: scheduler!,
        effects: new Set(),
        ...additionalContext
    });
}

function createService(context: {}, factory: any) {
    createContext(context, inject(INJECTOR), inject(ErrorHandler))
    const value = runInContext(context, factory)
    runInContext(context, subscribe)
    return value
}

class ContextBinding<T = any> {
    next(value: T[keyof T]) {
        const { context, scheduler } = this
        if (value !== context[this.key]) {
            context[this.key] = value;
            this.emitter?.next(value)
            scheduler.markForCheck();
        }
    }
    check() {
        const value = this.context[this.key];
        if (this.source.value !== value) {
            this.source.next(value)
            this.scheduler.markForCheck();
        }
    }
    constructor(
        private context: T,
        private key: keyof T,
        private source: any,
        private scheduler: Scheduler,
        private emitter?: EventEmitter<T[keyof T]>
    ) {}
}

class Detach extends Boolean {}

export const DETACHED = {
    provide: Detach,
    useValue: true
}

class Scheduler {
    dirty: boolean
    detach: Detach | null
    detectChanges() {
        if (this.dirty) {
            this.dirty = false
            try {
                this.ref.detectChanges()
            } catch (error) {
                this.errorHandler.handleError(error)
            }
        }
    }
    markForCheck() {
        this.dirty = true
    }
    constructor(private ref: ChangeDetectorRef, private errorHandler: ErrorHandler, detach: Boolean | null) {
        this.dirty = false
        this.detach = detach
        if (this.detach == true) {
            this.ref.detach()
            this.markForCheck()
        }
    }
}

function isCheckSubject(value: unknown): value is CheckSubject<any> {
    return isObject(value) && checkPhase in value
}

function createBinding(context: any, key: any, value: any, scheduler: any) {
    const twoWayBinding = context[`${key}Change`]
    const emitter = twoWayBinding instanceof EventEmitter ? twoWayBinding : void 0
    const binding = new ContextBinding(context, key, value, scheduler, emitter);
    addCheck(value[checkPhase], binding)
    addEffect(value, binding);
}

function setup(injector: Injector, stateFactory?: (props?: any) => {}) {
    const context: { [key: string]: any } = currentContext;
    const props = Object.create(context)
    const error = injector.get(ErrorHandler);
    const scheduler = new Scheduler(injector.get(ChangeDetectorRef), error, directiveInject(Detach, InjectFlags.Self | InjectFlags.Optional));

    createContext(context, injector, error, scheduler, [new Set(), new Set(), new Set()]);

    for (const [key, value] of Object.entries(context)) {
        if (typeof value === "object" && isCheckSubject(value)) {
            props[key] = value
            context[key] = value.value
            createBinding(context, key, value, scheduler)
        }
    }

    if (stateFactory) {
        const state = stateFactory(Object.freeze(props))
        for (const [key, value] of Object.entries(state)) {
            if (value instanceof EventEmitter) {
                context[key] = function (event: any) {
                    value.emit(event)
                }
            } else if (isCheckSubject(value)) {
                context[key] = value.value
                createBinding(context, key, value, scheduler)
            } else {
                Object.defineProperty(context, key, Object.getOwnPropertyDescriptor(state, key)!)
            }
        }
    }
}
const empty = [] as any[]
export function check(key: CheckPhase) {
    const context = getContext();
    for (const subject of context[key] ?? empty) {
        subject.check();
    }
}

export function subscribe() {
    const { effects } = getContext();
    if (effects.size === 0) return;
    const list = Array.from(effects);
    effects.clear();
    for (const effect of list) {
        addTeardown(effect.subscribe())
    }
    return true
}

export function unsubscribe() {
    if (!contextMap.has(currentContext)) return
    getContext().subscription.unsubscribe();
}

export function addCheck(key: CheckPhase, subject: any) {
    getContext()[key].add(subject);
}

export function addTeardown(teardown: TeardownLogic) {
    getContext().subscription.add(teardown);
}

export function addEffect<T>(
    source?: Subscribable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription {
    const { effects, injector, error, scheduler } = getContext();
    const subscription = new Subscription()
    const effectObserver = new EffectObserver<T>(source, observer, error, injector, scheduler);
    addTeardown(subscription)
    if (!source) {
        return subscription
    }
    effects.add(effectObserver);
    return subscription.add(effectObserver)
}

function next(injector: Injector, errorHandler: ErrorHandler, notification: Notification<any>, observer: any, scheduler: Scheduler) {
    notification.accept(unsubscribe)
    createContext(currentContext, injector, errorHandler, scheduler)
    try {
        addTeardown(notification.accept(observer as any))
    } catch (error) {
        errorHandler.handleError(error)
    }
    notification.accept(subscribe)
    scheduler?.detectChanges()
}


export class ComputedSubject<T> extends BehaviorSubject<T> {
    [checkPhase]: CheckPhase
    compute
    deps: Subject<Set<any>>
    refs: number
    subscription?: Subscription
    changes: Observable<any>
    subscribe(): Subscription
    subscribe(observer: (value: T) => void): Subscription
    subscribe(observer: PartialObserver<T>): Subscription
    subscribe(observer?: any): Subscription {
        if (this.observers.length === 0) {
            this.subscription = this.changes.subscribe((v) => {
                const [value, deps] = computeValue(this.compute)
                this.deps.next(deps)
                this.next(value)
            })
        }
        this.refs++
        return super.subscribe(observer).add(() => {
            this.refs--
            if (this.refs === 0) {
                this.subscription?.unsubscribe()
            }
        })
    }
    constructor(compute: (value?: T) => T) {
        const [value, deps] = computeValue(compute)
        super(value)
        this[checkPhase] = 0
        this.compute = compute
        this.deps = new BehaviorSubject(deps)
        this.changes = this.deps.pipe(
            distinctUntilChanged(arrayCompare),
            switchMap((deps) => combineLatest([...deps]).pipe(
                skip(1),
            ))
        )
        this.refs = 0
    }
}

export class EffectObserver<T> {
    closed
    next(value: T | Notification<T>) {
        if (this.closed) return
        if (value instanceof Notification) {
            return this.call(value);
        }
        this.call(Notification.createNext(value));
    }
    error(error: unknown) {
        if (this.closed) return
        this.call(Notification.createError(error));
    }
    complete() {
        if (this.closed) return
        this.call(Notification.createComplete());
    }
    subscribe() {
        const { source } = this
        if (typeof source === "function") {
            const { injector, errorHandler, scheduler } = this;
            const fn = () => runInContext(this, next, injector, errorHandler, Notification.createNext(void 0), source, scheduler)
            new ComputedSubject(fn).subscribe(this)
        } else {
            return source.subscribe(this);
        }
    }
    unsubscribe() {
        if (this.closed) return
        this.closed = true
        runInContext(this, unsubscribe)
    }
    private call(notification: Notification<T>) {
        const { observer, injector, errorHandler, scheduler } = this;
        const isError = notification.kind === 'E';
        let errorHandled = !isError;
        errorHandled = errorHandled || observer && 'error' in observer;
        if (observer) {
            runInContext(this, next, injector, errorHandler, notification, observer, scheduler)
        }
        if (!errorHandled) {
            errorHandler.handleError(notification.error);
        }
    }
    constructor(
        private source: any,
        private observer: any,
        private errorHandler: ErrorHandler,
        private injector: Injector,
        private scheduler: Scheduler
    ) {
        this.closed = false
        addTeardown(this)
        createContext(this, injector, errorHandler, scheduler)
    }
}

export function decorate(Props: any) {
    return class extends Props {
        ngDoCheck() {
            runInContext(this, check, 0);
        }
        ngAfterContentChecked() {
            runInContext(this, check, 1);
        }
        ngAfterViewChecked() {
            runInContext(this, check, 2);
            runInContext(this, subscribe);
        }
        ngOnDestroy() {
            runInContext(this, unsubscribe);
        }
        constructor() {
            super();
            runInContext(this, setup, directiveInject(INJECTOR), Props.create);
        }
    } as any
}

export type ProvidedIn = Type<any> | 'root' | 'platform' | 'any' | null

export function Service<T>(factory: () => T, options?: { providedIn: ProvidedIn }): Type<T> {
    @Injectable({ providedIn: options?.providedIn ?? null  })
    class Class {
        static overriddenName = factory.name
        ngOnDestroy() {
            runInContext(this, unsubscribe)
        }
        constructor() {
            inject(NgModuleRef, InjectFlags.Self | InjectFlags.Optional)?.onDestroy(() => this.ngOnDestroy())
            return createService(this, factory)
        }
    }
    return Class as any
}

export function Inject<T>(token: ProviderToken<T>, notFoundValue?: T, flags?: InjectFlags): T {
    const { injector } = getContext();
    const previous = beginContext(void 0);
    const value = injector.get(token, notFoundValue, flags);
    endContext(previous);
    return value
}

export function Subscribe<T>(): Subscription;
export function Subscribe<T>(observer: () => TeardownLogic): Subscription;
export function Subscribe<T>(
    source: Observable<T>,
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription;
export function Subscribe<T>(
    source?: Observable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription {
    if (!currentContext) {
        if (typeof source === "function") {
            return new Subscription().add(source())
        } else if (source) {
            return source.subscribe(observer as any)
        } else {
            return new Subscription()
        }
    }
    return addEffect(source, observer);
}
