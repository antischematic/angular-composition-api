# Angular Actions

A tiny (1kb) state management library for Angular Composition API.

## Quick Start

[Install via NPM](https://www.npmjs.com/package/@mmuscat/angular-actions)

```bash
npm install @mmuscat/angular-actions
```

[Install via Yarn](https://yarnpkg.com/package/@mmuscat/angular-actions)

```bash
yarn add @mmuscat/angular-actions
```

### Create a store

Define initial state factory. Supports dependency injection.

```ts
export function getInitialState() {
   return {
      count: 0,
   }
}
```

#### Actions

Create actions, with or without props.

```ts
const Increment = new Action("Increment")
const IncrementBy = new Action("Increment", props<{ by: number }>())
```

#### Reducers

Create reducers. Reducers take a list of action reducers for producing the next state.

```ts
const Count = new Reducer<number>("count").add(
   Increment,
   (state, action) => state + 1,
)
```

#### Effects

Create effects. Effects are factory functions that should return an `Observable`. Supports
dependency injection. Effects will receive the store injector as an argument.

```ts
function logCount(store: Store) {
   const count = store(Count)
   return count.pipe(tap(console.log))
}

function autoIncrement(store: Store) {
   const increment = store(Increment)
   return interval(1000).pipe(tap(increment))
}
```

**Error Recovery**

Effects will stop running by default when an error occurs. To prevent this from happening,
handle the error using `catchError` or another retry strategy. If you just want errors to be
reported while keeping an effect running, return a materialized stream from an error-producing
inner observable.

```ts
function effectWithErrors(store: Store) {
   const http = inject(HttpClient)
   const source = store(Count)
   const result = store(ResultAction)
   return source.pipe(
      switchMap((count) =>
         http.post("url", { count }).pipe(
            map(result),
            materialize(), // should be placed on an inner stream
         ),
      ),
   )
}
```

#### Module Store

Create a Store. 

```ts
const AppStore = new Store("AppStore", {
   state: getInitialState,
   reducers: [Count],
   effects: [logCount, autoIncrement],
})
```

Provide the store to root module. Additional stores can be configured
for each lazy loaded module. Effects will run immediately on bootstrap.

```ts
@NgModule({
   imports: [
      StoreModule.config(AppStore),
   ],
})
export class AppModule {}
```

#### Component Store

Create a Store.

```ts
const MyStore = new Store("MyStore", {
   state: getInitialState,
   reducers: [Count],
   effects: [logCount, autoIncrement],
})
```

Provide and use the store in a component. Effects won't run until the
store is injected.

```ts
function setup() {
   const store = inject(MyStore)
   const count = store(Count) // get value from store
   const increment = store(Increment) // get dispatcher from store

   return {
      count,
      increment,
   }
}

@Component({
   providers: [MyStore.Provider],
})
export class MyComponent extends ViewDef(setup) {}
```

**Important: A note about dependency injection**

You must use the store's injector to retrieve actions and values.

```ts
const count = inject(Count) // don't do this!
```
```ts
const store = inject(MyStore) // inject store first
const count = store(Count) // this will be the correct instance
```

## API Reference

### Action

Creates an injectable `Emitter` that will emit actions of a given `kind`, with or without data.

```ts
const Increment = new Action("Increment")
const SaveTodo = new Action("SaveTodo", props<Todo>())
```

Actions can be injected inside the setup function of a `ViewDef` or `Service` factory. This
returns an `Emitter` that be used to dispatch or listen to events.

```ts
function setup() {
   const store = inject(MyStore)
   const increment = store(Increment)

   subscribe(increment, ({ kind }) => {
      console.log(kind) // "Increment"
   })

   setTimeout(increment, 1000)

   return {
      increment,
   }
}

@Component()
export class MyComponent extends ViewDef(setup) {}
```

### Reducer

Creates an injectable `Value` that reduces actions to produce a new state. The state of the
reducer is hydrated using the object key of the same name returned by `getInitialState`.

```ts
function getInitialState() {
   return {
      count: 0, // object key must match reducer name
   }
}

const Count = new Reducer("count") // reducer name must match object
   .add(Increment, (state, action) => state + 1)
// .add(OtherAction, (state, action) => etc)
```

You can also supply a list of actions to a single reducer.

```ts
const Increment = new Action("Increment", props<{ by: number }>())
const Add = new Action("Add", props<{ by: number }>())

const Count = new Reducer(count).add(
   [Increment, Add],
   (state, action) => state + action.by,
)
```

Reducers can be injected inside the setup function of a `ViewDef` or `Service` factory. This
returns a `Value` that be used to get, set or observe state changes.

```ts
function setup() {
   const store = inject(MyStore)
   const count = store(Count)

   subscribe(() => {
      console.log(count()) // 0
   })

   return {
      count,
   }
}

@Component()
export class MyComponent extends ViewDef(setup) {}
```

### props

Returns a typed function for producing `data` on an `Action`. Data

```ts
const Increment = new Action("Increment", props<{ by: number }>())
```

Which is equivalent to

```ts
const Increment = new Action("Increment", (data: { by: number }) => data)
```
