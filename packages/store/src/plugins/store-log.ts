import {StoreLike} from "../interfaces";
import {subscribe} from "@mmuscat/angular-composition-api";
import {pairwise, zip} from "rxjs";

function getTimestamp() {
   const now = new Date()
   const hours = now.getHours()
   const minutes = now.getMinutes()
   const seconds = now.getSeconds()
   const milliseconds = now.getMilliseconds()
   return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

export function StoreLog(store: StoreLike) {
   const log = zip(store.event, store.state.pipe(
      pairwise()
   ))
   subscribe(log, ([event, [previous, current]]) => {
      console.groupCollapsed(`event @`, getTimestamp(), event.name)
      console.log("%cprevious", "color: #9E9E9E", previous)
      console.log("%cevent", event.kind === "E" ? "color: #F20404" : "color: #03A9F4", event)
      console.log("%cnext", "color: #4CAF50", current)
      console.groupEnd()
   })
}
