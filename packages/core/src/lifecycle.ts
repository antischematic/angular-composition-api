import { addTeardown, getContext } from "./core"
import { subscribe, use } from "./common"
import { Subject } from "rxjs"

class ScheduleObserver {
   next(phase: number) {
      if (phase === this.phase) {
         this.emitter.next()
      }
   }
   constructor(private phase: number, private emitter: Subject<void>) {}
}

function schedule(callback: () => void = Function, phase: 0 | 1) {
   const emitter = use(callback)
   const { scheduler } = getContext()

   subscribe(scheduler, new ScheduleObserver(phase, emitter))

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
