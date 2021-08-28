import {
   ErrorHandler,
   isDevMode,
   ModuleWithProviders,
   NgModule,
   OnDestroy,
   Type
} from "@angular/core"
import {
   inject,
   provide,
   Value,
   Service,
   subscribe,
   use,
} from "@mmuscat/angular-composition-api"
import { Action, ActionCreator } from "./action"
import {merge, Notification, Subscription} from "rxjs"

export abstract class Store {
   abstract unsubscribe(): void
}

export interface StoreOptions {
   reducers: Type<any>[]
   effects?: Function[]
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
   getInitialState: () => any,
   { reducers, effects }: StoreOptions,
): Store {
   const sink = new Subscription()
   const initialState = getInitialState()
   const errorHandler = inject(ErrorHandler)
   for (const reducer of <any>reducers) {
      for (const [action, reduce] of reducer.reducers) {
         const actionTypes = (
            Array.isArray(action) ? action : [action]
         ) as Type<ActionCreator<any, any>>[]
         const actions = actionTypes.map((action) => inject(action))
         provide(reducer, use(initialState[reducer.overriddenName]))
         const state: Value<any> = inject(reducer)
         sink.add(
            merge(...actions).subscribe(new ActionObserver(state, reduce)),
         )
      }
   }

   for (const effect of effects ?? []) {
      sink.add(effect().subscribe(new EffectObserver(effect.name, errorHandler)))
   }

   function unsubscribe() {
      sink.unsubscribe()
   }

   return {
      unsubscribe,
   }
}

@NgModule()
export class StoreModule implements OnDestroy {
   static config(
      getInitialState: () => any,
      options: StoreOptions,
   ): ModuleWithProviders<StoreModule> {
      return {
         ngModule: StoreModule,
         providers: [
            options.reducers,
            {
               provide: Store,
               useClass: Service(() => createStore(getInitialState, options)),
            },
         ],
      }
   }

   ngOnDestroy() {
      this.store.unsubscribe()
   }

   constructor(private store: Store) {}
}

export function useStore(getInitialState: () => any, options: StoreOptions) {
   subscribe(() => createStore(getInitialState, options))
}
