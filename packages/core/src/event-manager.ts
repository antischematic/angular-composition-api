import { Injectable } from "@angular/core"
import { EventManager } from "@angular/platform-browser"
import { detectChanges } from "./core"

function wrapHandlerInDetectChanges(handler: Function) {
   return function handlerWrappedInDetectChanges(...args: any[]) {
      handler(...args)
      detectChanges()
   }
}

@Injectable({ providedIn: "root" })
export class ZonelessEventManager extends EventManager {
   addEventListener(
      element: HTMLElement,
      eventName: string,
      handler: Function,
   ): Function {
      handler = wrapHandlerInDetectChanges(handler)
      return super.addEventListener(element, eventName, handler)
   }
}
