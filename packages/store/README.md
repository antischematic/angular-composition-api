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
    const { state, action } = Store(reducer, Value(0), actions)

    action.Increment()
    
    Subscribe(state, (value) => {
        console.log("state changed!", value)
    })
    
    return {
        state,
        ...action,
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

Takes a `reducer`, `initialValue` and `actions` array. Returns a store
with reactive `state`. Actions are mapped to `action` keys as bound
functions that will emit actions of that type when invoked. The
returned store is an observable of actions that have been broadcast,
*after* the state has updated.

### UseEffects

Run an array of `effects` against actions emitted by a `Store`.

```ts
UseEffects(store, effects)
```

Effects can also be used without [Angular Composition API](https://github.com/mmuscat/angular-composition-api/tree/master/packages/core)
by calling `useEffect` instead. Note the additional `injector` argument. You must dispose the
returned subscription to stop running effects.

```
const subscription = useEffects(store, effects, injector)
```

### kindOf

An `OperatorFunction` that filters a stream of `Action` to the
actions listed in its arguments.

### action

An `OperatorFunction` that maps a stream of data to the given `action`,
optionally catching and mapping errors to the provided `errorAction`. 