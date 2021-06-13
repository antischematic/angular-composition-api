import {
    ChangeDetectorRef,
    ErrorHandler,
    EventEmitter,
    inject,
    Injectable,
    InjectFlags,
    Injector,
    INJECTOR,
    NgModuleRef, ProviderToken,
    Type,
    ɵɵdirectiveInject as directiveInject
} from '@angular/core';
import {
    Notification,
    Observable,
    PartialObserver,
    Subscribable,
    Subscription,
    SubscriptionLike,
    TeardownLogic,
} from 'rxjs';
import {AsyncState, checkPhase, CheckPhase, CheckSubject, Context, ViewFactory} from './interfaces';
import {isObject} from "./utils";

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

function createContext(context: {}, injector: Injector, error: ErrorHandler, additionalContext?: any) {
    contextMap.set(context, {
        injector,
        error,
        subscription: new Subscription(),
        effects: new Set(),
        ...additionalContext
    });
}

function createView<T extends {}, U extends {}>(
    Props?: any,
    fn?: any,
    _decorate = Props = decorate(Props, fn)
): new () => T & AsyncState<U> {
    return Props;
}

function createService(context: {}, factory: any) {
    createContext(context, inject(INJECTOR), inject(ErrorHandler))
    const value = runInContext(context, factory)
    runInContext(context, subscribe)
    return value
}

class ContextBinding<T = any> {
    value: T[keyof T];
    next(value: T[keyof T]) {
        this.context[this.key] = this.value = value;
        this.scheduler.markForCheck();
    }
    check() {
        const value = this.context[this.key];
        if (this.value !== value) {
            this.source.next((this.value = value));
            return true
        }
        return false
    }
    constructor(
        private context: T,
        private key: keyof T,
        private source: any,
        private scheduler: Scheduler
    ) {
        this.value = context[key];
    }
}

class Scheduler {
    timeout?: number
    detectChanges(ref: ChangeDetectorRef = this.ref, errorHandler: ErrorHandler = this.errorHandler) {
        try {
            ref.detectChanges()
        } catch (error) {
            errorHandler.handleError(error)
        }
    }
    markForCheck() {
        clearTimeout(this.timeout)
        this.timeout = setTimeout(this.detectChanges, 0, this.ref, this.errorHandler)
    }
    subscribe() {
        this.ref.detach()
        this.detectChanges()
    }
    constructor(private ref: ChangeDetectorRef, private errorHandler: ErrorHandler) {}
}

function isCheckSubject(value: unknown): value is CheckSubject<any> {
    return isObject(value) && checkPhase in value
}

function setup(stateFactory: any, injector: Injector) {
    const context: { [key: string]: any } = currentContext;
    const props = Object.create(context)
    const error = injector.get(ErrorHandler);
    const scheduler = new Scheduler(injector.get(ChangeDetectorRef), error);

    createContext(context, injector, error, [new Set(), new Set(), new Set(), scheduler]);

    for (const [key, value] of Object.entries(context)) {
        if (typeof value === "object" && checkPhase in value) {
            props[key] = value
            context[key] = value.value
            const binding = new ContextBinding(context, key, value, scheduler);
            addCheck(value[checkPhase], binding)
        }
    }

    const state = stateFactory(Object.freeze(props))

    for (const [key, value] of Object.entries(state)) {
        if (value instanceof EventEmitter) {
            context[key] = function (event: any) {
                value.emit(event)
            }
        } else if (isCheckSubject(value)) {
            const binding = new ContextBinding(context, key, value, scheduler);
            addTeardown(value.subscribe(binding));
            addCheck(value[checkPhase], binding);
        } else {
            Object.defineProperty(context, key, Object.getOwnPropertyDescriptor(state, key)!)
        }
    }

    addEffect(scheduler as any)
}

export function check(key: CheckPhase) {
    const context = getContext();
    let detectChanges = false
    for (const subject of context[key]) {
        const dirty = subject.check();
        detectChanges = detectChanges || dirty
    }
    if (detectChanges) {
        context[3].detectChanges()
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
    source: Subscribable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription {
    const { effects, injector, error } = getContext();
    const effectObserver = new EffectObserver<T>(source, observer, error, injector);
    effects.add(effectObserver);
    return new Subscription().add(effectObserver)
}

function next(injector: Injector, errorHandler: ErrorHandler, notification: Notification<any>, observer: any) {
    notification.accept(unsubscribe)
    createContext(currentContext, injector, errorHandler)
    try {
        addTeardown(notification.accept(observer as any))
    } catch (error) {
        errorHandler.handleError(error)
    }
    notification.accept(subscribe)
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
            const { injector, errorHandler } = this;
            runInContext(this, next, injector, errorHandler, Notification.createNext(void 0), source)
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
        const { observer, injector, errorHandler } = this;
        const isError = notification.kind === 'E';
        let errorHandled = !isError;
        errorHandled = errorHandled || observer && 'error' in observer;
        if (observer) {
            runInContext(this, next, injector, errorHandler, notification, observer)
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
    ) {
        this.closed = false
        addTeardown(this)
        createContext(this, injector, errorHandler)
    }
}

function decorate(Props: any, fn?: any, provider = false) {
    return class extends (fn ? Props : Object) {
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
        constructor(...args: any[]) {
            super(...args);
            runInContext(this, setup, fn ?? Props, directiveInject(INJECTOR), provider);
        }
    }
}

export const View: ViewFactory = createView;

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

export function Subscribe<T>(observer: () => TeardownLogic): Subscription;
export function Subscribe<T>(
    source: Observable<T>,
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription;
export function Subscribe<T>(
    source: Observable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
): Subscription {
    if (!currentContext) {
        if (typeof source === "function") {
            return new Subscription().add(source())
        } else {
            return source.subscribe(observer as any)
        }
    }
    return addEffect(source, observer);
}