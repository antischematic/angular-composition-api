import {
    ChangeDetectorRef,
    ErrorHandler,
    EventEmitter,
    inject,
    Injectable,
    InjectFlags,
    Injector,
    INJECTOR,
    isDevMode,
    NgModuleRef,
    Type,
    ɵɵdirectiveInject as directiveInject
} from '@angular/core';
import {isObservable, Notification, Observable, PartialObserver, Subscription, TeardownLogic,} from 'rxjs';
import {AsyncState, CheckPhase, Context, ViewFactory} from './interfaces';

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
        }
    }
    error(error: unknown) {
        this.errorHandler.handleError(error);
    }
    constructor(
        private context: T,
        private key: keyof T,
        private errorHandler: ErrorHandler,
        private source: any,
        private scheduler: Scheduler
    ) {
        this.value = context[key];
    }
}

class Scheduler {
    timeout?: number
    detectChanges(ref: ChangeDetectorRef = this.ref) {
        ref.detectChanges()
    }
    markForCheck() {
        clearTimeout(this.timeout)
        this.timeout = setTimeout(this.detectChanges, 0, this.ref)
    }
    subscribe() {
        this.ref.detach()
        this.detectChanges()
    }
    constructor(private ref: ChangeDetectorRef) {}
}

function setup(stateFactory: any, injector: Injector) {
    const context = currentContext;
    const props = Object.freeze(Object.create(context));
    const error = injector.get(ErrorHandler);
    const scheduler = new Scheduler(injector.get(ChangeDetectorRef));

    createContext(context, injector, error, [new Set(), new Set(), new Set()]);

    const state = stateFactory(props)

    for (const [key, value] of Object.entries(state)) {
        if (value instanceof EventEmitter) {
            context[key] = function (event: any) {
                value.emit(event)
            }
        } else if (isObservable(value)) {
            const binding = new ContextBinding(context, key, error, value, scheduler);
            addTeardown(value.subscribe(binding));
            if ('next' in value && typeof value['next'] === 'function') {
                addCheck(2, binding);
            }
        } else {
            Object.defineProperty(context, key, Object.getOwnPropertyDescriptor(state, key)!)
        }
        if (isDevMode() && !context.hasOwnProperty(key)) {
            throw new Error(
                `No value initialized for "${key}", source did not emit an initial value.`
            );
        }
    }

    addEffect(scheduler as any)
}

export function check(key: CheckPhase) {
    const checks = getContext()[key];
    for (const subject of checks) {
        subject.check();
    }
}

export function subscribe() {
    const { effects, error } = getContext();
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
    source: Observable<T> | (() => TeardownLogic),
    observer?: PartialObserver<T> | ((value: T) => TeardownLogic)
) {
    const { effects, injector, error } = getContext();
    const effectObserver = new EffectObserver<T>(source, observer, error, injector);
    effects.add(effectObserver);
    return effectObserver
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

class EffectObserver<T> {
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
            try {
                runInContext(this, addTeardown, source())
            } catch (e) {
                this.errorHandler.handleError(e)
            }
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
        if (!observer) return;
        errorHandled = errorHandled || 'error' in observer;
        runInContext(this, next, injector, errorHandler, notification, observer)
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

const view = Symbol('view');

function decorate(Props: any, fn?: any, provider = false) {
    return class extends (fn ? Props : Object) {
        [view] = runInContext(this, setup, fn ?? Props, directiveInject(INJECTOR), provider);
        ngDoCheck() {
            runInContext(this, check, 0);
        }
        ngAfterContentChecked() {
            runInContext(this, check, 1);
        }
        ngAfterViewChecked() {
            runInContext(this, check, 2);
            this[view] = this[view] ?? runInContext(this, subscribe);
        }
        ngOnDestroy() {
            runInContext(this, unsubscribe);
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
