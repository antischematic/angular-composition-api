---
sidebar_position: 6
---

# Subscriptions

RxJS `Observable` is the fundamental reactive primitive in Angular. This makes it easy to compose reactive data streams
that perform complex async tasks, but presents some hurdles when consuming them in a component. Some common problems
are:

-  Subscribing too early or too late
-  Subscribing to cold observables multiple times unintentionally
-  Accessing the current value of an observable stream
-  Subscription management
-  Error recovery

The usual solution to these problems is to use a `BehaviorSubject` or `ReplaySubject`. Orchestrating a chain of
observables and subjects however is quite involved when interacting with component inputs, lifecycles, change
detection and templates.

Angular composition API abstracts these problems away by introducing a consistent pattern for creating, observing and
updating reactive state, using smart subscriptions.

## Subscribe

The `subscribe` method is the entry point for observing reactive state with Angular Composition API. This method takes
and observable stream and subscribes to its values. These values are passed to an observer, where reactive state can
be mutated before change detection runs. If the observer returns `TeardownLogic`, this will be executed the next time
the observer receives a value, or when the subscription ends.

```ts title="Example: Log the value of count whenever it changes"
import { Component } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)

   subscribe(count, console.log)

   return {
      count,
   }
}

@Component({
   inputs: ["count"],
})
export class MyComponent extends ViewDef(setup) {}
```

```ts title="Example: RxJS interop with partial observer"
import { Component } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"
import { interval } from "rxjs"
import { switchMap } from "rxjs/operators"

function setup() {
   const http = inject(HttpClient)
   const result = use<{ data: any }>()
   const pollData = interval(10000).pipe(
      switchMap(() => http.get("http://www.example.com/api/data")),
   )

   subscribe(pollData, {
      next: result,
      error(error) {
         console.error(error)
      },
   })

   return {
      result,
   }
}

export class MyComponent extends ViewDef(setup) {}
```

## Initial Observer

Alternatively `subscribe` can be called with a single function argument. This will be executed once when the component
is mounted. This is useful for safely mounting third-party DOM libraries. Cleanup can be performed by returning
`TeardownLogic` from the observer, which will run when the component is destroyed.

```ts title="Example: Initial observer"
import { Component, ElementRef } from "@angular/core"
import { subscribe, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const { nativeElement } = inject(ElementRef)
   subscribe(() => {
      const ref = thirdPartyDOMLibrary(nativeElement)
      return () => ref.destroy()
   })
   return {}
}

@Component()
export class MyComponent extends ViewDef(setup) {}
```

:::info

If used in a `Service` the initial observer is called once immediately after the service is instantiated.

:::

## Reactive Observer

When an initial observer has data dependencies, it becomes a reactive observer. A reactive observer shares the same
lifecycle as an initial observer, but is also called recursively whenever one of its data dependencies change. A data
dependency is created whenever the getter function of a `Value` is called within a reactive
observer's call context.

```ts title="Example: Reactive observer with value dependency"
import { Component, ContentChildren } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"
import { Child } from "./child.component"

function setup() {
   const children = use<Child>(ContentChildren)

   subscribe(() => {
      for (const child of children()) {
         console.log(child)
      }
   })

   return {
      children,
   }
}

@Component({
   queries: {
      children: new ContentChildren(Child),
   },
})
export class Parent extends ViewDef(setup) {}
```

In the above example the `children` value is marked as a data dependency of the reactive observer. Whenever the value
of `children` changes, the observer function will be called again.

:::info

To get a better understanding, another application of reactive observers comes from the `select` utility function.

```ts
import { Component } from "@angular/core"
import { select, use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)
   const doubled = select(() => count() * 2)

   return {
      count,
      doubled,
   }
}

@Component({
   inputs: ["count"],
})
export class MyComponent extends ViewDef(setup) {}
```

The value of `doubled` is derived from `count` using a reactive observer. Keep in mind that only `Value` can be used
in this way. RxJS observables can be converted to a `Value` with the `use` function.

:::

:::tip

To prevent a `Value` being marked as a dependency, access its value with the `value` property accessor instead.

:::

## Error Handling

The `subscribe` method catches and notifies of uncaught errors. All uncaught errors are piped to the `ErrorHandler`
service. To prevent this, ensure that all error-able streams have an error observer, or are handled upstream.

## Composition

The execution context of components, directives and services also extends to subscriptions.

:::important

Every observer called by `subscribe` runs in its own execution context!

:::

This means that it's possible to nest calls to `subscribe` inside one another.

```ts
import { HttpClient } from "@angular/common/http"
import { Compnonent } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const http = inject(HttpClient)
   const userId = use()
   const result = use()

   subscribe(userId, (id) => {
      if (id) {
         const loadUser = http.post("http://www.example.com/api/data", { id })
         subscribe(loadUser, {
            next: result,
            error(error) {
               console.error(error)
            },
         })
      }
   })

   return {
      userId,
      result,
   }
}

@Component()
export class MyComponent extends ViewDef(setup) {}
```

When `userId` emits a new value, a new subscription `loadUser` is created, automatically cancelling the previous
subscription. It is like a more ergonomic version of `switchMap`.

## Abort Signals

By default, the lifecycle of a subscription is controlled by its context, for example, subscriptions in a component
context are cleaned up when the component is destroyed. This behavior can be overridden by passing an abort signal as
a third argument to `subscribe`. The abort signal can be an `AbortSignal` from `AbortController` or another
`Subscription`.

This is useful when we don't want the default `switchMap` behavior of composed subscriptions.

```ts title="Example: Merge inner subscriptions"
import { Compnonent } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const ping = inject(PingService)
   const signal = subscribe() // cancels when view is destroyed
   const responseTime = use<number>()

   subscribe(interval(1000), () => {
      subscribe(ping.pong(), responseTime, signal)
   })

   return {
      responseTime,
   }
}

@Component()
export class Pinger extends ViewDef(setup) {}
```

:::caution

Automatic cleanup of subscriptions can be disabled entirely by passing `null` to the abort signal argument, but this
can cause memory leaks. Use with care.

:::
