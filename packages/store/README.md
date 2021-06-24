# Angular Actions

A delightfully concise (1kb) redux store for Angular applications.

## Quick Start

Install via NPM

```bash
npm install @mmuscat/angular-actions
```

Install via Yarn

```bash
yarn add @mmuscat/angular-actions
```

### Create a store

Define some actions

```ts
const Increment = Action("Increment")
const actions = [CreateTodo]
```

Define the action union type for your reducer

```
type Actions = ActionUnion<typeof actions>
```

Create the reducer

```ts
function reducer(state: number, action: Actions) {
    switch (action.kind) {
        case Increment.kind: {
            return state + 1
        }
    }
    return state
}
```

Configure a store in your directive, component or service.

```ts
function create() {
    const state = Value(0)
    const store = Store(reducer, state, actions)

    Subscribe(state, (value) => {
        console.log("state changed!", value)
    })

    function increment() {
        action.Increment()
    }

    return {
        state,
        increment
    }
}
```

### Use effects

Define some actions

```ts
const AddTodo = Action("AddTodo", props<Todo>())
const AddTodoDone = Action("AddTodoDone", props<Todo>())
const AddTodoError = Action("AddTodoError", props<any>())

const actions = [AddTodo, AddTodoDone, AddTodoError]
```

Create some effects

```ts
const addTodo = Effect(AddTodo, (state: StateRef<Todo[]>) => {
    const http = Inject(HttpClient)
    
    return mergeMap((todo) => {
        http.post(`//example.com/api/v1/todo`, todo).pipe(
            action(AddTodoDone, AddTodoError)        
        )
    })
})

const effects = [addTodo]
```

Use effects with a store

```ts
function reducer(state: Todo[], action: Actions) {
    switch(action.kind) {
        case AddTodoDone.kind: {
            return state.concat(action.data)
        }
    }
    return state
}

function create() {
    const initialState = Value<Todo>([])
    const store = Store(reducer, initialState, actions)
    
    UseEffects(store, effects)
    
    return store
}

```

## API Reference

### Action

Creates an action factory of a `kind`, with or without data.

```ts
const Reload = Action("Reload")
const SaveTodo = Action("SaveTodo", props<Todo>())
```

### Effect

Creates an effect factory. Effects can return an `OperatorFunction` or an `Observable` of actions to
be dispatched to `Store`. Receives the store's `Value` as an argument.

With `Observable`

```ts
const effect = Effect((state: ValueSubject<any>) => {
    return of(Increment())
})
```

With `OperatorFunction`

```ts
const effect = Effect((state: ValueSubject<any>) => {
    return mergeMap((action: Action) =>
        of(Increment())
    )
})
```

With action filter

```ts

const effect = Effect(Increment, (state: ValueSubject<any>) => {
    return mergeMap((action) =>
        of(Multiply(action.data))
    )
})
```

**Dependency Injection**

Use `Inject` from [Angular Composition API](https://github.com/mmuscat/angular-composition-api/tree/master/packages/core#Inject) to get dependencies inside your effects.

```ts
import {Inject} from "@mmuscat/angular-composition";

const effect = Effect((state: ValueSubject<any>) => {
    const http = Inject(HttpClient)
    return http.get("//example.com/api/v1/todos").pipe(
        action(TodosLoaded)
    )
})
```

If using effects without Angular Composition API, get dependencies with `inject`
instead.

```ts
import {inject} from "@angular/core";

const effect = Effect((state: ValueSubject<any>) => {
    const http = inject(HttpClient)
    return http.get("//example.com/api/v1/todos").pipe(
        action(TodosLoaded)
    )
})
```

### Store

Takes a `reducer`, a `value` and an `actions` array. Returns a store
that emits actions dispatched to it *after* the state has been updated. Actions are also mapped to an `action` key as bound
functions that will emit actions of its kind when invoked.

```ts
const Increment = Action("Increment")
const actions = [Increment]
function reducer(state: number, action) {
    return state
}
const state = Value(0)
const store = Store(reducer, state, actions)
```

Dispatch an action

```ts
store.next(Increment())
```

or

```ts
store.action.Increment()
```

### UseEffects

Run an array of `effects` against actions emitted by a `Store`.

```ts
UseEffects(store, effects)
```

Effects can also be used without [Angular Composition API](https://github.com/mmuscat/angular-composition-api/tree/master/packages/core)
by calling `useEffects` instead. Note the additional `injector` argument. You must dispose the
returned subscription to stop running effects.

```ts
const subscription = useEffects(store, effects, injector)
```

### kindOf

An `OperatorFunction` that filters a stream of `Action` to the
actions listed in its arguments.

```ts
const increment = store.pipe(
    kindOf(Increment)
)
```

### action

An `OperatorFunction` that maps a stream of data to the given `action`,
optionally catching and mapping errors to the provided `errorAction`.

```ts
import {throwError} from "rxjs";

const Increment = Action("Increment", props<number>())
const IncrementTooHigh = Action("IncrementTooHigh")

of(10, 20, 30).pipe(
    switchMap((data) => data > 15 ? throwError() : of(data)),
    action(Increment, IncrementTooHigh),
).subscribe(store)
```

### props

Returns a typed function for producing `data` on an `Action`.

```ts
const Increment = Action("Increment", props<number>())
```

Which is equivalent to

```ts
const Increment = Action("Increment", (value: number) => value)
```

