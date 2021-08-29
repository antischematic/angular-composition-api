import {
   ErrorHandler,
   Inject,
   InjectionToken,
   INJECTOR,
   isDevMode,
   ModuleWithProviders,
   NgModule,
   Self,
   Type,
} from "@angular/core"
import {
   inject,
   provide,
   Service,
   subscribe,
   use,
   Value,
} from "@mmuscat/angular-composition-api"
import { Action, ActionDispatcher } from "./action"
import { merge, Notification, Observable } from "rxjs"
import { ValueToken } from "../../core/src/provider"
import { Reducer } from "./reducer"

export interface Store {
   <T>(token: ValueToken<T>): T
}

export type EffectFactory = () => Observable<any>

export interface StoreOptions {
   state: StateFactory
   reducers: Reducer<any>[]
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

function createStore({ reducers, effects, state }: StoreOptions): Store {
   const sink = subscribe()
   const initialState = state()
   const errorHandler = inject(ErrorHandler)
   const injector = inject(INJECTOR)
   for (const reducer of <any>reducers) {
      for (const [action, reduce] of reducer.reducers) {
         const actionTypes = (
            Array.isArray(action) ? action : [action]
         ) as Type<ActionDispatcher<any, any>>[]
         const actions = actionTypes.map((action) => inject(action))
         provide(reducer, use(initialState[reducer.overriddenName]))
         const state: Value<any> = inject(reducer)
         sink.add(
            merge(...actions).subscribe(new ActionObserver(state, reduce)),
         )
      }
   }

   for (const effect of effects ?? []) {
      sink.add(
         effect().subscribe(new EffectObserver(effect.name, errorHandler)),
      )
   }

   function store(token: ValueToken<any>) {
      return injector.get(token).get()
   }

   return store
}

const STORE = new InjectionToken("STORE")

function createStoreProvider(name: string, options: StoreOptions) {
   function Store() {
      return createStore(options)
   }
   Store.overriddenName = name
   Store.Provider = [
      { provide: Store, useClass: Service(Store) },
      options.reducers,
      options.reducers.map(({ reducers }) =>
         reducers.map(([actions]) => actions),
      ),
   ]
   return Store
}

export type StateFactory = () => { [key: string]: any }

export interface StoreFactory extends ValueToken<Store> {
   readonly Provider: any[]
}

interface StoreStatic {
   new (name: string, options: StoreOptions): StoreFactory
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
