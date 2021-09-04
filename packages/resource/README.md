# Angular Resource

Data fetching library for Angular Composition API.

## Quick Start

Install via NPM

```bash

npm install @mmuscat/angular-resource

```

Install via Yarn

```bash

yarn add @mmuscat/angular-resource

```

### Example

Query

```ts
function getTodosByUserId() {
   const http = inject(HttpClient)
   return function (userId) {
      return http.get(url, {
         params: { userId },
      })
   }
}

const GetTodosByUserId = new Query(getTodosByUserId)
```

Mutation

```ts
function createTodo() {
   const http = inject(HttpClient)
   return function (data) {
      return http.post(url, data)
   }
}

const CreateTodo = new Mutation(createTodo, {
   operator: exhaustAll,
})
```

Usage

```ts
function setup() {
   const userId = use("123")
   const [createTodoStatus, createTodo] = inject(CreateTodo)
   const getTodosByUserId = inject(GetTodosByUserId)
   const todos = getTodosByUserId(userId, {
      refetch: [createTodo],
      initialValue: [],
   })

   return {
      todos,
      createTodo,
      createTodoStatus,
   }
}

@Component({
   template: `
      <spinner *ngIf="todos.pending"></spinner>
      <div *ngIf="todos.error">Something went wrong</div>
      <todo *ngFor="let todo of todos.value"></todo>
      <add-todo (save)="createTodo($event)"></create-todo>
   `,
})
export class MyComponent extends ViewDef(setup) {}
```

## Api Reference

### Query

Queries are services created from factory functions that return another function that produces an observable stream.
Supports dependency injection.

```ts
function myQuery() {
   const http = inject(HttpClient)
   return function (params) {
      return http.get(url, {
         params,
      })
   }
}

const MyQuery = new Query(myQuery)
```

Inject the token in a component and create the query params and an initial value.

```ts
function setup() {
   const myQuery = inject(MyQuery)
   const params = use(Function)
   const result = myQuery(params, {
      initialValue: null,
   })
   return {
      result,
   }
}
```

This returns a `Value` that emits `Resource` notifications.

#### QueryConfig

```ts
interface QueryConfig {
   operator?: <T>() => OperatorFunction<Observable<T>, T> // defaults to switchMap
}
```

The default `operator` used to **map** higher order observables can be overridden.

```ts
const MyQuery = new Query(myQuery, {
   operator: concatMap,
})
```

#### QueryOptions

```ts
interface QueryOptions<T> {
   initialValue: T
   refetch?: Observable<any>[]
}
```

The query can be configured with `refetch` to pull fresh data whenever another stream emits a value. If `refetch` is given a `Resource` observable,
it will wait until it is `done` before it runs the query again.

```ts
function setup() {
   const myQuery = inject(MyQuery)
   const [mutation, mutate] = inject(MyMutation)
   const fetch = use(Function)
   const result = myQuery(fetch, {
      initialValue: null,
      refetch: [mutation],
   })
}
```

### Caching

Queries are memoized by stringifying arguments. Make sure the params passed to queries
are serializable to JSON.

```ts
function setup() {
   const myQuery = inject(MyQuery)
   const fetch = use(Function)
   const result = myQuery(fetch, {
      initialValue: null
   })
   fetch([1, 2, 3]) // stringified to "[1, 2, 3]" to use as cache key
}
```

### Mutation

Mutations are services created from factory functions that return another function that produces an observable stream.

```ts
function myMutation() {
   const http = inject(HttpClient)
   return function (params) {
      return http.post(url, params)
   }
}

const MyMutation = new Mutation(myMutation)
```

#### MutationConfig

```ts
interface MutationConfig {
   operator?: <T>() => OperatorFunction<Observable<T>, T> // defaults to exhaust
}
```

The default `operator` used to **flatten** higher order observables can be overridden.

```ts
const MyMutation = new Mutation(myMutation, {
   operator: concat,
})
```

**Returning mutation from a `ViewDef`**

Use the array destructure pattern to obtain an `Emitter` that can be used to trigger the mutation outside the `ViewDef`
factory.

```ts
function setup() {
   const [mutation, mutate] = inject(MyMutation)

   return {
      mutation, // mutation status
      mutate, // trigger mutation
   }
}

@Component({
   template: `
      <spinner *ngIf="mutation.pending"></spinner>
      <button (click)="mutate(params)">Mutate</button>
   `,
})
export class MyComponent extends ViewDef(setup) {}
```

### Resource

Interface that represents the state of a `Query` or `Mutation`

```ts
interface Resource<T> {
   value: T
   error: unknown
   pending: boolean
   done: boolean
}
```

`pending` is true if there are any active queries or mutations in the queue. `done` is true when there are no more pending
transactions, until the next request is made. `error` is set when an error is caught and resets when a new request is made.

### cancel

Cancel pending queries

```ts
const getTodosByUserId = inject(GetTodosByUserId)
const todos = getTodosByUserId(userId)

cancel(todos)
```

Cancel pending mutations

```ts
const createTodo = inject(CreateTodo)

createTodo(todo)

cancel(createTodo)
```

### invalidate

Invalidate a single query

```ts
const getTodosByUserId = inject(GetTodosByUserId)
const todos = getTodosByUserId(userId)

invalidate(todos)
```

Invalidate a single query with specific arguments

```ts
const getTodosByUserId = inject(GetTodosByUserId)
const todos = getTodosByUserId(userId)

invalidate(todos, "123")
```

Invalidate all queries by injection token

```ts
const getTodosByUserId = inject(GetTodosByUserId)
const todos = getTodosByUserId(userId)

invalidate(GetTodosByUserId)
```
