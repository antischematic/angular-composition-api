import {
   ChangeDetectorRef,
   ErrorHandler,
   inject as serviceInject,
   Injectable,
   InjectFlags,
   Injector,
   INJECTOR,
   isDevMode,
   NgModuleRef,
   ProviderToken,
   Type,
   ɵɵdirectiveInject as directiveInject,
} from "@angular/core"
import {
   BehaviorSubject,
   combineLatest,
   Notification,
   Observable,
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
   CurrentContext,
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
const contextMap = new WeakMap<{}, CurrentContext>()

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
      scheduler.markDirty()
   }
   check() {
      const value = this.context[this.key]
      if (this.source.value !== value) {
         this.scheduler.markDirty()
         this.source.next(value)
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

const dirty = new Set<Scheduler>()

let id: number

export class Scheduler extends Subject<any> {
   private dirty: boolean
   private readonly detach: Detach | null
   detectChanges() {
      if (this.dirty && !this.closed) {
         this.dirty = false
         dirty.delete(this)
         try {
            this.next(Lifecycle.BeforeUpdate)
            this.ref.detectChanges()
            isDevMode() && this.ref.checkNoChanges()
            this.next(Lifecycle.AfterUpdate)
         } catch (error) {
            this.errorHandler.handleError(error)
         }
      }
   }
   markDirty() {
      this.dirty = true
      dirty.add(this)
      if (!currentContext) {
         clearTimeout(id)
         id = setTimeout(detectChanges)
      }
   }
   unsubscribe() {
      dirty.delete(this)
      super.unsubscribe()
   }

   constructor(
      private ref: ChangeDetectorRef,
      private errorHandler: ErrorHandler,
      detach: Boolean | null,
   ) {
      super()
      this.subscribe = this.subscribe.bind(this)
      this.detectChanges = this.detectChanges.bind(this)
      this.markDirty = this.markDirty.bind(this)
      this.dirty = false
      this.detach = detach
      if (this.detach == true) {
         this.ref.detach()
         this.markDirty()
      }
   }
}

function isCheckSubject(value: any): value is CheckSubject<any> {
   return (isObject(value) || isValue(value)) && checkPhase in value
}

function createBinding(context: any, key: any, value: any) {
   const { scheduler } = getContext()
   const binding = new ContextBinding(context, key, value, scheduler)
   addCheck(value[checkPhase], binding)
   addTeardown(value.subscribe(binding))
}

function createFunction(exec: Function, errorHandler: ErrorHandler) {
   return function functionBinding(...args: any[]) {
      try {
         return exec(...args)
      } catch (error) {
         errorHandler.handleError(error)
      } finally {
         detectChanges()
      }
   }
}

export const enum Lifecycle {
   BeforeUpdate = 1,
   AfterUpdate = 2,
}

export interface Context extends Observable<Lifecycle> {
   markDirty(): void
   detectChanges(): void
}

function setup(injector: Injector, stateFactory: (context: Context) => {}) {
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

   const state = stateFactory(scheduler)

   for (let [key, value] of Object.entries(state)) {
      if (isCheckSubject(value)) {
         context[key] = value.value
         createBinding(context, key, value)
      } else if (typeof value === "function" && !isEmitter(value)) {
         context[key] = createFunction(value, error)
      } else {
         Object.defineProperty(
            context,
            key,
            Object.getOwnPropertyDescriptor(state, key)!,
         )
      }
   }
}

export function check(key: CheckPhase) {
   const context = getContext()
   for (const subject of context[key]) {
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
): Unsubscribable | void {
   if (!source) {
      const subscription = new Subscription()
      addTeardown(subscription)
      return subscription
   }
   const { effects, injector, error, scheduler } = getContext()
   const effect = new EffectObserver<T>(
      source,
      observer,
      error,
      injector,
      scheduler,
      signal,
   )
   effects.push(effect)
   if (signal) {
      addSignal(effect, signal)
   } else if (signal !== null) {
      addTeardown(effect)
   }
   return effect
}

function next(
   injector: Injector,
   errorHandler: ErrorHandler,
   notification: Notification<any>,
   observer: any,
   scheduler?: Scheduler,
   signal?: UnsubscribeSignal,
) {
   notification.accept(unsubscribe)
   createContext(currentContext, injector, errorHandler, scheduler)
   try {
      const teardown = notification.accept(observer as any)
      if (signal) {
         addSignal(teardown, signal)
      } else if (signal !== null) {
         addTeardown(teardown)
      }
   } catch (error) {
      errorHandler.handleError(error)
   }
   notification.accept(subscribe)
   detectChanges()
}

function detectChanges() {
   const list = Array.from(dirty)
   dirty.clear()
   for (const scheduler of list) {
      scheduler.detectChanges()
   }
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
         this.subscription = this.changes.subscribe(() => {
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
      private scheduler?: Scheduler,
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
         detectChanges()
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

export function markDirty<T>(value: Value<T>): T {
   value(value.value)
   return value.value
}

export function ViewDef<T>(create: (context: Context) => T): ViewDef<T> {
   return decorate(create)
}

export type ViewDef<T> = Type<
   {
      [key in keyof T]: T[key] extends CheckSubject<infer R> ? R : T[key]
   }
>
