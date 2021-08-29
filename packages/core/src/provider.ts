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
   new <T>(name: string, options?: { factory: () => T }): ValueToken<T>
}

export class ValueGetterSetter<T extends any> {
   private value?: T
   private hasValue: boolean
   set(value: T) {
      this.hasValue = true
      this.value = value
   }
   get() {
      if (this.hasValue) {
         return this.value
      } else if (this.options) {
         this.set(this.options.factory())
         return this.value
      } else {
         throw new EmptyValueError(this.name)
      }
   }
   constructor(private name: string, private options?: { factory: () => T }) {
      this.hasValue = false
   }
}

function createValueToken<T>(name: string): ValueToken<T>
function createValueToken<T>(name: string, options?: { factory: () => T }): ValueToken<T>
function createValueToken(
   name: string,
   options?: { factory: () => any },
): ValueToken<any> {
   @Injectable({ providedIn: "root" })
   class ValueToken {
      static overriddenName = name
      constructor() {
         return new ValueGetterSetter(name, options)
      }
   }
   return ValueToken as any
}

export const ValueToken: ValueTokenStatic = createValueToken as any

export function provide<T>(token: ValueToken<T>, value: T): void {
   const Value = directiveInject(token, InjectFlags.Self)
   Value.set(value)
}
