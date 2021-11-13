import {
   Accessor,
   AccessorValue,
   Emitter,
   ExpandValue,
   Value,
} from "./interfaces"
import {
   AccessorValue as AccessorValueType,
   ComputedValue,
   flush,
   setPending,
} from "./types"
import { get, getPath, isEmitter, isValue, walk } from "./utils"

export function select<T, U>(accessor: Accessor<T, U>): AccessorValue<T, U>
export function select<T extends Value<any> | Emitter<any>>(source: T): unknown
export function select<T>(source: () => T): Value<T>
export function select(
   source: (() => any) | Accessor<any, any> | Value<any> | Emitter<any>,
): unknown {
   if (typeof source === "function" && !isValue(source) && !isEmitter(source)) {
      return new ComputedValue(source) as any
   }
   return new AccessorValueType(source as any)
}

export function combine<T extends {}>(object: T): Value<ExpandValue<T>> {
   const computed = select(() => get(object))
   return select({
      next(nextValue: any) {
         let shouldTrigger = true
         const previous = setPending(true)
         walk(nextValue, (val, path) => {
            const [key, ...rest] = path
            const target = getPath(object, rest)
            if (isValue(target[key])) {
               shouldTrigger = false
               target[key](val)
            } else {
               target[key] = val
            }
         })
         if (shouldTrigger) {
            computed(computed.value)
         }
         setPending(previous)
         flush()
      },
      value: computed,
   }) as Value<ExpandValue<T>>
}
