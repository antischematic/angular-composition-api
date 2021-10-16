# Angular Composition API

Composition model for functional reactive Angular applications.

**Features**

-  Small bundle size (4kb min gzipped)
-  Minimal API
-  Granular change detection
-  Better-than `OnPush` performance
-  Optional Zone.js
-  Observable inputs and queries
-  Reactive two-way bindings
-  Composable components, directives and services
-  Composable providers
-  Composable subscriptions
-  Lifecycle hooks
-  Computed values
-  Automatic teardown
-  RxJS interop (v6 and v7)
-  Incrementally adoptable

**What it looks like**

```ts
function setup() {
   const service = inject(Service)
   const count = use(0)

   subscribe(count, () => {
      service.log(count.value)
   })

   return {
      count,
   }
}

@Component({
   inputs: ["count"],
})
export class MyComponent extends ViewDef(setup) {}
```

## Quick Start

[Install via NPM](https://www.npmjs.com/package/@mmuscat/angular-composition-api)

```bash
npm install @mmuscat/angular-composition-api
```

[Install via Yarn](https://yarnpkg.com/package/@mmuscat/angular-composition-api)

```bash
yarn add @mmuscat/angular-composition-api
```

For change detection to function correctly, you must provide `ZonelessEventManager`
in your root module. This is required whether zone.js is enabled or not.

```ts
@NgModule({
   providers: [
      {
         provide: EventManager,
         useClass: ZonelessEventManager,
      },
   ],
})
export class AppModule {}
```

## Api Reference

### Core

#### ViewDef

Creates a context-aware class from a setup function. Values returned from this function are merged with the base class.
`Value` types are unwrapped in the final class and template view, eg. `Value<number>` becomes `number`.

**Change Detection**

Change detection occurs in the following scenarios (assuming `OnPush` strategy):

-  On first render.
-  When inputs change.
-  When an event binding is executed.
-  When `subscribe` emits a value, after the observer is called.

Functions returned from the setup function will also trigger change detection if they called
from a template event binding.

Updates to reactive state are not immediately reflected in the view. If you need an immediate update, call `detectChanges` after updating a value.

Change detection might _not_ occur when:

-  Imperatively mutating fields on the component instance.
-  Imperatively calling state mutating methods on the component instance.
   Unless the mutated state has a `subscribe` observer, this will not trigger
   a change detection run.

For example, when manually creating a component:

```ts
const componentRef = componentFactoryResolver
   .resolveComponentFactory(MyComponent)
   .create()

componentRef.instance.count = 10 // not reactive
componentRef.instance.countChange(10) // not reactive

componentRef.changeDetectorRef.detectChanges() // now the view will be updated
```

To propagate these changes you will need to call `detectChanges`.

#### Service

Creates a context-aware, tree-shakable service from the provided setup function. If the
`providedIn` option is set to null, or omitted, you must provide the service in a `NgModule`,
`Directive` or `Component`. Start or retrieve the service with `inject`.

```ts
function setup(arg1, arg2, ...args) {
   const http = inject(HttpClient)
   return function (data) {
      return http.post(url, data)
   }
}

// without options
const BasicService = new Service(setup)

// all options
const ServiceWithOptions = new Service(setup, {
   providedIn: "root",
   name: "MyService", // descriptive name for error handling
   arguments: [arg1, arg2, ...args],
})
```

#### Provide

Allows `ViewDef` to declare and set `ValueToken` providers inside its setup function.

```ts
const Token = new ValueToken("TOKEN")

function parent() {
   provide(Token, { value: "hello" })
}

function child() {
   const token = inject(Token)
}
```

Example

```html
<parent>
   <child></child>
</parent>
```

Create a `ValueToken`. Value tokens can only have their value set in the same injector context they are provided in,
otherwise it throws `R3InjectorError`.

```ts
const Count = new ValueToken("COUNT", {
   // default factory is optional
   factory() {
      return 0
   },
})

function parent() {
   provide(Count, 10)
}

@Component({
   selector: "parent",
   providers: [Count.Provider], // important
})
export class Parent extends ViewDef(parent) {}
```

Inject the `ValueToken` from a child context. Throws `EmptyValueError` if no value has been set.

```ts
function child() {
   const count = inject(Count)
   return {
      count,
   }
}

@Component({ selector: "child" })
export class Child extends ViewDef(child) {}
```

#### Inject

Equivalent to `Injector.get(ProviderToken)`. Throws `CallContextError` if called outside a `ViewDef`
or `Service` factory.

#### Subscribe

Registers an effect in the current context. If `subscribe` is called inside a `ViewDef`, the subscription is deferred
until the view has mounted. If it is called inside a `Service` or nested in another `subscribe`, the subscription is
invoked immediately after the containing function has executed. Throws `CallContextError` if called outside a `ViewDef`
or `Service` factory. Returns a subscription to that can be used to manually stop the effect, or void if passed an abort
signal.

**Reactive Observers**

When using `subscribe` with a single function, it will track reactive dependencies and call the function recursively
when those dependencies emit a new value. For example, the following two snippets are functionally equivalent.

```ts
const firstName = use("John")
const lastName = use("Smith")

subscribe(firstName, () => {
   console.log(`Full name: ${firstName.value} ${lastName.value}`)
})
```

```ts
const firstName = use("John")
const lastName = use("Smith")

subscribe(() => {
   console.log(`Full name: ${firstName()} ${lastName.value}`)
})
```

In both of the examples the observer is only called when `firstName`
is updated. Dependencies are tracked based on calls to its getter function. To read a `Value` without marking it as a dependency, use
the `value` property accessor.

**Abort Signals**

By default, subscriptions returned by `subscribe` are subscribed to the lifecycle of a
`ViewDef`, `Service` or `subscribe` they were created in. You can override this behavior by supplying
an `UnsubscribeSignal` to `subscribe`. This can either be a `Subscription` or an `AbortSignal`. In this mode, the
subscription is kept alive even if the context is destroyed, and teardown logic won't execute until the abort signal is
sent by calling `abort` on `AbortController` or `unsubscribe` on `Subscription`.

For example, you can use `UnsubscribeSignal` to merge inner streams instead of switching between them (the default
behavior).

```ts
function pinger() {
   const ping = inject(PingService)
   const signal = subscribe() // cancels when view is destroyed
   const state = use<State>()

   subscribe(interval(1000), () => {
      subscribe(ping.pong(), state, signal)
   })

   return {
      state,
   }
}

@Component()
export class Pinger extends ViewDef(pinger) {}
```

In this example, a new inner stream is created every second and will not be disposed even if it takes longer than 1
second to complete. If the view is destroyed, then all remaining streams are unsubscribed.

### Use API

#### Value

Creates a `Value`. Values are synced with the view during the `ngDoCheck` lifecycle hook.

```ts
const num = use(0)
const arr = use([])

// get value
num()
num.value

// set value
num(10)

// mutate value
arr((val) => val.push(10))

// observe value
subscribe(num, observer)
```

#### Emitter

Creates an `Emitter` from a `Function` or `Value`.

```ts
const increment = use<void>(Function)
const add = use<number>(Function)
const sum = use((num1, num2, num3) => num1 + num2 + num3)

subscribe(sum, observer)

countChange(count() + 1)
increment()
add(1)
sum(1, 2, 3)
```

When a `Value` is passed, calling the `Emitter` will also update the value. Updating the value directly however will
not trigger the emitter. This is useful for creating two-way bindings.

```ts
const count = use(0)
const countChange = use(count)

countChange(count() + 1)
count.value // 1

count(10) // will not trigger countChange
```

Two-way binding example

```ts
function counter() {
   const count = use(0)
   const countChange = use(count)

   subscribe(interval(1000), () => {
      countChange(count() + 1)
   })

   return {
      count,
      countChange,
   }
}

@Component({
   inputs: ["count"],
   outputs: ["countChange"],
})
export class Counter extends ViewDef(counter) {}
```

#### Query

Creates a `ReadonlyValue` that will receive a `ContentChild` or `ViewChild`. Queries are checked during the
`ngAfterContentChecked` or `ngAfterViewChecked` lifecycle hook.

```ts
function setup() {
   const contentChild = use<TemplateRef<any>>(ContentChild)
   const viewChild = use<TemplateRef<any>>(ViewChild)

   subscribe(viewChild, (value) => {
      if (value) {
         console.log(value)
      }
   })

   return {
      contentChild,
      viewChild,
   }
}

@Component({
   queries: {
      contentChild: new ContentChild(TemplateRef),
      viewChild: new ViewChild(TemplateRef),
   },
})
export class MyComponent extends ViewDef(setup) {}
```

#### QueryList

Creates a `ReadonlyValue` that will receive a `QueryList` of `ContentChildren` or `ViewChildren`. Subscribes to the underlying query
list when it becomes available. QueryLists are checked during the `ngAfterContentChecked` or `ngAfterViewChecked` lifecycle hook.

```ts
function setup() {
   const contentChildren = use<TemplateRef<any>>(ContentChildren)
   const viewChildren = use<TemplateRef<any>>(ViewChildren)

   subscribe(() => {
      for (const child of contentChildren()) {
         console.log(child)
      }
   })

   return {
      contentChildren,
      viewChildren,
   }
}

@Component({
   queries: {
      contentChildren: new ContentChildren(TemplateRef),
      viewChildren: new ViewChildren(TemplateRef),
   },
})
export class MyComponent extends ViewDef(setup) {}
```

### Utilities

#### Select

Selects a new `Value` or `AccessorValue`.

Examples:

Select `Value` with reactive observer

```ts
const state = use({ count: 0 })
const count = select(() => state().count)
```

Select a new `AccessorValue` with separate read and write streams.

-  `next` can be a `Function` or a `Subject`
-  `value` can be a `Value`, `AccessorValue`, `BehaviorSubject` or a
   reactive observer.

```ts
const count = use(0)
const countChange = use(count)

const value = select({
   next: () => countChange(count() + 1),
   value: () => count() - 1,
})

// write value
value.next()
// read value
value()
value.value
```

#### BeforeUpdate

Returns an `Emitter` that will emit whenever the view is about to update. Accepts an optional callback argument.

```ts
function setup() {
   const beforeUpdate = onBeforeUpdate()

   subscribe(beforeUpdate, () => {
      // when the view is about to update
   })

   // or

   onBeforeUpdate(() => {
      // when the view is about to update
   })
}
```

#### Updated

Returns an `Emitter` that will emit after the view has updated. Accepts an optional callback argument.

```ts
function setup() {
   const updated = onUpdated()

   subscribe(updated, () => {
      // after the view has updated
   })

   // or

   onUpdated(() => {
      // after the view has updated
   })
}
```

#### OnDestroy

Returns an `Emitter` that will emit after the view is destroyed. Accepts an optional callback argument.

```ts
function setup() {
   onDestroy(() => {
      // when the view is destroyed
   })
}
```
