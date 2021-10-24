import {
   AfterContentChecked,
   AfterViewChecked,
   ChangeDetectorRef,
   Directive,
   DoCheck,
   ErrorHandler,
   inject as serviceInject,
   Injectable,
   InjectFlags,
   Injector,
   INJECTOR,
   isDevMode,
   NgModuleRef,
   OnDestroy,
   ProviderToken,
   Type,
   ɵɵdirectiveInject as directiveInject,
} from "@angular/core"
import {
   PartialObserver,
   Subject,
   Subscribable,
   Subscription,
   TeardownLogic,
} from "rxjs"
import {
   AccessorValue,
   Check,
   checkPhase,
   CheckPhase,
   CheckSubject,
   CurrentContext,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import {
   addSignal,
   isEmitter,
   isObject,
   isValue,
   Notification,
   observeNotification,
} from "./utils"
import { ValueToken } from "./provider"
import { ComputedValue, flush, setPending } from "./types"

export let currentContext: any
const contextMap = new WeakMap<{}, CurrentContext>()

export function setContext(value: any) {
   const previousContext = currentContext
   currentContext = value
   return previousContext
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
   const previous = setContext(context)
   try {
      return fn(...args)
   } finally {
      setContext(previous)
   }
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

interface ServiceOptions {
   name?: string
   arguments?: any[]
   providedIn: ProvidedIn
}

function createService(context: {}, factory: any, params: any[] = []) {
   createContext(context, serviceInject(INJECTOR), serviceInject(ErrorHandler))
   const value = runInContext(context, factory, ...params)
   runInContext(context, subscribe)
   return value
}

class ContextBinding<T = any> implements Check {
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

const dirty = new Set<Scheduler>()

export class Scheduler extends Subject<any> {
   private dirty: boolean
   closed: boolean

   detectChanges() {
      if (this.dirty && !this.closed) {
         this.dirty = false
         dirty.delete(this)
         try {
            this.next(0)
            this.ref.detectChanges()
            isDevMode() && this.ref.checkNoChanges()
            this.next(1)
         } catch (error) {
            this.errorHandler.handleError(error)
         }
      }
   }

   markDirty() {
      if (this.closed) return
      this.dirty = true
      dirty.add(this)
   }

   unsubscribe() {
      this.closed = true
      dirty.delete(this)
   }

   constructor(
      private ref: ChangeDetectorRef,
      private errorHandler: ErrorHandler,
   ) {
      super()
      this.dirty = false
      this.closed = false
      this.ref.detach()
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

let templateContext: any

export function setTemplateContext(context: any) {
   const previous = templateContext
   templateContext = context
   return previous
}

export function runInTemplate(context: any, handler: Function, ...args: any[]) {
   const previous = setTemplateContext(context)
   const pending = setPending(true)
   try {
      return handler(...args)
   } finally {
      if (!previous) {
         flush()
      }
      setPending(pending)
      setTemplateContext(previous)
   }
}

function decorateFunction(exec: Function, errorHandler: ErrorHandler) {
   function decorated(...args: any[]) {
      try {
         return runInTemplate(null, exec, ...args)
      } catch (error) {
         if (templateContext) {
            errorHandler.handleError(error)
         } else {
            throw error
         }
      }
   }
   return decorated
}

function createState(
   context: any,
   stateFactory: () => {},
   error: ErrorHandler,
) {
   const state = stateFactory()

   for (let [key, value] of Object.entries(state)) {
      if (isCheckSubject(value)) {
         context[key] = value.value
         createBinding(context, key, value)
      } else if (typeof value === "function" && !isEmitter(value)) {
         context[key] = decorateFunction(value, error)
      } else {
         Object.defineProperty(
            context,
            key,
            Object.getOwnPropertyDescriptor(state, key)!,
         )
      }
   }
}

function setup(injector: Injector, stateFactory: () => {}) {
   const context: { [key: string]: any } = currentContext
   const error = injector.get(ErrorHandler)
   const scheduler = new Scheduler(injector.get(ChangeDetectorRef), error)

   createContext(context, injector, error, scheduler, [
      new Set(),
      new Set(),
      new Set(),
   ])

   addTeardown(scheduler)

   try {
      createState(context, stateFactory, error)
   } catch (e) {
      error.handleError(error)
      unsubscribe()
   }
}

export function check(key: CheckPhase) {
   const context = getContext()
   for (const subject of context[key]) {
      subject.check()
   }
}

const emptyObserver = {}

export function subscribe() {
   let effect
   const { effects } = getContext()
   while ((effect = effects.shift())) {
      effect.subscribe(emptyObserver as any)
   }
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
): Subscription | void {
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
   const previous = setPending(true)
   observeNotification(notification, unsubscribe)
   createContext(currentContext, injector, errorHandler, scheduler)
   try {
      const teardown = observeNotification(notification, observer)
      if (signal) {
         addSignal(teardown, signal)
      } else if (signal !== null) {
         addTeardown(teardown)
      }
   } catch (error) {
      errorHandler.handleError(error)
   }
   observeNotification(notification, subscribe)
   flush()
   setPending(previous)
   if (!previous) {
      detectChanges()
   }
}

export function detectChanges() {
   let scheduler
   const list = Array.from(dirty)
   dirty.clear()
   while ((scheduler = list.shift())) {
      scheduler.detectChanges()
   }
}

export class EffectObserver<T> extends Subscription {
   next(value: T | Notification<T>) {
      if (this.closed) return
      if (isObject(value) && "kind" in value && value.kind.length === 1) {
         let mappedValue
         switch (value.kind) {
            case "N":
               mappedValue = Notification.createNext(value.value)
               break
            case "E":
               mappedValue = Notification.createError(value.error)
               break
            case "C":
               mappedValue = Notification.createComplete()
         }
         return this.call(mappedValue)
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
   subscribe(): Subscription {
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
         subscription = new ComputedValue(fn).subscribe(this)
      } else {
         subscription = source.subscribe(this)
      }
      if (this.signal) {
         addSignal(subscription, this.signal)
      }
      return subscription
   }
   unsubscribe() {
      if (this.closed) return
      runInContext(this, unsubscribe)
      super.unsubscribe()
   }
   private call(notification: Notification<T | undefined>) {
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
      super()
      createContext(this, injector, errorHandler, scheduler)
   }
}

@Directive()
class View
   implements DoCheck, AfterContentChecked, AfterViewChecked, OnDestroy
{
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
}

export function decorate(create: any) {
   return class extends View {
      constructor() {
         super()
         runInContext(this, setup, directiveInject(INJECTOR), create)
      }
   } as any
}

export type ProvidedIn = Type<any> | "root" | "platform" | "any" | null

function service<T>(
   factory: (...params: any[]) => T,
   options?: ServiceOptions,
): Type<T> {
   @Injectable({ providedIn: options?.providedIn ?? null })
   class Class {
      static overriddenName = options?.name ?? factory.name
      ngOnDestroy() {
         runInContext(this, unsubscribe)
      }
      constructor() {
         serviceInject(
            NgModuleRef,
            InjectFlags.Self | InjectFlags.Optional,
         )?.onDestroy(() => this.ngOnDestroy())
         return createService(this, factory, options?.arguments)
      }
   }
   return Class as any
}

export interface ServiceStatic {
   new <T>(factory: (...params: any[]) => T, options?: ServiceOptions): Type<T>
}

export const Service: ServiceStatic = service as any

export function inject<T>(
   token: ValueToken<T>,
   notFoundValue?: T,
   flags?: InjectFlags,
): T
export function inject<T>(
   token: ProviderToken<T>,
   notFoundValue?: T,
   flags?: InjectFlags,
): T
export function inject<T>(
   token: ProviderToken<T> | ValueToken<T>,
   notFoundValue?: T,
   flags?: InjectFlags,
): T {
   const { injector } = getContext()
   const previous = setContext(void 0)
   const value = injector.get(token, notFoundValue, flags)
   setContext(previous)
   return value
}

export function ViewDef<T>(create: () => T): ViewDef<T> {
   return decorate(create)
}
type Readonly<T> = {
   readonly [key in keyof T as T[key] extends AccessorValue<infer A, infer B>
      ? A extends B
         ? never
         : key
      : T[key] extends Value<any>
      ? never
      : key]: T[key]
}

type Writable<T> = {
   [key in keyof T as T[key] extends AccessorValue<infer A, infer B>
      ? A extends B
         ? key
         : never
      : T[key] extends Value<any>
      ? key
      : never]: T[key]
}

export type ViewDef<T, U = Readonly<T> & Writable<T>> = Type<
   {
      [key in keyof U]: U[key] extends CheckSubject<infer R> ? R : U[key]
   }
>
