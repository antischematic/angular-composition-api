/*
 * Public API Surface of angular-composition-api
 */

export {
   Service,
   inject,
   CallContextError,
   decorate,
   ViewDef,
   detectChanges,
} from "./core"
export { use, subscribe } from "./common"
export {
   CheckSubject,
   checkPhase,
   CheckPhase,
   State,
   UnsubscribeSignal,
   Value,
   ReadonlyValue,
   Emitter,
   EmitterWithParams,
   ValueAccessorOptions,
} from "./interfaces"
export { select, ValueAccessor } from "./select"
export { ValueToken, provide, EmptyValueError } from "./provider"
export { onDestroy, onUpdated, onBeforeUpdate } from "./lifecycle"
export { ZonelessEventManager } from "./event-manager"
export { useArray, useBoolean, useElement, useNumber } from "./coercion"
