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

## Example

### Application

State [Todo List](https://stackblitz.com/edit/angular-composition-api) on Stackblitz

### Component

```ts
// 1. Create props interface. 
@Directive()
class Props {
    @Input() count = Value(0) // Value<number> becomes `number`

    // 2. Create a factory function.
    static create({ count }: Props) {
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
export class Counter extends State(Props) {}
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
export class Todos extends State(Props) {}

// 5. Override provider if needed

const CustomProvider = {
    provide: LoadTodosByUserId,
    useClass: Service(factory)
}
```

## Api Reference

### Core

#### State

Creates a context-aware state from the provided state factory. Components and directives that extend this class have
their `ChangeDetectorRef` detached and will only trigger view updates when reactive state emits a new value.

#### Service

Creates a context-aware, tree-shakable service from the provided factory function. If the
`providedIn` option is set to null, or omitted, you must provide the service in a `NgModule`,
`Directive` or `Component`. Start or retrieve the service with `Inject`.

#### Inject

Equivalent to `Injector.get(ProviderToken)`. Only works inside the context of a `State` or `Service`. Throws if called
outside a valid context.

#### Subscribe

Registers an effect in the current context. If `Subscribe` is called inside a `State`, the subscription is deferred
until the view has mounted. If it is called inside a `Service` or nested in another `Subscribe`, the subscription is
invoked immediately after the containing function has executed.

If called outside a valid context, creates a subscription which needs to be handled manually.

---

### Common

These APIs only work inside the context of a `State` or `Service`. Calling them at the wrong time may cause
a `CallContextError` to be thrown.

#### Value

Creates a `BehaviorSubject`. Optionally mirror an upstream `BehaviorSubject` if provided. Values are synced with the
view during the `ngDoCheck` lifecycle hook.

#### Query

Creates a `Value` that will receive a `ContentChild` or `StateChild`. Pass `false` when used with dynamic `StateChild` so
that it syncs correctly. Pass `true` for static queries.

#### QueryList

Creates a `QueryListSubject` that will receive `ContentChildren` or `StateChildren`. Subscribes to the underlying query
list when it becomes available. Pass `false` when used with `StateChildren` so that it syncs correctly.

#### Emitter

Creates an `EventEmitter`.

#### HostListener

Works like the `HostListener` decorator, returns an `Emitter` if an observer wasn't provided, otherwise it
will `Subscribe` to the observer and return the subscription.

#### HostBinding

Works like the `HostBinding` decorator, it will `Subscribe` to an `Observable` and use the `Renderer` to apply changes
to the property, attribute, class or style that was selected.

---

### Utils

#### get

Get the current value of a `Value`.

#### set

Sets a `Value` or triggers an `Emitter`, otherwise returns a function that will emit values passed to it.
