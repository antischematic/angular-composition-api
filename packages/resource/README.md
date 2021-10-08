# Angular Resource

Data fetching library for Angular Composition API.

## Quick Start

[Install via NPM](https://www.npmjs.com/package/@mmuscat/angular-resource)

```bash

npm install @mmuscat/angular-resource

```

[Install via Yarn](https://yarnpkg.com/package/@mmuscat/angular-resource)

```bash

yarn add @mmuscat/angular-resource

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
      initialValue: [],
   })
   return {
      result,
   }
}
```

This returns a `Value` that emits `Resource` notifications.

```ts
@Component({
   template: `
      <spinner *ngIf="result.pending"></spinner>
      <ng-container *ngFor="let item of result.value">
        <child [item]="item"></child>
      </ng-container>
   `
})
export class MyComponent extends ViewDef(setup) {}
```

#### QueryOptions

```ts
interface QueryOptions<T> {
   initialValue: T
   operator?: <U, V>(mapFn: (value: U) => V) => OperatorFunction<U, ObservedValueOf<V>>
   refetch?: Observable<any>[]
}
```

The query can be configured with `refetch` to pull fresh data whenever another stream emits a value. If `refetch` is given a `Resource` observable,
it will wait until it is `done` before it runs the query again.

```ts
function setup() {
   const myQuery = inject(MyQuery)
   const [mutation, mutate] = inject(MyMutation).sync
   const fetch = use(Function)
   const result = myQuery(fetch, {
      initialValue: null,
      refetch: [mutation],
   })
}
```

The queuing strategy can also be configured. The default is `switchMap`.

```ts
function setup() {
   const myQuery = inject(MyQuery)
   const [mutation, mutate] = inject(MyMutation).sync
   const fetch = use(Function)
   const result = myQuery(fetch, {
      initialValue: null,
      operator: mergeMap
   })
}
```

#### Caching

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

Mutations are consumed by passing an observable data source to its factory function. This returns a `Resource` value
that can be observed to inspect the status of any ongoing mutations.

```ts
function setup() {
   const myMutation = inject(MyMutation)
   const params = use(Function)
   const result = myMutation(params)
   
   return {
      params,
      result
   }
}

@Component({
   template: `
      <spinner *ngIf="result.pending"></spinner>
   `
})
export class MyComponent extends ViewDef(setup) {}
```

#### MutationOptions

```ts
interface MutationConfig {
   operator?: () => OperatorFunction<ObservableInput<any>, any>
   cancel?: Observable<any>
}
```

`operator` - specifies the merge strategy when multiple requests are in the queue. Defaults to `exhaust`
`cancel` - cancels all requests currently in the queue when the given observable emits.

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

Invalidate a single query.

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
