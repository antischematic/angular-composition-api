import {InjectFlags, ɵɵdirectiveInject as directiveInject} from "@angular/core";

const providers = new WeakMap()

function getProvider(token: {}) {
    return providers.get(token)
}

function setProvider<T>(token: {}, value: T) {
    return providers.set(token, value)
}

interface ValueProvider<T extends {}> {
    new(): T
    Value(value: T): void
}

export class EmptyValueError extends Error {
    constructor(name: string) {
        super(`No value set for provider "${name}"`);
    }
}

export function Provider<T extends {}>(name: string): ValueProvider<T>
export function Provider<T extends {}>(name: string, defaultValue: T): ValueProvider<T>
export function Provider(name: string, defaultValue?: unknown) {
    let skipEmpty = false
    class ValueProvider {
        static overriddenName = name
        static Value(value: unknown) {
            skipEmpty = true
            const provider = directiveInject(ValueProvider, InjectFlags.Self)
            skipEmpty = false
            Object.assign(provider, value)
        }
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
