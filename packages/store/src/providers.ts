import {
   Emitter,
   inject,
   select,
   use,
   ValueToken,
} from "@mmuscat/angular-composition-api"
import { Dispatcher, NextEvent, StoreEvent } from "./interfaces"
import { getTokenName } from "./utils"
import { filter, map } from "rxjs/operators"
import { merge, Subject } from "rxjs"
import { Inject, Injectable, InjectFlags, Injector } from "@angular/core"

@Injectable()
export abstract class StoreContext {
   abstract id: number
   abstract name: string
   abstract dispatch: Dispatcher

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

   protected constructor(
      public injector: Injector,
      @Inject(StoreEvents) public events: Emitter<StoreEvent>,
   ) {
      this.event = this.event.bind(this)
   }
}

export const StoreEvents: ValueToken<Emitter<StoreEvent>> = new ValueToken(
   "StoreEvents",
   {
      factory() {
         const parent = inject(StoreEvents, null, InjectFlags.SkipSelf)
         const emitter = use(Function)
         if (parent) {
            return select(
               {
                  next: emitter,
                  value: merge(parent, emitter),
               },
               { behavior: false, subject: new Subject() },
            )
         }
         return emitter
      },
   },
)
