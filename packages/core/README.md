# Angular Composition API

A lightweight (3kb) library for writing functional Angular applications.

## Quick Start

> ⚠ This library is experimental. It relies on private Angular APIs and compiler workarounds
> that may break in future versions. Use at your own risk.

Install with NPM

```bash
npm install @mmuscat/angular-composition-api
```

Install with Yarn

```bash
yarn add @mmuscat/angular-composition-api
```

### Known Issues

The Angular compiler only discovers `@Input` or `@Output` metadata on properties that can be statically resolved.
Unfortunately this doesn't work with mixins, causing template binding errors. A couple of workarounds are listed below.

<details>
    <summary>Trick the compiler</summary>

To work around this issue you can define a mixin that tricks the compiler into thinking it's a static call. In your
project, create a file with the following code:

```ts
import {decorate, State} from "@mmuscat/angular-composition-api";

export function State<T, U>(base: Type<T> & { create?: (base: T) => U }, _ = base = decorate(base)): State<T, U> {
    return base as any
}
```

Then use it in your application:

```ts
@Directive()
class Props {
    @Input()
    count = Value(0)

    @Output()
    countChange = Emitter<number>()

    @ContentChild(TemplateRef)
    content = Query<TemplateRef>()

    static create() {
        // etc...
    }
}

@Component()
export class MyComponent extends State(Props) {
}
```

While this works, it could potentially break if the underlying compiler implementation changes. Note that the mixin
functions needs to be concrete, it can't be imported from a compiled library or application (ie. imports from
declaration files won't work).
</details>

<details>
    <summary>Slightly safer option</summary>

Same as above, except `inputs` and `outputs` are added to the `@Component` or `@Directive` metadata instead. This
doesn't fix the mixin problem, but it might help if the language service gives you issues. You lose type inference on
inputs though, which will be cast to `any`.

```ts
class Props {
    count = Value(0)
    countChange = Emitter<number>()

    @ContentChild(TemplateRef)
    content = Query<TemplateRef>()

    static create() {
        // etc...
    }
}

@Component({
    inputs: ["count"],
    outputs: ["countChange"]
})
export class MyComponent extends State(Props) {
}
```

</details>

<details>
    <summary>IDE language service</summary>

If your IDE is complaining about types, either disable the inspection for input bindings (Jetbrains), or use the second
option above to suppress template errors.

VSCode should work fine with the latest updates.

</details>

## Example

### Application

View [Todo List](https://stackblitz.com/edit/angular-composition-api) on Stackblitz

### Component

```ts
// 1. Create props interface. 
@Directive()
class Props {
    @Input() count = Value(0) // Value<number> becomes `number`

    // 2. Create a factory function.
    static create({count}: Props) {
        const setCount = set(count)
        const increment = Emitter()
        const disabled = Value(false)
        // b. Emit values to trigger state updates.
        Subscribe(increment, () => {
            if (disabled.value) return
            setCount(count.value + 1)
        })
        // c. Return values are merged with props. 
        return {
            disabled, // `Value<boolean>` becomes `boolean`
            increment // `EventEmitter<number>` becomes `(value: number) => void`
        }
    }
}

// 3. Extend component class with State.
@Component({
    selector: "app-counter",
    template: `
        <p>{{ count }}</p>
        <button (click)="increment()">Increment</button>
    `
})
export class Counter extends State(Props) {
}
```

### Service

```ts
// 1. Create a factory function.
function loadTodosByUserId() {
    // a. Inject values from context
    const http = Inject(HttpClient)
    const emitter = Emitter()
    const value = Value()

    // b. Subscribe to values, cleanup is automatic.
    Subscribe(emitter, (userId) => {
        const source = http.get(`//example.com/api/v1/todo?userId=${userId}`)
        // Subscribe can be nested. It is cancelled each time a new value 
        // from the parent is received.
        Subscribe(source, set(value))
    })

    // c. Return values are public. Factories are *not* unwrapped.
    return [value, emitter]
}

// 2. Create an injectable service.
export const LoadTodosByUserId = Service(loadTodosByUserId, {
    providedIn: "root" // defaults to null
})

// 3. Inject service.
class Props {
    static create({userId}: Props) {
        const [todos, loadTodosByUserId] = Inject(LoadTodosByUserId)

        Subscribe(userId, loadTodosByUserId)

        return {
            todos
        }
    }
}

// 4. Provide local service if needed.
@Component({
    providers: [LoadTodosByUserId]
})
export class Todos extends State(Props) {
}

// 5. Override provider if needed

