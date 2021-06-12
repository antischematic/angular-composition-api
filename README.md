# Angular Composition API

A lightweight (3kb) library for writing functional Angular applications.

## Quick Start

> ⚠ This library is experimental. It relies on private Angular APIs and compiler workarounds
>  that may break in future versions. Use at your own risk.

Install with NPM
```bash
npm install @mmuscat/angular-composition-api
```
Install with Yarn
```bash
yarn add @mmuscat/angular-composition-api
```

## Example

### Application

View [Todo List](https://stackblitz.com/edit/angular-composition-api) on Stackblitz

### Component

```ts
// 1. Create props interface. 
// Add inputs, outputs and queries here.
// Value, Query and QueryList are unwrapped in the template
@Directive()
class Props {
    @Input() count = Value(0) // becomes `number`
}

// 2. Create a state function.
function State({ count }: Props) {
    const increment = Emitter()
    // a. Subscribe to observables, cleanup is handled automatically.
    Subscribe(count, (value) => {
        console.log(`Count changed: ${value}`)
    })
    // b. Emit values to trigger state updates.
    Subscribe(increment, (amount) => {
        set(count, get(count) + amount)
    })
    // c. Return values are merged with props. 
    // Values are automatically subscribed and unwrapped in the template.
    // Emitters are converted into plain functions.
    return {
        count, // `Value<number>` becomes `number`
        increment // `EventEmitter<number>` becomes `(value: number) => void`
    }
}

// 3. Extend component class with View mixin.
// Props are optional.
@Component({
    selector: "app-counter",
    template: `
        <p>{{ count }}</p>
        <button (click)="increment(1)">Increment</button>
    `
})
export class Counter extends View(Props, State) {}
```

###  Service

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

// 3. Inject in view.
function State({ userId }: Props) {
    const [todos, loadTodosByUserId] = Inject(LoadTodosByUserId)

    Subscribe(userId, loadTodosByUserId)

    return {
        todos
    }
}

// 4. Provide local service if needed.

@Component({
    providers: [LoadTodosByUserId]
})
export class Todos extends View(State, Props) {}

// 5. Override provider if needed

const CustomProvider = {
    provide: LoadTodosByUserId,
    useClass: Service(factory)
}
```

## Api Reference

### Core

#### View

Creates a context-aware view class based on the provided Props and State. Props are optional.
Components and directives that extend this class have their `ChangeDetectorRef` detached and will
only trigger view updates when the returned observable state emits a new value.

#### Service

Creates a context-aware, tree-shakable service class from the provided factory function. If the
`providedIn` option is set to null, or omitted, you must provide the service in a `NgModule`,
`Directive` or `Component`. Start or retrieve the service with `Inject`.

#### Inject

Equivalent to `Injector.get(ProviderToken)`. Only works inside the context of a `View` or `Service`.
Throws if called outside a valid context.

#### Subscribe

Registers an effect in the current context. If `Subscribe` is called inside a `View` constructor,
the subscription is deferred until the view has mounted. If it is called inside a `Service` or
nested in another `Subscribe`, the subscription is invoked immediately after the containing
function has executed.

---

### Common

These APIs only work inside the context of a `View` or `Service`. Calling them at the wrong time
may cause a `CallContextError` to be thrown.

#### Value

Alias for `BehaviorSubject`. Optionally mirrors an upstream `BehaviorSubject` or `Value` if provided.

#### Query

Creates a `Value` that is checked during the `ngAfterContentChecked` lifecycle hook by default.

#### QueryList

Creates a `QueryListSubject` that can be accessed immediately. It waits for the underlying query list to become available,
then subscribes to its changes. The value is checked during the `ngAfterContentChecked`
lifecycle hook by default.

#### HostListener

Works like the `HostListener` decorator, returns an `Emitter` if an observer wasn't provided,
otherwise it will `Subscribe` to the observer and return the subscription.

#### HostBinding

Works like the `HostBinding` decorator, it will `Subscribe` to an `Observable` and
use the `Renderer` to apply changes to the property, attribute, class or style that was selected.

---

### Utils

#### Emitter

Alias for `EventEmitter`

#### get

Convenience method for getting the current value of a `Value`.

#### set

Immediately emit a value to a `Value` or `Emitter`, or return a curried function that emits the
value passed to it.

## Contributing

1. Clone this repository

2. Run `yarn` inside the project root.

3. Use `ng build` to build the library

4. Check that it works in the example application with `ng serve`