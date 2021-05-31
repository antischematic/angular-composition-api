import {
    ChangeDetectorRef,
    ErrorHandler,
    EventEmitter,
    inject,
    InjectFlags,
    InjectionToken,
    Injector,
    INJECTOR,
    isDevMode,
    NgModuleRef,
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

export function getContext() {
    const context = contextMap.get(currentContext);
    if (context) {
        return context;
    }
    throw new Error('Call out of context');
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
        effects: new Map(),
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

function createService(factory: any) {
    const context = Object.create(null)
    const module: any = inject(ChangeDetectorRef, InjectFlags.Optional | InjectFlags.Self) ?? inject(NgModuleRef)
    createContext(context, inject(INJECTOR), inject(ErrorHandler))
    const value = runInContext(context, factory)
    runInContext(context, subscribe)
    module.onDestroy(() => runInContext(context, unsubscribe))
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
        this.detectChanges()
    }
    constructor(private ref: ChangeDetectorRef) {
        ref.detach()
    }
}

function setup(stateFactory: any, injector: Injector) {
    const context = currentContext;
    const props = Object.freeze(Object.create(context));
    const error = injector.get(ErrorHandler);
    const scheduler = new Scheduler(injector.get(ChangeDetectorRef));

    createContext(context, injector, error, [new Set(), new Set(), new Set()]);

    addEffect(scheduler as any)

    for (const [key, value] of Object.entries(stateFactory(props))) {
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
            context[key] = value;
        }
        if (isDevMode() && !context.hasOwnProperty(key)) {
            throw new Error(
                `No value initialized for "${key}", source did not emit an initial value.`
            );
        }
    }
}

function check(key: CheckPhase) {
    const checks = getContext()[key];
    for (const subject of checks) {
        subject.check();
    }
}

function subscribe() {
    const { effects } = getContext();
    if (effects.size === 0) return;
    const list = new Map(effects);
    effects.clear();
    for (const [source, observers] of list) {
        for (const observer of observers) {
            source.subscribe(observer);
        }
    }
    return true
}

function unsubscribe() {
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
    source: Observable<T>,
    observer?: PartialObserver<T> | ((value: T) => void)
) {
    const { effects, injector, error } = getContext();
    const effect = new EffectObserver<T>(observer, error, injector);
    if (effects.has(source)) {
        effects.get(source)!.add(effect);
    } else {
        effects.set(source, new Set([effect]));
    }
}

function next(injector: Injector, errorHandler: ErrorHandler, notification: Notification<any>, observer: any) {
    unsubscribe()
    createContext(currentContext, injector, errorHandler)
    try {
        addTeardown(notification.accept(observer as any))
    } catch (error) {
        errorHandler.handleError(error)
    }
    subscribe()
}

class EffectObserver<T> {
    next(value: T | Notification<T>) {
        if (value instanceof Notification) {
            return this.call(value);
        }
        this.call(Notification.createNext(value));
    }
    error(error: unknown) {
        this.call(Notification.createError(error));
    }
    complete() {
        this.call(Notification.createComplete());
    }
    call(notification: Notification<T>) {
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
    unsubscribe() {
        runInContext(this, unsubscribe)
    }
    constructor(
        private observer: any,
        private errorHandler: ErrorHandler,
        private injector: Injector,
    ) {
        createContext(this, injector, errorHandler)
        addTeardown(this)
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

export function Factory<T>(fn: () => T): () => T
export function Factory<T>(name: string, fn: () => T): InjectionToken<T>
export function Factory<T>(name: any, fn: () => T = name): unknown {
    const factory = function () {
        return createService(fn)
    }
    if (typeof name === "function") {
        return factory
    }
    return new InjectionToken(name, {
        factory
    })
}
