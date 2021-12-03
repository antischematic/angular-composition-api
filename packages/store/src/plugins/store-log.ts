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

const type = {
   N: "next",
   E: "error",
   C: "complete",
}

export class StoreLog {
   static create({ logger = DefaultLogger }: StoreLogOptions = {}) {
      return function (store: StoreLike) {
         const log = inject(logger)
         subscribe(store.event, (event) => {
            log.groupCollapsed(
               `${getPath(store.name, store.parent)} @`,
               getTimestamp(),
               `${event.name}.${type[event.kind]}`,
            )
            if (event.kind === "N") {
               log.log("%cprevious", "color: #9E9E9E", event.previous)
            }
            if (event.kind === "E") {
               log.log("%cerror", "color: #F20404", event.error)
            }
            if (event.kind === "N") {
               log.log("%ccurrent", "color: #4CAF50", event.current)
            }
            log.groupEnd()
         })
      }
   }
}
