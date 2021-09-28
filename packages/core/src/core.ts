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
   BehaviorSubject,
   Notification,
   PartialObserver,
   SchedulerAction,
   SchedulerLike,
   Subscribable,
   Subscription,
   TeardownLogic,
   Unsubscribable,
} from "rxjs"
import {
   Check,
   checkPhase,
   CheckPhase,
   CheckSubject,
   CurrentContext,
   UnsubscribeSignal,
   Value,
} from "./interfaces"
import { addSignal, computeValue, isEmitter, isObject, isValue } from "./utils"
import { ValueToken } from "./provider"

let currentContext: any
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

let timeoutId: number | undefined

class Action<T> extends Subscription implements SchedulerAction<T> {
   delay?: number
   state: any
   schedule(state?: any, delay?: number): Subscription {
      this.state = state
      this.delay = delay
      this.scheduler.enqueue(this)
      return this
   }

   execute(state: any) {
      if (this.closed) {
         return new Error("executing a cancelled action")
      }
      try {
         this.work(state)
      } catch (error) {
         return error
      }
   }

   constructor(
      private scheduler: Scheduler,
      private work: (this: Action<any>, state?: T) => void,
   ) {
      super()
   }
}

export class Scheduler implements SchedulerLike {
   private dirty: boolean
   actions: Action<any>[][] = [[], []]
   closed: boolean

   detectChanges() {
      if (this.dirty && !this.closed) {
         this.dirty = false
         dirty.delete(this)
         try {
            this.flush(0)
            this.ref.detectChanges()
            isDevMode() && this.ref.checkNoChanges()
            this.flush(1)
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
      this.dirty = false
      this.closed = false
      this.ref.detach()
   }

   now(): number {
      return Date.now()
   }

   enqueue(action: Action<any>) {
      this.actions[+(action.delay !== 0)].push(action)
   }

   flush(step: number) {
      let action
      let error
      const actions = this.actions[step]
      while ((action = actions.shift()!)) {
         if ((error = action.execute(action.state))) {
            break
         }
      }
      if (error) {
         while ((action = actions.shift()!)) {
            action.unsubscribe()
         }
         throw error
      }
   }

   schedule<T>(
      work: (this: Action<T>, state?: T) => void,
      delay?: number,
      state?: T,
   ): Subscription {
      return new Action(this, work).schedule(state, delay)
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

export function runInTemplate(handler: Function, ...args: any[]) {
   const previous = setTemplateContext(handler)
   try {
      handler(...args)
   } finally {
      setTemplateContext(previous)
   }
}

function decorateFunction(exec: Function, errorHandler: ErrorHandler) {
   function decorated(...args: any[]) {
      try {
         return exec(...args)
      } catch (error) {
         if (templateContext) {
            errorHandler.handleError(error)
         } else {
            throw error
         }
      }
   }
   decorated.originalFunction = exec
   return decorated
}

export interface Context extends SchedulerLike {
   markDirty(): void
   detectChanges(): void
}

function setup(injector: Injector, stateFactory: (context: Context) => {}) {
   const context: { [key: string]: any } = currentContext
   const error = injector.get(ErrorHandler)
   const scheduler = new Scheduler(injector.get(ChangeDetectorRef), error)

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
         context[key] = decorateFunction(value, error)
      } else {
         Object.defineProperty(
            context,
            key,
            Object.getOwnPropertyDescriptor(state, key)!,
         )
      }
   }

   addTeardown(scheduler)
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
      effect.subscribe()
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

export function detectChanges() {
   timeoutId = undefined
   let scheduler
   const list = Array.from(dirty)
   dirty.clear()
   while ((scheduler = list.shift())) {
      scheduler.detectChanges()
   }
}

export class ComputedSubject<T> extends BehaviorSubject<T> {
   [checkPhase]: CheckPhase
   compute
   subscription!: Subscription

   private subscribeDeps(deps: any[]) {
      let dep
      let first = true
      this.subscription = new Subscription()
      while ((dep = deps.shift())) {
         this.subscription.add(
            dep.subscribe(() => {
               if (!first) {
                  this.subscription.unsubscribe()
                  const [value, deps] = computeValue(this.compute)
                  this.subscribeDeps(deps)
                  this.next(value)
               }
            }),
         )
      }
      first = false
   }

   constructor(compute: (value?: T) => T) {
      const [value, deps] = computeValue(compute)
      super(value)
      this[checkPhase] = 0
      this.compute = compute
      this.subscribeDeps(deps)
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

const serviceMap = new Map()

function service<T>(
   factory: (...params: any[]) => T,
   options?: ServiceOptions,
): Type<T> {
   @Injectable({ providedIn: options?.providedIn ?? null })
   class Class {
      static overriddenName = options?.name ?? factory.name
      ngOnDestroy() {
         runInContext(serviceMap.get(this) ?? this, unsubscribe)
         serviceMap.delete(this)
      }
      constructor() {
         serviceInject(
            NgModuleRef,
            InjectFlags.Self | InjectFlags.Optional,
         )?.onDestroy(() => this.ngOnDestroy())
         const value = createService(this, factory, options?.arguments)
         serviceMap.set(value, this)
         return value
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
