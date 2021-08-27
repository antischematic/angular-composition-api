import {
   Injectable,
   InjectFlags,
   InjectionToken,
   Type,
   ɵɵdirectiveInject as directiveInject,
} from "@angular/core"

export type ValueToken<T> = Type<T> & { __ng_value_token: true }

export class EmptyValueError extends Error {
   constructor(token: string) {
      super(`No value or default value provided for "${token}".`)
   }
}

export interface ValueTokenStatic {
   new <T>(name: string): ValueToken<T>
   new <T>(name: string, value: T): ValueToken<T>
}

export class ValueGetterSetter<T extends any> {
   set(value: T) {
      this.value = value
   }
   get() {
      if (this.value === EmptyValueError) {
         throw new EmptyValueError(this.name)
      }
      return this.value
   }
   constructor(private name: string, private value: T) {}
}

function createValueToken<T>(name: string): ValueToken<T>
function createValueToken<T>(name: string, defaultValue: T): ValueToken<T>
function createValueToken(
   name: string,
   defaultValue: unknown = EmptyValueError,
): ValueToken<any> {
   @Injectable({ providedIn: "root" })
   class ValueToken {
      static overriddenName = name
      constructor() {
         return new ValueGetterSetter(name, defaultValue)
      }
   }
   return ValueToken as any
}

export const ValueToken: ValueTokenStatic = createValueToken as any

export function provide<T>(token: ValueToken<T>, value: T): void {
   const Value = directiveInject(token, InjectFlags.Self)
   Value.set(value)
}
