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
@Directive()
class Props {
    @Input() count = 0
    @Output() countChange = Emitter<number>()
}

// 2. Create a state function.
function State(props: Props) {
    // a. Use `DoCheck` hook to check inputs have changed.
    // Optional observer will emit when `count.next()` is called
    const count = DoCheck(() => props.count, props.countChange)
    const increment = Emitter() // Alias for `new EventEmitter()`
    // b. Subscribe to observables, cleanup is handled automatically.
    Subscribe(count, (value) => {
        console.log(`Count changed: ${value}`)
    })
    // c. Emit values to trigger state updates.
    Subscribe(increment, (amount) => {
        set(count, count.value + amount)
    })
    // d. Return values are public. 
    // Observables are automatically subscribed and unwrapped in the template.
    // Emitters are converted into plain functions.
    return {
        count, // `BehaviorSubject<number>` becomes `number`
        increment // `EventEmitter<number>` becomes `(value: number) => void`
    }
}

// 3. Extend component class with View mixin.
// Props are optional.
@Component({
    selector: "app-counter",
    template: `
        <p>{{ count }}</p>
        <button (click)="increment(1)>Increment</button>
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

// 2. Create an injection token.
export const LoadTodosByUserId = Factory("LoadTodosByUserId", loadTodosByUserId)

// 3. Use in component
function State(props: Props) {
    const userId = DoCheck(() => props.userId)
    const [todos, loadTodosByUserId] = Inject(LoadTodosByUserId)

    Subscribe(userId, loadTodosByUserId)

    return {
        todos
    }
}

// 4. Override provider

function overrideLoadTodosById() {
    const http = Inject(HttpClient)
    // Implementation
}

const PROVIDER = {
    provide: LoadTodosByUserId,
    useFactory: Factory(overrideLoadTodosById)
}
```

## Api Reference

### Core

#### Factory

Creates a context-aware factory function, or `InjectionToken` if a name argument is passed.
This token is provided in the root scope.

#### View

Creates a context-aware view class based on the provided Props and State. Props are optional.
Components and directives that extend this class have their `ChangeDetectorRef` detached and will
only trigger view updates when the returned observable state emits a new value.

---

### Common

These APIs only work inside the context of a `View` or `Factory`. Calling them at the wrong time
will cause an "out of context" error to be thrown.

#### Inject

Equivalent to `Injector.get(ProviderToken)`. Only works inside the context of a `View` or `Factory`.
Throws if called outside a valid context.

#### Subscribe

Registers an effect in the current context. If `Subscribe` is called inside a `View` constructor,
the subscription is deferred until the view has mounted. If it is called inside a `Factory` or
nested in another `Subscribe`, the subscription is invoked immediately after the containing
function has executed.

#### DoCheck

Creates a `CheckSubject` that calls the provided `getter` during the `ngDoCheck` lifecycle hook
and emits this value if it has changed since it was last checked. The optional observer argument
only receives values that were emitted by calling `next` and ignores values that are emitted by
the getter. The getter function should be kept simple to prevent performance issues.

#### ContentCheck

Creates a `CheckSubject` that calls the provided `getter` during the `ngAfterContentChecked` lifecycle hook
and emits this value if it has changed since it was last checked. The optional observer argument
only receives values that were emitted by calling `next` and ignores values that are emitted by
the getter. The getter function should be kept simple to prevent performance issues.

#### ContentQuery

Creates a `Value` that receives a `QueryList`. It waits for  the query list to become available,
then subscribes to its changes. The getter function is checked during the `ngAfterContentChecked`
lifecycle hook.

#### ViewCheck

Creates a `CheckSubject` that calls the provided `getter` during the `ngAfterViewChecked` lifecycle hook
and emits this value if it has changed since it was last checked. The optional observer argument
only receives values that were emitted by calling `next` and ignores values that are emitted by
the getter. The getter function should be kept simple to prevent performance issues.

#### ViewQuery

Creates a `Value` that receives a `QueryList`. It waits for  the query list to become available,
then subscribes to its changes. The getter function is checked during the `ngAfterViewChecked`
lifecycle hook.

#### HostListener

Works like the `HostListener` decorator, returns an `Emitter` if an observer wasn't provided,
otherwise it will `Subscribe` to the observer and return the subscription.

#### HostBinding

Works like the `HostBinding` decorator, it will `Subscribe` to an `Observable` and
use the `Renderer` to apply changes to the property, attribute, class or style that was selected.

---

### Utils

#### Value

Alias for `BehaviorSubject`

#### Emitter

Alias for `EventEmitter`

#### get

Convenience method for getting the current value of a `Value`.

#### set

Immediately emit a value to a `Value` or `Emitter`, or return a curried function that emits the
value passed to it.

#### emit

Returns a function that will emit `void` to the given `Value` or `Emitter` when called.
