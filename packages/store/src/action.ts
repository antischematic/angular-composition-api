import { use, ValueToken } from "@mmuscat/angular-composition-api"
import { Observable } from "rxjs"

export type Action<T extends string, U extends {} = {}> = U & {
   readonly kind: T
}

export interface DispatchAction<T extends string>
   extends Observable<Action<T>> {
   (): void
   readonly kind: string
}

export interface DispatchActionWithProps<
   T extends string,
   U extends ActionPropsFactory<any, any>,
> extends Observable<Action<T, ReturnType<U>>> {
   (...args: Parameters<U>): void
   readonly kind: string
}

export type ActionDispatcher<
   T extends string,
   U extends ActionPropsFactory<any, any>,
> = DispatchAction<T> | DispatchActionWithProps<T, U>

interface ActionStatic {
   new <T extends string, U extends ActionPropsFactory<any, any>>(
      kind: T,
      factory: U,
   ): ValueToken<DispatchActionWithProps<T, U>>
   new <T extends string>(kind: T): ValueToken<DispatchAction<T>>
}

export type ActionPropsFactory<TParams extends any[], TReturn extends {}> = (
   ...args: TParams
) => TReturn

function defaultFactory() {
   return {}
}

function createActionFactory(
   kind: string,
   factory: (...args: any[]) => {} = defaultFactory,
) {
   function createAction(...args: any[]) {
      return {
         ...factory(...args),
         kind,
      }
   }
   return new ValueToken(kind, {
      factory() {
         return use(createAction)
      },
   })
}

export const Action: ActionStatic = createActionFactory as any

export function props<T extends {}>(): ActionPropsFactory<[T], T> {
   return function (value) {
      return value
   }
}
