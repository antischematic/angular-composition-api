import {
   ErrorHandler,
   Inject,
   InjectionToken,
   isDevMode,
   ModuleWithProviders,
   NgModule,
   Self,
   Type,
} from "@angular/core"
import {
   inject,
   Service,
   subscribe,
   use,
   Value,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { Action, ActionDispatcher } from "./action"
import { merge, Notification, Observable } from "rxjs"

export interface Store {
   <T>(token: ValueToken<T>): T
}

export type EffectFactory = (store: Store) => Observable<any> | void

export interface StoreOptions {
   state: StateFactory
   reducers: ValueToken<any>[]
   effects?: EffectFactory[]
}

class ActionObserver<T extends Action<any>> {
   next(action: T) {
      this.state(this.reduce(this.state.value, action))
   }
   constructor(
      private state: Value<any>,
      private reduce: (state: any, action: any) => any,
   ) {}
}

class EffectObserver {
   next(value: any) {
      if (value instanceof Notification && value.kind === "E") {
         this.error(value.error)
      }
   }
   error(error: unknown) {
      isDevMode() && console.warn(`Unhandled error in effect "${this.name}"`)
      this.errorHandler.handleError(error)
   }
   constructor(private name: string, private errorHandler: ErrorHandler) {}
}

function createStore(
   name: string,
   { reducers, effects, state }: StoreOptions,
): Store {
   const sink = subscribe()
   const initialState = state()
   const errorHandler = inject(ErrorHandler)
   const injector = new Map()
   for (const reducer of <any>reducers) {
      for (const [action, reduce] of (<any>inject(reducer)).reducers) {
         let actions: any[] = []
         const actionTypes = (
            Array.isArray(action) ? action : [action]
         ) as Type<ActionDispatcher<any, any>>[]
         for (const action of actionTypes) {
            if (!injector.has(action)) {
               const emitter = use(inject(action))
               injector.set(action, emitter)
               actions.push(emitter)
            }
         }
         const state = use(initialState[reducer.overriddenName])
         injector.set(reducer, state)
         sink.add(
            merge(...actions).subscribe(
               new ActionObserver(state, reduce) as any,
            ),
         )
      }
   }

   for (const effect of effects ?? []) {
      const source = effect(store)
      if (source) {
         sink.add(
            source.subscribe(new EffectObserver(effect.name, errorHandler)),
         )
      }
   }

   function store(token: ValueToken<any>) {
      if (injector.has(token)) {
         return injector.get(token)
      }
      throw new Error(`No provider found for ${token} in store ${name}`)
   }

   return store
}

const STORE = new InjectionToken("STORE")

function createStoreProvider(name: string, options: StoreOptions) {
   function Store() {
      return createStore(name, options)
   }
   Store.overriddenName = name
   Store.Provider = [
      { provide: Store, useClass: new Service(Store) },
      options.reducers.map((reducer) => reducer.Provider),
   ]
   return Store
}

export type StateFactory = () => { [key: string]: any }

export type StoreFactory = ValueToken<Store>

interface StoreStatic {
   new (name: string, options: StoreOptions): ValueToken<Store>
}

export const Store: StoreStatic = createStoreProvider as any

@NgModule()
export class StoreModule {
   static config(store: StoreFactory): ModuleWithProviders<StoreModule> {
      return {
         ngModule: StoreModule,
         providers: [
            (<any>store).Provider,
            { provide: STORE, useExisting: store },
         ],
      }
   }

   constructor(@Self() @Inject(STORE) private store: Store) {}
}
