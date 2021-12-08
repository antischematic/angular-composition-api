import { Emitter, ValueToken } from "@mmuscat/angular-composition-api"

function defaultAction<T>(action: Emitter<T>): Emitter<T> {
   return action
}

export function action<T>(): (action: Emitter<T>) => Emitter<T> {
   return defaultAction
}

export function getTokenName(token: ValueToken<any>) {
   return token.toString().replace(/^InjectionToken /, "")
}
