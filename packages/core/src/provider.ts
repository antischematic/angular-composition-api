import {
   Injectable,
   InjectFlags,
   InjectionToken, Type,
   ɵɵdirectiveInject as directiveInject,
} from "@angular/core";

export type ValueToken<T> = Type<T> & { __ng_value_token: true }

export interface ValueTokenStatic {
   new<T>(name: string, value: T): ValueToken<T>
}

export class ValueGetterSetter<T> {
   set(value: T) {
      this.value = value
   }
   get() {
      return this.value
   }
   constructor(private value: T) {}
}

function createValueToken<T>(name: string): ValueToken<T>
function createValueToken<T>(name: string, defaultValue: T): ValueToken<T>
function createValueToken(name: string, defaultValue?: unknown): ValueToken<any> {
   @Injectable({ providedIn: "root" })
   class ValueToken {
      static overriddenName = name
      constructor() {
         return new ValueGetterSetter(defaultValue)
      }
   }
   return ValueToken as any
}

export const ValueToken: ValueTokenStatic = createValueToken as any

export const providerMap = new Map()

export function provide<T>(token: ValueToken<T>, value: T): void {
   const Value = directiveInject(token, InjectFlags.Self)
   Value.set(value)
}