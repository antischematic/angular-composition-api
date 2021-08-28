import { ModuleWithProviders, NgModule, OnDestroy, Type } from "@angular/core"
import {
   inject,
   Value,
   Service,
   subscribe,
} from "@mmuscat/angular-composition-api"
import { Action, ActionCreator } from "./action"
import { merge, Subscription } from "rxjs"

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

function createStore(
   getInitialState: () => any,
   { reducers, effects }: StoreOptions,
): Store {
   const sink = new Subscription()
   const initialState = getInitialState()
   for (const reducer of <any>reducers) {
      for (const [action, reduce] of reducer.reducers) {
         const actionTypes = (
            Array.isArray(action) ? action : [action]
         ) as Type<ActionCreator<any, any>>[]
         const actions = actionTypes.map((action) => inject(action))
         const state: Value<any> = inject(reducer)
         state(initialState[reducer.overriddenName])
         sink.add(
            merge(...actions).subscribe(new ActionObserver(state, reduce)),
         )
      }
   }

   for (const effect of effects ?? []) {
      sink.add(effect().subscribe())
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
