import { addTeardown, getContext } from "./core"
import { subscribe, use } from "./common"

function schedule(callback: () => void = Function, delay: 0 | 1) {
   const emitter = use(callback)
   const { scheduler } = getContext()

   function action() {
      scheduler.schedule(emitter, delay)
   }

   action()

   subscribe(emitter, action)

   return emitter
}

export function onBeforeUpdate(callback?: () => void) {
   return schedule(callback, 0)
}

export function onUpdated(callback?: () => void) {
   return schedule(callback, 1)
}

export function onDestroy(callback: () => void = Function) {
   const emitter = use(callback)
   addTeardown(emitter)
   return emitter
}
