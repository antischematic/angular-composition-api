import { StoreLike, StorePlugin } from "../interfaces"
import { ValueToken } from "@mmuscat/angular-composition-api"
import { Injectable, InjectionToken, ProviderToken } from "@angular/core"
import { StoreContext } from "../providers"
import { filter, groupBy, mergeMap, pairwise } from "rxjs"
import { getTokenName } from "../utils"

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
   exclude?: ValueToken<any>[]
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

export const StoreLogOptions = new InjectionToken<StoreLogOptions>(
   "StoreLogOptions",
   {
      factory() {
         return {}
      },
   },
)

@Injectable({ providedIn: "root" })
export class StoreLog implements StorePlugin {
   static config(options: StoreLogOptions) {
      return {
         provide: StoreLogOptions,
         useValue: options,
      }
   }

   create({ name, event, events, injector, parent }: StoreContext) {
      const { exclude = [], logger = DefaultLogger } =
         injector.get(StoreLogOptions)
      const log = injector.get(logger)
      const exclusions = exclude.map(getTokenName)

      const storeEvents = events.pipe(
         filter((event) => !exclusions.some((name) => event.name === name)),
         groupBy((event) => event.name),
         mergeMap((group) => group.pipe(pairwise())),
      )

      storeEvents.subscribe(([previous, event]) => {
         const color = `color: ${colors[event.kind]}`
         log.groupCollapsed(
            `%c${getPath(name, parent)}.${event.name}`,
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
