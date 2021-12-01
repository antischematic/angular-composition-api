import { addTeardown, getContext } from "./core"
import { listen, subscribe, use } from "./common"
import { Subject } from "rxjs"
import { Change, ReadonlyValue } from "./interfaces"

class ScheduleObserver {
   next(phase: number) {
      if (phase === this.phase) {
         this.emitter.next()
      }
   }
   constructor(private phase: number, private emitter: Subject<void>) {}
}

function schedule(callback: () => void = Function, phase: 0 | 1) {
   const emitter = listen<void>(callback)
   const scheduler = getContext(4)!

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
   const emitter = listen(callback)
   addTeardown(emitter)
   return emitter
}

export function onChanges<T>(
   value: ReadonlyValue<T>,
   callback?: (change: Change<T>) => void,
) {
   const changes = use<Change<T>>({
      first: true,
      current: value.value,
      previous: undefined,
   })
   const remove = value.onChanges((previous, current) => {
      changes({
         first: false,
         current,
         previous,
      })
   })
   onDestroy(remove)
   if (callback) {
      subscribe(changes, callback)
   }
   return changes
}
