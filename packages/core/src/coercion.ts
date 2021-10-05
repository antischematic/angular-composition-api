import { select } from "./select"
import { use } from "./common"
import { ElementRef } from "@angular/core"
import {AccessorValue, QueryType} from "./interfaces"

export type BooleanInput = string | boolean | null | undefined

/** Coerces a data-bound value (typically a string) to a boolean. */
export function coerceBooleanProperty(value: any): boolean {
   return value != null && `${value}` !== "false"
}

export function useBoolean(
   initialValue: BooleanInput = false,
): AccessorValue<boolean, BooleanInput> {
   const value = use(coerceBooleanProperty(initialValue))
   return select({
      value,
      next(val: BooleanInput) {
         value.next(coerceBooleanProperty(val))
      },
   })
}

export type NumberInput = string | number | null | undefined

/** Coerces a data-bound value (typically a string) to a number. */
export function coerceNumberProperty(value: any): number
export function coerceNumberProperty<D>(value: any, fallback: D): number | D
export function coerceNumberProperty(value: any, fallbackValue = 0) {
   return _isNumberValue(value) ? Number(value) : fallbackValue
}

export function _isNumberValue(value: any): boolean {
   // parseFloat(value) handles most of the cases we're interested in (it treats null, empty string,
   // and other non-number values as NaN, where Number just uses 0) but it considers the string
   // '123hello' to be a valid number. Therefore we also check if Number(value) is NaN.
   return !isNaN(parseFloat(value as any)) && !isNaN(Number(value))
}

export function useNumber(initialValue: NumberInput) {
   const value = use(coerceNumberProperty(initialValue))
   return select({
      value,
      next(val: NumberInput) {
         value.next(coerceNumberProperty(val))
      },
   })
}

export function coerceArray<T>(value: T | T[]): T[]
export function coerceArray<T>(value: T | readonly T[]): readonly T[]
export function coerceArray<T>(value: T | T[]): T[] {
   return Array.isArray(value) ? value : [value]
}

export function useArray<T>(initialValue: T | T[]) {
   const value = use(coerceArray(initialValue))
   return select({
      value,
      next(val: T | T[]) {
         value.next(coerceArray(val))
      },
   })
}

export function coerceElement<T>(elementOrRef: ElementRef<T> | T): T {
   return elementOrRef instanceof ElementRef
      ? elementOrRef.nativeElement
      : elementOrRef
}

export function useElement<T>(): AccessorValue<ElementRef<T> | T, T | undefined>
export function useElement<T>(
   initialValue: QueryType,
): AccessorValue<ElementRef<T> | T, T | undefined>
export function useElement<T>(
   initialValue: ElementRef<T> | T,
): AccessorValue<ElementRef<T> | T, T>
export function useElement<T>(initialValue?: ElementRef<T> | T | Function) {
   const value = use(
      typeof initialValue === "function"
         ? initialValue
         : coerceElement(initialValue),
   )
   return select({
      value,
      next(val: ElementRef<T> | T) {
         value.next(coerceElement(val))
      },
   })
}
