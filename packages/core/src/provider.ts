import {Injectable, InjectFlags, ɵɵdirectiveInject as directiveInject} from "@angular/core";

export interface ValueToken<T extends {}> {
    new(): T
}

export class EmptyValueError extends Error {
    constructor(name: string) {
        super(`No value set for provider "${name}"`);
    }
}

let skipEmpty = false

export function Provide<T>(token: ValueToken<T>, value: T) {
    skipEmpty = true
    const provider = directiveInject<T>(token, InjectFlags.Self)
    skipEmpty = false
    Object.assign(provider, value)
}

export function ValueToken<T extends {}>(name: string): ValueToken<T>
export function ValueToken<T extends {}>(name: string, defaultValue: T): ValueToken<T>
export function ValueToken(name: string, defaultValue?: unknown) {
    @Injectable({ providedIn: "root" })
    class ValueProvider {
        static overriddenName = name
        constructor() {
            if (!skipEmpty) {
                if (defaultValue) {
                    return defaultValue as this
                }
                throw new EmptyValueError(name)
            }
        }
    }
    return ValueProvider
}
