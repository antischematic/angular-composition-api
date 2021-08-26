import {
   ChangeDetectorRef,
   ErrorHandler,
   inject as serviceInject,
   Injectable,
   InjectFlags,
   Injector,
   INJECTOR,
   NgModuleRef,
   ProviderToken,
   Type,
   ɵɵdirectiveInject as directiveInject,
} from "@angular/core"
import {
   BehaviorSubject,
   combineLatest,
   Notification,
   PartialObserver,
   Subject,
   Subscribable,
   Subscription,
   TeardownLogic,
   Unsubscribable,
} from "rxjs"
import {
   checkPhase,
   CheckPhase,
   CheckSubject,
   Context,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import {
   addSignal,
   arrayCompare,
   computeValue,
   isEmitter,
   isObject,
   isValue,
} from "./utils"
import { distinctUntilChanged, skip, switchMap } from "rxjs/operators"
import { ValueGetterSetter, ValueToken } from "./provider"

let currentContext: any
const contextMap = new WeakMap<{}, Context>()

export function beginContext(value: any) {
   const previousContext = currentContext
   currentContext = value
   return previousContext
}

export function endContext(previous: any) {
   currentContext = previous
}

export class CallContextError extends Error {
   constructor() {
      super("Call out of context")
   }
}

export function getContext() {
   const context = contextMap.get(currentContext)
   if (context) {
      return context
   }
   throw new CallContextError()
}

function runInContext<T extends (...args: any[]) => any>(
   context: any,
   fn: T,
   ...args: any[]
): any {
   const previous = beginContext(context)
   const value = fn(...args)
   endContext(previous)
   return value
}

function createContext(
   context: {},
   injector: Injector,
   error: ErrorHandler,
   scheduler?: Scheduler,
   additionalContext?: any,
) {
   contextMap.set(context, {
      injector,
      error,
      subscription: new Subscription(),
      scheduler: scheduler!,
      effects: [],
      ...additionalContext,
   })
}

function createService(context: {}, factory: any) {
   createContext(context, serviceInject(INJECTOR), serviceInject(ErrorHandler))
   const value = runInContext(context, factory)
   runInContext(context, subscribe)
   return value
}

class ContextBinding<T = any> {
   next(value: T[keyof T]) {
      const { context, scheduler } = this
      context[this.key] = value
      scheduler.markForCheck()
   }
   check() {
      const value = this.context[this.key]
      if (this.source.value !== value) {
         this.source.next(value)
         this.scheduler.markForCheck()
      }
   }
   constructor(
      private context: T,
      private key: keyof T,
      private source: any,
      private scheduler: Scheduler,
   ) {}
}

class Detach extends Boolean {}

export const DETACHED = {
   provide: Detach,
   useValue: true,
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
   constructor(
      private ref: ChangeDetectorRef,
      private errorHandler: ErrorHandler,
      detach: Boolean | null,
   ) {
      this.dirty = false
      this.detach = detach
      if (this.detach == true) {
         this.ref.detach()
         this.markForCheck()
      }
   }
}

function isCheckSubject(value: any): value is CheckSubject<any> {
   return (isObject(value) || isValue(value)) && checkPhase in value
}

function createBinding(context: any, key: any, value: any, scheduler: any) {
   const binding = new ContextBinding(context, key, value, scheduler)
   addCheck(value[checkPhase], binding)
   addEffect(value, binding, void 0, true)
}

function setup(injector: Injector, stateFactory: () => {}) {
   const context: { [key: string]: any } = currentContext
   const error = injector.get(ErrorHandler)
   const scheduler = new Scheduler(
      injector.get(ChangeDetectorRef),
      error,
      directiveInject(Detach, InjectFlags.Self | InjectFlags.Optional),
   )

   createContext(context, injector, error, scheduler, [
      new Set(),
      new Set(),
      new Set(),
   ])
   const { effects } = getContext()
   const state = stateFactory()
   for (const [key, value] of Object.entries(state)) {
      if (isCheckSubject(value)) {
         context[key] = value.value
         createBinding(context, key, value, scheduler)
      } else {
         Object.defineProperty(
            context,
            key,
            Object.getOwnPropertyDescriptor(state, key)!,
         )
      }
   }
}
const empty = [] as any[]
export function check(key: CheckPhase) {
   const context = getContext()
   for (const subject of context[key] ?? empty) {
      subject.check()
   }
}

export function subscribe() {
   const { effects } = getContext()
   if (effects.length === 0) return
   const list = Array.from(effects)
   effects.length = 0
   for (const effect of list) {
      effect.subscribe()
   }
   return true
}

export function unsubscribe() {
   if (!contextMap.has(currentContext)) return
   getContext().subscription.unsubscribe()
}

export function addCheck(key: CheckPhase, subject: any) {
   getContext()[key].add(subject)
}

export function addTeardown(teardown: TeardownLogic) {
   getContext().subscription.add(teardown)
}

export function addEffect<T>(
   source?: Subscribable<T> | (() => TeardownLogic),
   observer?: PartialObserver<T> | ((value: T) => TeardownLogic),
   signal?: UnsubscribeSignal,
   prepend?: boolean
): Subscription | void {
   const subscription = new Subscription()
   if (!source) {
      addTeardown(subscription)
      return subscription
   }
   const { effects, injector, error, scheduler } = getContext()
   const effectObserver = new EffectObserver<T>(
      source,
      observer,
      error,
      injector,
      scheduler,
      signal,
   )
   if (prepend) {
      effects.unshift(effectObserver)
   } else {
      effects.push(effectObserver)
   }
   if (signal) {
      addSignal(effectObserver, signal)
   } else if (signal !== null) {
      addTeardown(subscription)
      return subscription.add(effectObserver)
   }
}

function next(
   injector: Injector,
   errorHandler: ErrorHandler,
   notification: Notification<any>,
   observer: any,
   scheduler: Scheduler,
   signal?: UnsubscribeSignal,
) {
   notification.accept(unsubscribe)
   createContext(currentContext, injector, errorHandler, scheduler)
   try {
      let previous = checkValues
      checkValues = new Set()
      const teardown = notification.accept(observer as any)
      for (const value of checkValues) {
         value(value.value)
      }
      checkValues = previous
      if (signal) {
         addSignal(teardown, signal)
      } else if (signal !== null) {
         addTeardown(teardown)
      }
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
   subscription?: Unsubscribable
   changes: Subscribable<any>
   subscribe(): Subscription
   subscribe(observer: (value: T) => void): Subscription
   subscribe(observer: PartialObserver<T>): Subscription
   subscribe(observer?: any): Subscription {
      this.refs++
      if (this.refs === 1) {
         this.subscription = this.changes.subscribe((v) => {
            const [value, deps] = computeValue(this.compute)
            this.deps.next(deps)
            this.next(value)
         })
      }
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
         switchMap((deps) => combineLatest([...deps]).pipe(skip(1))),
      )
      this.refs = 0
   }
}

export class EffectObserver<T> {
   closed
   next(value: T | Notification<T>) {
      if (this.closed) return
      if (value instanceof Notification) {
         return this.call(value)
      }
      this.call(Notification.createNext(value))
   }
   error(error: unknown) {
      if (this.closed) return
      this.call(Notification.createError(error))
   }
   complete() {
      if (this.closed) return
      this.call(Notification.createComplete())
   }
   subscribe() {
      const { source } = this
      let subscription
      if (
         typeof source === "function" &&
         !isEmitter(source) &&
         !isValue(source)
      ) {
         const { injector, errorHandler, scheduler } = this
         const fn = () =>
            runInContext(
               this,
               next,
               injector,
               errorHandler,
               Notification.createNext(void 0),
               source,
               scheduler,
            )
         subscription = new ComputedSubject(fn).subscribe(this)
      } else {
         subscription = source.subscribe(this)
      }
      if (this.signal) {
         return addSignal(subscription, this.signal)
      }
      return subscription
   }
   unsubscribe() {
      if (this.closed) return
      this.closed = true
      runInContext(this, unsubscribe)
   }
   private call(notification: Notification<T>) {
      const { observer, injector, errorHandler, scheduler, signal } = this
      const isError = notification.kind === "E"
      let errorHandled = !isError
      errorHandled = errorHandled || (observer && "error" in observer)
      if (observer) {
         runInContext(
            this,
            next,
            injector,
            errorHandler,
            notification,
            observer,
            scheduler,
            signal,
         )
      }
      if (!errorHandled) {
         errorHandler.handleError(notification.error)
      }
   }
   constructor(
      private source: any,
      private observer: any,
      private errorHandler: ErrorHandler,
      private injector: Injector,
      private scheduler: Scheduler,
      private signal?: UnsubscribeSignal,
   ) {
      this.closed = false
      createContext(this, injector, errorHandler, scheduler)
   }
}

export function decorate(create: any) {
   return class {
      ngDoCheck() {
         runInContext(this, check, 0)
      }
      ngAfterContentChecked() {
         runInContext(this, check, 1)
      }
      ngAfterViewChecked() {
         runInContext(this, check, 2)
         runInContext(this, subscribe)
      }
      ngOnDestroy() {
         runInContext(this, unsubscribe)
      }
      constructor() {
         runInContext(this, setup, directiveInject(INJECTOR), create)
      }
   } as any
}

export type ProvidedIn = Type<any> | "root" | "platform" | "any" | null

export function Service<T>(
   factory: () => T,
   options?: { providedIn: ProvidedIn },
): Type<T> {
   @Injectable({ providedIn: options?.providedIn ?? null })
   class Class {
      static overriddenName = factory.name
      ngOnDestroy() {
         runInContext(this, unsubscribe)
      }
      constructor() {
         serviceInject(
            NgModuleRef,
            InjectFlags.Self | InjectFlags.Optional,
         )?.onDestroy(() => this.ngOnDestroy())
         return createService(this, factory)
      }
   }
   return Class as any
}

export function inject<T>(
   token: ProviderToken<T> | ValueToken<T>,
   notFoundValue?: T,
   flags?: InjectFlags,
): T {
   const { injector } = getContext()
   const previous = beginContext(void 0)
   const value = injector.get(token, notFoundValue, flags)
   endContext(previous)
   if (value instanceof ValueGetterSetter) {
      return value.get()
   }
   return value
}

let checkValues = new Set<Value<any>>()

export function markDirty<T>(value: Value<T>): T {
   checkValues.add(value)
   return value.value
}

export function ViewDef<T>(create: () => T): ViewDef<T> {
   return decorate(create)
}

export type ViewDef<T> = Type<
   {
      [key in keyof T]: T[key] extends CheckSubject<infer R> ? R : T[key]
   }
>
