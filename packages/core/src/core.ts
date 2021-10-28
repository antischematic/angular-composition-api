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
   Unsubscribable,
} from "rxjs"
import {
   AccessorValue,
   Check,
   checkPhase,
   CheckPhase,
   CheckSubject,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import {
   isEmitter,
   isObject,
   isValue,
   Notification,
   observeNotification,
} from "./utils"
import { ValueToken } from "./provider"
import {ComputedValue, defaultFn, flush, setPending} from "./types"

export interface CurrentContext {
   injector: Injector
   error: ErrorHandler
   subscription: Subscription
   effects: EffectObserver[]
   scheduler: Scheduler
   0: Set<Check>
   1: Set<Check>
   2: Set<Check>
}

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
   error?: ErrorHandler,
   injector?: Injector,
   scheduler?: Scheduler,
   additionalContext?: any,
) {
   contextMap.set(context, {
      injector,
      error,
      scheduler,
      subscription: new Subscription(),
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
   createContext(context, serviceInject(ErrorHandler), serviceInject(INJECTOR))
   const value = runInContext(context, factory, ...params)
   contextMap.set(value, contextMap.get(context)!)
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

   createContext(context, error, injector, scheduler, [
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

export function subscribe() {
   let effect
   const { effects } = getContext()
   while ((effect = effects.shift())) {
      const subscription = effect.subscribe()
      addSignal(subscription, effect.signal)
   }
}

export function unsubscribe() {
   getContext().subscription.unsubscribe()
}

export function addCheck(key: CheckPhase, subject: any) {
   getContext()[key].add(subject)
}

export function addTeardown(teardown: TeardownLogic) {
   getContext().subscription.add(teardown)
}

export function addSignal(
   teardown?: Unsubscribable | (() => void),
   abort?: UnsubscribeSignal,
) {
   if (!teardown) return
   const subscription = new Subscription()
   subscription.add(teardown)
   if (abort instanceof AbortSignal) {
      const listener = () => subscription.unsubscribe()
      abort.addEventListener("abort", listener, { once: true })
   } else if (abort) {
      abort.add(subscription)
   } else if (abort !== null) {
      addTeardown(subscription)
   }
}

const empty = {} as CurrentContext

export function addEffect<T>(
   source?: Subscribable<T> | (() => TeardownLogic),
   observer?: PartialObserver<T> | ((value: T) => TeardownLogic),
   signal?: UnsubscribeSignal,
): Subscription | void {
   const { effects, error } = currentContext ? getContext() : empty
   const effect = new EffectObserver(source as any, observer, signal, error)
   effects?.push(effect)
   if (typeof source === "function" && !isValue(source) && !isEmitter(source)) {
      const computed = new ComputedValue(() => {
         try {
            return source()
         } catch (error) {
            effect.handleError(error)
         }
      })
      effect.source = computed
      effect.observer = defaultFn
      effect.add(() => computed.stop())
   }
   if (!currentContext) {
      effect.add(effect.subscribe())
   }
   return effect
}

export function detectChanges() {
   let scheduler
   const list = Array.from(dirty)
   dirty.clear()
   while ((scheduler = list.shift())) {
      scheduler.detectChanges()
   }
}

function isNotification(
   nextValue: unknown,
): nextValue is Notification<unknown> {
   return !!(
      isObject(nextValue) && String((<any>nextValue)["kind"]).match(/^[NEC]$/)
   )
}

export class EffectObserver extends Subscription {
   that: this
   next(nextValue: Notification<unknown> | unknown): void {
      if (isNotification(nextValue)) {
         return this.call(nextValue)
      }
      this.call(Notification.createNext(nextValue))
   }

   error(error: unknown) {
      this.call(Notification.createError(error))
   }

   complete() {
      this.call(Notification.createComplete())
   }

   handleError(error: unknown) {
      if (this.errorHandler) {
         this.errorHandler.handleError(error)
         this.unsubscribe()
      } else {
         throw error
      }
   }

   call(notification: Notification<unknown>) {
      if (this.closed) return
      runInContext(this.that, this.observe, notification)
   }

   observe(notification: Notification<unknown>) {
      const previous = setPending(true)
      try {
         unsubscribe()
         createContext(this, this.errorHandler)
         if (this.observer) {
            const teardown = observeNotification(notification, this.observer)
            addSignal(teardown, this.signal)
         }
         if (
            notification.kind === "E" &&
            (!this.observer || !("error" in this.observer))
         ) {
            this.handleError(notification.error)
         }
         flush()
         subscribe()
      } catch (error) {
         this.handleError(error)
      } finally {
         setPending(previous)
         if (!previous) {
            detectChanges()
         }
      }
   }

   unsubscribe() {
      if (this.closed) return
      super.unsubscribe()
      runInContext(this.that, unsubscribe)
   }

   subscribe() {
      const source = this.source
      if (!source) {
         return this
      }
      try {
         this.add(source.subscribe(this))
      } catch (error) {
         this.handleError(error)
      }
      return this
   }

   constructor(
      public source?: Subscribable<any>,
      public observer?: PartialObserver<any> | ((value: any) => TeardownLogic),
      public signal?: UnsubscribeSignal,
      private errorHandler?: ErrorHandler,
   ) {
      super()
      this.that = this
      this.observe = this.observe.bind(this)
      createContext(this, errorHandler)
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
      runInContext(this, detectChanges)
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
   new <T extends {}>(factory: (...params: any[]) => T, options?: ServiceOptions): Type<T>
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
