import { StoreLike, StorePlugin } from "../interfaces"
import { inject, subscribe } from "@mmuscat/angular-composition-api"
import { Injectable, InjectionToken, ProviderToken } from "@angular/core"
import { StoreContext } from "../providers"
import { groupBy, map, mergeMap, pairwise } from "rxjs"

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

export const StoreLogOptions = new InjectionToken<StoreLogOptions>("StoreLogOptions", {
   factory() {
      return {}
   }
})

@Injectable({ providedIn: "root" })
export class StoreLog implements StorePlugin {
   create(store: StoreContext) {
      const { logger = DefaultLogger } = inject(StoreLogOptions)
      const log = inject(logger)

      const events = store.events.pipe(
         groupBy((event) => event.name),
         mergeMap((group) => group.pipe(pairwise()))
      )

      subscribe(events, ([previous, event]) => {
         const color = `color: ${colors[event.kind]}`

         log.groupCollapsed(
            `%c${getPath(store.name, store.parent)}.${event.name}`,
            color,
            "@",
            getTimestamp(),
         )
         if (previous.kind === "N") {
            log.log("%cprevious", "color: #9E9E9E", previous.data)
         }
         if (event.kind === "E") {
            log.log("%cerror", color, event.error)
         }
         if (event.kind === "C") {
            log.log("%ccomplete", color)
         }
         if (event.kind === "N") {
            log.log("%ccurrent", color, event.data)
         }
         log.groupEnd()
      })
   }
}
