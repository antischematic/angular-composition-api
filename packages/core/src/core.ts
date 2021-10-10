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
   PartialObserver,
   SchedulerAction,
   SchedulerLike,
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
   computeValue,
   isEmitter,
   isObject,
   isValue,
   Notification, observeNotification,
} from "./utils"
import { ValueToken } from "./provider"

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

   now(): number {
      return Date.now()
   }

   enqueue(action: Action<any>) {
      this.actions[+(action.delay !== 0)].push(action)
   }

   flush(step: number) {
      let action
      let error
      const actions = this.actions[step].splice(0, Infinity)
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

   constructor(
      private ref: ChangeDetectorRef,
      private errorHandler: ErrorHandler,
   ) {
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
   try {
      handler(...args)
   } finally {
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
   decorated.originalFunction = exec
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
   detectChanges()
}

export function detectChanges() {
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
         subscription = new ComputedSubject(fn).subscribe(this)
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
