import { StoreContext, StoreEvent, StoreLike, StorePlugin, getTokenName } from "@mmuscat/angular-phalanx"
import { ValueToken } from "@mmuscat/angular-composition-api"
import { Injectable, InjectionToken, ProviderToken } from "@angular/core"
import { Subscription } from "rxjs"
import { filter, groupBy, map, mergeMap, pairwise, startWith } from "rxjs/operators"

function getTimestamp(id: number) {
   const now = new Date()
   const hours = now.getHours()
   const minutes = now.getMinutes()
   const seconds = now.getSeconds()
   const milliseconds = now.getMilliseconds()
   return `[${id}] ${hours}:${minutes}:${seconds}.${milliseconds}`
}

export interface StoreLogOptions {
   logger?: ProviderToken<typeof console>
   redacted?: ValueToken<any>[]
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

function isExcluded(exclusions: string[], event: StoreEvent) {
   return exclusions.some((name) => event.name === name)
}

@Injectable({ providedIn: "root" })
export class StoreLog implements StorePlugin {
   static config(options: StoreLogOptions) {
      return {
         provide: StoreLogOptions,
         useValue: options,
      }
   }

   storeMap: Map<number, Subscription>

   onStoreCreate({ id, name, events, injector }: StoreContext) {
      const { redacted = [], logger = DefaultLogger } =
         injector.get(StoreLogOptions)
      const log = injector.get(logger)
      const exclusions = redacted.map(getTokenName)

      const storeEvents = events.pipe(
         filter((event) => event.target === id),
         map((event) => {
            if ("data" in event && isExcluded(exclusions, event)) {
               return {
                  ...event,
                  data: "<<REDACTED>>",
               }
            }
            return event
         }),
         groupBy((event) => event.name),
         mergeMap((group) =>
            group.pipe(
               startWith({
                  kind: "N" as const,
                  name: group.key,
                  data: undefined,
               }),
               pairwise(),
            ),
         ),
      )

      const subscription = storeEvents.subscribe(([previous, event]) => {
         const color = `color: ${colors[event.kind]}`
         log.groupCollapsed(
            `%c${name}.${event.name}`,
            color,
            "@",
            getTimestamp(id),
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
            log.log("%cnext", color, event.data)
         }
         log.groupEnd()
      })

      this.storeMap.set(id, subscription)
   }
   onStoreDestroy({ id }: StoreLike) {
      this.storeMap.get(id)?.unsubscribe()
   }

   constructor() {
      this.storeMap = new Map()
   }
}
