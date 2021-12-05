import {Emitter, ValueToken, use} from "@mmuscat/angular-composition-api";
import {StoreEvent} from "./interfaces";

function defaultAction<T>(action: Emitter<T>): Emitter<T> {
   return action
}

export function action<T>(): (action: Emitter<T>) => Emitter<T> {
   return defaultAction
}

export function getTokenName(token: ValueToken<any>) {
   return token.toString().replace(/^InjectionToken /, "")
}

export const Events = new ValueToken("Events", {
   factory() {
      return use<StoreEvent>(Function)
   }
})
