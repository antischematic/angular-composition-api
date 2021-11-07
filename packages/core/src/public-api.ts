/*
 * Public API Surface of angular-composition-api
 */

export {
   Service,
   inject,
   CallContextError,
   decorate,
   ViewDef,
} from "./core"
export { use, subscribe, listen } from "./common"
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
   Accessor,
   AccessorValue,
} from "./interfaces"
export { select } from "./select"
export { ValueToken, provide, EmptyValueError } from "./provider"
export { onDestroy, onUpdated, onBeforeUpdate } from "./lifecycle"
export { ZonelessEventManager } from "./event-manager"