const CustomProvider = {
    provide: LoadTodosByUserId,
    useClass: Service(factory)
}
```

## Api Reference

### Core

#### State

Creates a context-aware class from the provided base class. Inputs, outputs, queries and other props are defined as
fields on the base class. The static `create` method takes the instance of the base class as an argument and returns a
state object that is merged with the base class. Reactive values created with `Value` are unwrapped. If returned from
the static `create` method, `Emitter` is unwrapped to a plain function. Emitters in the base class are not unwrapped.

**Change Detection**

Change detection occurs in the following scenarios (assuming `OnPush`
strategy):

- On first render.
- When inputs or reactive state changes (ie. props that implement `CheckSubject`).
- When an event binding emits (if zone.js is enabled).
- When `Subscribe` emits a value, after calling the observer.

Change detection might *not* occur if:

- Reactive state is mutated outside a reactive context. For example, if you manually create a component and mutate a
  value, you must call
  `detectChanges` to propagate the change.

Updates to reactive state are not immediately reflected in the view. If you need an immediate update, inject
the `ChangeDetectorRef` and call `detectChanges` after updating a value.

**Detached mode**

Components and directives that extend `State` and provide the
`DETACHED` token will have their `ChangeDetectorRef` detached from parent views.

#### Service

Creates a context-aware, tree-shakable service from the provided factory function. If the
`providedIn` option is set to null, or omitted, you must provide the service in a `NgModule`,
`Directive` or `Component`. Start or retrieve the service with `Inject`.

#### Inject

Equivalent to `Injector.get(ProviderToken)`. Throws `CallContextError` if called outside a `State`
or `Service` factory.

#### Subscribe

Registers an effect in the current context. If `Subscribe` is called inside a `State`, the subscription is deferred
until the view has mounted. If it is called inside a `Service` or nested in another `Subscribe`, the subscription is
invoked immediately after the containing function has executed. Throws `CallContextError` if called outside a `State`
or `Service` factory. Returns a subscription to that can be used to manually stop the effect, or void if passed an abort
signal.

**Reactive Observers**

When using `Subscribe` with a single function, it will track reactive dependencies and call the function recursively
when those dependencies emit a new value. For example, the following two snippets are functionally equivalent.

```ts
const firstName = Value("John")
const lastName = Value("Smith")

Subscribe(firstName, () => {
    console.log(
        `Full name: ${firstName.value} ${lastName.value}`
    )
})
```

```ts
const firstName = Value("John")
const lastName = Value("Smith")

Subscribe(() => {
    console.log(
        `Full name: ${get(firstName)} ${lastName.value}`
    )
})
```

In both of the examples the observer is only called when `firstName`
is updated. Dependencies are tracked based on calls to `get`. To read a `Value` without marking it as a dependency, use
the `value`
property accessor.

**Abort Signals**

By default, subscriptions returned by `Subscribe` are subscribed to the lifecycle of a
`State`, `Service` or `Subscribe` they were created in. You can override this behavior by supplying
an `UnsubscribeSignal` to `Subscribe`. This can either be a `Subscription` or an `AbortSignal`. In this mode, the
subscription is kept alive even if the context is destroyed, and teardown logic won't execute until the abort signal is
sent by calling `abort` on
`AbortController` or `unsubscribe` on `Subscription`.

For example, you can use `UnsubscribeSignal` to merge inner streams instead of switching between them (the default
behavior).

```ts
class Props {
    static create() {
        const ping = Inject(PingService)
        const untilDestroy = Subscribe() // cancels when view is destroyed
        const state = Value<State>()
      
        Subscribe(interval(1000), () => {
            Subscribe(ping.pong(), state, untilDestroy)
        })
      
        return {
            state
        }
    }
}

@Component()
export class Pinger extends State(Props) {}
```

In this example, a new inner stream is created every second and will not
be disposed even if it takes longer than 1 second to complete. If the
view is destroyed, then all remaining streams are unsubscribed.

---

### Common

These APIs only work inside the context of a `State` or `Service`. Calling them at the wrong time may cause
a `CallContextError` to be thrown.

#### Value

Creates a `BehaviorSubject`. Values are synced with the view during the `ngDoCheck` lifecycle hook.

#### Query

Creates a `Value` that will receive a `ContentChild` or `ViewChild`. Pass `true` for static queries. Pass `false` for
dynamic `ViewChild` queries.

```ts
@Directive()
class Props {
    @ContentChild(TemplateRef, {static: true})
    child = Query<TemplateRef<any>>(true)
    // or
    @ContentChild(TemplateRef)
    child = Query<TemplateRef<any>>()
    // or
    @ViewChild(TemplateRef)
    child = Query<TemplateRef<any>>(false)

    static create({child}: Props) {
        Subscribe(child, (value) => {
            if (value) {
                console.log(value)
            }
        })
    }
}
```

#### QueryList

Creates a `QueryListSubject` that will receive `ContentChildren` or `ViewChildren`. Subscribes to the underlying query
list when it becomes available. Pass `false` when used with `ViewChildren` so that it syncs correctly.

```ts
@Directive()
class Props {
    @ContentChildren(TemplateRef)
    children = QueryList<TemplateRef<any>>()
    // or
    @ViewChildren(TemplateRef)
    children = QueryList<TemplateRef<any>>(false)

    static create({children}: Props) {
        Subscribe(() => {
            for (const child of get(children)) {
                console.log(child)
            }
        })
    }
}
```

#### Emitter

Creates an `EventEmitter`.

#### Select

Creates a new `Value` from a reactive observer, `Observable` or `BehaviorSubject`, with an optional `selector`.

With `BehaviorSubject`

```ts
const state = Value({count: 0})
const count = Select(state, (val) => val.count)
```

With `Observable` and initial value

```ts
const store = Inject(Store)
const count = Select(store.select((val) => val.count), 0)
```

With reactive observer

```ts
const state = Value({count: 0})
const count = Select(() => get(state).count)
```

---

### Utils

#### get

Get the current value of a `Value`. If used inside a reactive observer, tracks the `Value` as a dependency.

#### set

Sets a `Value` or triggers an `Emitter`, otherwise returns a function that will emit values passed to it.

```ts
const count = Value(0),
    setCount = set(count)

setCount(10)
set(count, 10)
```
