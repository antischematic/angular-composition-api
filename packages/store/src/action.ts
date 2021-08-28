import { use, ValueToken } from "@mmuscat/angular-composition-api"
import { Observable } from "rxjs"

export type Action<T extends string, U extends {} = {}> = U & {
   readonly kind: T
}

export interface VoidActionCreator<T extends string>
   extends Observable<Action<T>> {
   (): void
   readonly kind: string
}

export interface ActionCreatorWithProps<
   T extends string,
   U extends ActionPropsFactory<any, any>,
> extends Observable<Action<T, ReturnType<U>>> {
   (...args: Parameters<U>): void
   readonly kind: string
}

export type ActionCreator<
   T extends string,
   U extends ActionPropsFactory<any, any>,
> = VoidActionCreator<T> | ActionCreatorWithProps<T, U>

interface ActionStatic {
   new <T extends string, U extends ActionPropsFactory<any, any>>(
      kind: T,
      factory: U,
   ): ValueToken<ActionCreatorWithProps<T, U>>
   new <T extends string>(kind: T): ValueToken<VoidActionCreator<T>>
}

export type ActionPropsFactory<TParams extends any[], TReturn extends {}> = (
   ...args: TParams
) => TReturn

function defaultFactory() {
   return {}
}

function createAction(
   kind: string,
   factory: (...args: any[]) => {} = defaultFactory,
) {
   const dispatch = use((...args: any[]) => {
      return {
         ...factory(...args),
         kind,
      }
   })
   return new ValueToken(kind, dispatch)
}

export const Action: ActionStatic = createAction as any

export function props<T extends {}>(): ActionPropsFactory<[T], T> {
   return function (value) {
      return value
   }
}
