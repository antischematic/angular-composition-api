import { Accessor, AccessorValue, Emitter, Value } from "./interfaces"
import { AccessorValue as AccessorValueType, ComputedValue } from "./types"

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
