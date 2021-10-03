import { Injectable } from "@angular/core"
import { EventManager } from "@angular/platform-browser"
import { detectChanges, runInTemplate } from "./core"

function wrapHandlerInTemplateContext(handler: Function) {
   return function handlerWrappedInDetectChanges(...args: any[]) {
      runInTemplate(handler, handler, ...args)
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
      handler = wrapHandlerInTemplateContext(handler)
      return super.addEventListener(element, eventName, handler)
   }
}
