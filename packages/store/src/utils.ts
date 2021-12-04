import {Emitter} from "@mmuscat/angular-composition-api";

function defaultAction<T>(action: Emitter<T>): Emitter<T> {
   return action
}

export function action<T>(): (action: Emitter<T>) => Emitter<T> {
   return defaultAction
}
