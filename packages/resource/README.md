# Angular Resource

Data fetching for Angular Composition API.

## Quick Start

TBD

[comment]: <> (Install via NPM)

[comment]: <> (```bash)

[comment]: <> (npm install @mmuscat/angular-resource)

[comment]: <> (```)

[comment]: <> (Install via Yarn)

[comment]: <> (```bash)

[comment]: <> (yarn add @mmuscat/angular-resource)

[comment]: <> (```)

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
   const createTodo = inject(CreateTodo)
   const getTodosByUserId = inject(GetTodosByUserId)
   const todos = getTodosByUserId(userId, {
      refetch: [createTodo],
      initialValue: [],
   })

   return {
      todos,
      createTodo,
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

TBD

### Mutation

TBD
