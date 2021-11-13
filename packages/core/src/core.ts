import {
   AfterContentChecked,
   AfterViewChecked,
   ChangeDetectorRef,
   Directive,
   DoCheck,
   ErrorHandler,
   Inject,
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
   Notification,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import {
   accept,
   isEmitter,
   isObject,
   isValue,
   observeNotification,
} from "./utils"
import { ValueToken } from "./provider"
import { ComputedValue, defaultFn, flush, setPending } from "./types"

const enum Context {
   SUBSCRIPTION,
   EFFECTS,
   ERROR_HANDLER,
   INJECT,
   SCHEDULER,
   DO_CHECK,
   CONTENT_CHECK,
   VIEW_CHECK,
}

export type CurrentContext = readonly [
   Subscription | undefined,
   EffectObserver[] | undefined,
   ErrorHandler | undefined,
   Injector | undefined,
   Scheduler | undefined,
   Set<Check> | undefined,
   Set<Check> | undefined,
   Set<Check> | undefined,
]

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

export function getContext<T extends 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7>(key: T) {
   const context = contextMap.get(currentContext)
   if (context) {
      return context[key]
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
   check?: Set<any>,
   contentCheck?: Set<any>,
   viewCheck?: Set<any>,
) {
   contextMap.set(context, [
      new Subscription(),
      [],
      error,
      injector,
      scheduler,
      check,
      contentCheck,
      viewCheck,
   ])
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
      if (this.source.isDirty(value)) {
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
         try {
            this.next(0)
            dirty.delete(this)
            this.dirty = false
            this.ref.detectChanges()
            isDevMode() && this.ref.checkNoChanges()
            this.next(1)
         } catch (error) {
            this.errorHandler.handleError(error)
         }
      }
   }

   markDirty() {
      if (this.closed || this.dirty) return
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
   const scheduler = getContext(Context.SCHEDULER)
   const binding = new ContextBinding(context, key, value, scheduler!)
   addCheck(value[checkPhase], binding)
   addTeardown(value.subscribe(binding))
}

let templateContext: any

export function setTemplateContext(context: any) {
   const previous = templateContext
   templateContext = context
   return previous
}

function createState(context: any, stateFactory: () => {}) {
   const state = stateFactory()

   for (let [key, value] of Object.entries(state)) {
      if (isCheckSubject(value)) {
         context[key] = value.value
         createBinding(context, key, value)
      } else {
         Object.defineProperty(
            context,
            key,
            Object.getOwnPropertyDescriptor(state, key)!,
         )
      }
   }
}

function setup(injector: Injector) {
   const context: { [key: string]: any } = currentContext
   const errorHandler = injector.get(ErrorHandler)
   const scheduler = new Scheduler(
      injector.get(ChangeDetectorRef),
      errorHandler,
   )

   createContext(
      context,
      errorHandler,
      injector,
      scheduler,
      new Set(),
      new Set(),
      new Set(),
   )

   addTeardown(scheduler)

   try {
      createState(context, context.__setup)
   } catch (error) {
      errorHandler.handleError(error)
      unsubscribe()
   }
}

export function check(key: CheckPhase) {
   const checks = getContext(key)
   for (const subject of checks!) {
      subject.check()
   }
}

export function subscribe() {
   let effect
   const effects = getContext(Context.EFFECTS)
   while ((effect = effects!.shift())) {
      const subscription = effect.subscribe()
      addSignal(subscription, effect.signal)
   }
}

export function unsubscribe() {
   getContext(Context.SUBSCRIPTION)?.unsubscribe()
}

export function addCheck(key: CheckPhase, subject: any) {
   getContext(key)!.add(subject)
}

export function addTeardown(teardown: TeardownLogic) {
   getContext(Context.SUBSCRIPTION)!.add(teardown)
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

class ComputedObserver {
   call() {
      try {
         return this.source()
      } catch (error) {
         this.effect.handleError(error)
      }
   }
   constructor(private effect: EffectObserver, private source: Function) {}
}

export function addEffect<T>(
   source?: Subscribable<T> | (() => TeardownLogic),
   observer?: PartialObserver<T> | ((value: T) => TeardownLogic),
   signal?: UnsubscribeSignal,
): Subscription | void {
   let effects: EffectObserver[] | undefined,
      error: ErrorHandler | undefined,
      injector: Injector | undefined
   if (currentContext) {
      effects = getContext(Context.EFFECTS)
      error = getContext(Context.ERROR_HANDLER)
      injector = getContext(Context.INJECT)
   }
   const effect = new EffectObserver(
      source as any,
      observer,
      signal,
      error,
      injector,
   )
   effects?.push(effect)
   if (typeof source === "function" && !isValue(source) && !isEmitter(source)) {
      effect.source = new ComputedValue(new ComputedObserver(effect, source))
      effect.observer = defaultFn
   }
   if (!injector) {
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
   context: this
   next(nextValue: Notification<unknown> | unknown): void {
      if (isNotification(nextValue)) {
         return observeNotification(nextValue, this)
      }
      this.call("N", nextValue)
   }

   error(error: unknown) {
      this.call("E", void 0, error)
      if (!this.observer || !("error" in this.observer)) {
         this.handleError(error)
      }
   }

   complete() {
      this.call("C")
   }

   handleError(error: unknown) {
      if (this.errorHandler) {
         this.errorHandler.handleError(error)
         this.unsubscribe()
      } else {
         throw error
      }
   }

   call(kind: "N" | "E" | "C", value?: unknown, error?: unknown) {
      if (this.closed) return
      runInContext(this.context, this.observe, this, kind, value, error)
   }

   observe(
      effect: this,
      kind: "N" | "E" | "C",
      value: unknown,
      error: unknown,
   ) {
      const previous = setPending(true)
      try {
         unsubscribe()
         createContext(effect.context, effect.errorHandler, effect.injector)
         if (effect.observer) {
            const teardown = accept(effect.observer, value, error, kind)
            addSignal(teardown, effect.signal)
         }
         flush()
         subscribe()
      } catch (error) {
         effect.handleError(error)
      } finally {
         setPending(previous)
         if (!previous) {
            detectChanges()
         }
      }
   }

   unsubscribe() {
      if (this.closed) return
      if (this.source instanceof ComputedValue) {
         this.source.stop()
      }
      super.unsubscribe()
      runInContext(this.context, unsubscribe)
   }

   subscribe() {
      const source = this.source as Subscribable<any>
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
      public source?: Subscribable<any> | ComputedValue,
      public observer?: PartialObserver<any> | ((value: any) => TeardownLogic),
      public signal?: UnsubscribeSignal,
      private errorHandler?: ErrorHandler,
      private injector?: Injector,
   ) {
      super()
      this.context = this
      createContext(this, errorHandler)
   }
}

@Directive()
abstract class View
   implements DoCheck, AfterContentChecked, AfterViewChecked, OnDestroy
{
   abstract __setup(): any
   ngDoCheck() {
      runInContext(this, check, Context.DO_CHECK)
   }
   ngAfterContentChecked() {
      runInContext(this, check, Context.CONTENT_CHECK)
   }
   ngAfterViewChecked() {
      runInContext(this, check, Context.VIEW_CHECK)
      runInContext(this, subscribe)
      runInContext(this, detectChanges)
   }
   ngOnDestroy() {
      runInContext(this, unsubscribe)
   }

   constructor(@Inject(INJECTOR) injector: Injector) {
      runInContext(this, setup, injector)
   }
}

export function decorate(setup: any) {
   return class extends View {
      __setup() {
         return setup()
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
   new <T extends {}>(
      factory: (...params: any[]) => T,
      options?: ServiceOptions,
   ): Type<T>
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
   const injector = currentContext
      ? getContext(Context.INJECT)!
      : serviceInject(INJECTOR)
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
      [key in keyof T]: T[key] extends CheckSubject<infer R> ? R : T[key]
   } &
      {
         [key in keyof U]: U[key] extends CheckSubject<infer R> ? R : U[key]
      }
>
