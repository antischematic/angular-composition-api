import {Accessor, AccessorValue, Emitter, ExpandValue, Value} from "./interfaces"
import { AccessorValue as AccessorValueType, ComputedValue } from "./types"
import {access, getPath, isValue, walk} from "./utils";
import {use} from "./common";

export function select<T, U>(accessor: Accessor<T, U>): AccessorValue<T, U>
export function select<T extends Value<any> | Emitter<any>>(source: T): unknown
export function select<T>(source: () => T): Value<T>
export function select(
   source: (() => any) | Accessor<any, any> | Value<any> | Emitter<any>,
): unknown {
   if (typeof source === "function") {
      return new ComputedValue(source) as any
   }
   return new AccessorValueType(source)
}

export function combine<T extends {}>(object: T): Value<ExpandValue<T>> {
   const value = use(access(object))
   return select({
      next(nextValue: any) {
         walk(nextValue, (val, path) => {
            const [key, ...rest] = path
            const target = getPath(object, rest)
            if (isValue(target[key])) {
               target[key](val)
            } else {
               target[key] = val
            }
         })
         value(access(object))
      },
      value
   }) as Value<ExpandValue<T>>
}
