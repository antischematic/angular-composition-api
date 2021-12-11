import { Emitter, ValueToken } from "@mmuscat/angular-composition-api"
import { Dispatcher, NextEvent, StoreEvent, StoreLike } from "./interfaces"
import { getTokenName } from "./utils"
import { filter, map } from "rxjs/operators"
import { Injectable, InjectionToken, Injector } from "@angular/core"

@Injectable()
export abstract class StoreContext {
   abstract id: number
   abstract name: string
   abstract events: Emitter<StoreEvent>
   abstract dispatch: Dispatcher
   abstract parent: StoreLike | null

   event(token: ValueToken<any>) {
      const tokenName = getTokenName(token)
      return this.events.pipe(
         filter(
            (event): event is NextEvent =>
               event.kind === "N" && event.name === tokenName,
         ),
         map((event) => event.data),
      )
   }

   protected constructor(public injector: Injector) {
      this.event = this.event.bind(this)
   }
}

export const ParentStore = new InjectionToken<StoreLike>("ParentStore")
