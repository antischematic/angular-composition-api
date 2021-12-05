import { StoreLike } from "../interfaces"
import { inject, subscribe } from "@mmuscat/angular-composition-api"
import { InjectionToken, ProviderToken } from "@angular/core"

function getTimestamp() {
   const now = new Date()
   const hours = now.getHours()
   const minutes = now.getMinutes()
   const seconds = now.getSeconds()
   const milliseconds = now.getMilliseconds()
   return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

function getPath(name: string, parent: StoreLike | null, path: string[] = []) {
   path.push(name)
   if (parent) {
      getPath(parent.name, parent.parent, path)
   }
   return path.join(".")
}

export interface StoreLogOptions {
   logger?: ProviderToken<typeof console>
}

export const DefaultLogger = new InjectionToken<typeof console>(
   "DefaultLogger",
   {
      factory() {
         return console
      },
   },
)

const colors = {
   N: "#4CAF50",
   E: "#F20404",
   C: "#9E9E9E",
}

export class StoreLog {
   static create({ logger = DefaultLogger }: StoreLogOptions = {}) {
      return function (store: StoreLike) {
         const log = inject(logger)
         subscribe(store.event, (event) => {
            const color = `color: ${colors[event.kind]}`
            log.groupCollapsed(
               `%c${getPath(store.name, store.parent)}.${event.name}`,
               color,
               "@",
               getTimestamp(),
            )
            if (event.kind === "N" && "previous" in event) {
               log.log("%cprevious", "color: #9E9E9E", event.previous)
            }
            if (event.kind === "E") {
               log.log("%cerror", color, event.error)
            }
            if (event.kind === "N") {
               log.log("%ccurrent", color, event.current)
            }
            log.groupEnd()
         })
      }
   }
}
