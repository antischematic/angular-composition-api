---
sidebar_position: 4
---

# Types

This section covers the various value types that can be created from `use` and `select`.

## Value

The `Value` type is a reactive primitive that powers reactive APIs in this package.

```ts title="Example: Creating a value"
import { use } from "@mmuscat/angular-composition-api"

const value = use(0)
```

It is similar to a
`BehaviorSubject` in that it:

-  Takes an initial value
-  Emits the current value when it is subscribed to
-  Can imperatively inspect the current value through its `value` property accessor
-  Can imperatively set a new value by calling `next`

In addition to this, a `Value` can:

-  Access its value by invoking it with zero arguments
-  Set its value by invoking it with one argument
-  Be marked as a dependency by reactive observers (see [Subscriptions](subscriptions.md#reactive-observer))
-  Unwrapped by `ViewDef` to a reactive value on the class instance (see [Views](views.md))

Where it differs:

-  The `Value` type does not implement error or complete observers
-  The `Value` type is an interop observable that inherits from `Function`

Since `Value` does not extend the `Observable` prototype, `instanceof` checks will fail. Should you require this, cast
`Value` to an `Observable` first using `pipe` or `from`.

## Deferred Value

A deferred `Value` has an initial state of `undefined`, and does not start emitting values until its initial value has
been set. Afterwards it behaves like a normal `Value`. This behavior is similar to `ReplaySubject`. Deferred values are
created from `Observable` objects.

```ts title="Example: Create a deferred value"
import { use } from "@mmuscat/angular-composition-api"
import { of } from "rxjs"

const deferredValue = use(of(10))
```

## Computed Value

A computed `Value` is derived from other `Value` objects using a reactive observer.

```ts title="Example: Create a computed value"
import { select, use } from "@mmuscat/angular-composition-api"

const count = use(0)
const doubled = select(() => count() * 2)
```

## Accessor Value

An `AccessorValue` is a `Value` with separate types for reading and writing values.

```ts title="Example: Creating an accessor value"
import { select, use } from "@mmuscat/angular-composition-api"

const value = use(0)
const accessorValue = select({
   next(nextValue: string) {
      value.next(parseFloat(nextValue))
   },
   value,
})
```

## Emitter

An `Emitter` is a functional wrapper around `EventEmitter`. Unlike `Value` it is not unwrapped by `ViewDef`, does not
hold state and cannot be marked as a dependency in reactive observers. It is ideal for `outputs` and signals to trigger
other state changes.

```ts title="Example: Create a void emitter"
import { use } from "@mmuscat/angular-composition-api"

const voidEmitter = use<void>(Function)

voidEmitter() // emit
```

```ts title="Example: Create emitter with single argument"
import { use } from "@mmuscat/angular-composition-api"

const basicEmitter = use<number>(Function)

basicEmitter(10) // emit
```

```ts title="Example: Create emitter with multiple arguments"
import { use } from "@mmuscat/angular-composition-api"

const emitterWithParams = use((...args: number[]) =>
   args.reduce((a, b) => a + b, 0),
)

emitterWithParams(1, 2, 3) // emit
```
