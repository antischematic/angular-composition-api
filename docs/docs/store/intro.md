---
sidebar_position: 1
---

# Phalanx

Atomic state management for Angular Composition API

:::caution

This package is still being developed, and may contain breaking changes between each release.

:::

## Get Started

Install via NPM

```bash
npm install @mmuscat/angular-phalanx
```

Install via Yarn

```bash
yarn add @mmuscat/angular-phalanx
```

## Queries

```ts
const UserId = new Query("userId", () => use(EMPTY))

const Todos = new Query("todos", () => {
   const http = inject(HttpClient)
   return pipe(
      inject(UserId),
      switchMap((userId) =>
         http.get(environment.url, {
            params: { userId },
         }),
      ),
   )
})

const TodosError = new Query("todosError", () => {
   const retry = inject(Retry)
   return onError(inject(Todos), () => retry)
})
```

## Commands

```ts
const Retry = new Command("retry", (action) => {
   return pipe(action, debounceTime(1000))
})

const LogTodos = new Command("logTodos", (action) => {
   return pipe(
      action,
      tap(([previous, current]) =>
         console.log("todos", {
            previous,
            current,
         }),
      ),
   )
})
```

## Effects

```ts
const TodosEffect = new Effect("todosEffect", ({ event, dispatch }) => {
   return pipe(event(Todos), pairwise(), dispatch(LogTodos))
})
```

## Stores

```ts
const TodosStore = new Store("todos", {
   tokens: [UserId, Todos, TodosError, Retry, LogTodos, TodosEffect],
})
```

## Module Store

```ts
@NgModule({
   providers: [AppStore.Provider],
})
export class AppModule {}
```

## Component Store

```ts
function setup() {
   const {
      query: { todos, todosError },
      command: { retry },
   } = inject(TodosStore)

   return {
      todos,
      todosError,
      retry,
   }
}

@Component({
   selector: "todos",
   template: `
      <div *ngIf="todosError; else showTodos">
         Something went wrong.
         <button (click)="retry()">Retry</button>
      </div>
      <ng-template #showTodos>
         <spinner *ngIf="!todos"></spinner>
         <div *ngFor="let todo of todos">
            <todo [value]="todo"></todo>
         </div>
      </ng-template>
   `,
   providers: [TodosStore.Provider],
})
export class Todos extends ViewDef(setup) {}
```

## Plugins

### Store Logger

Log store events to the console

```ts
const AppStore = new Store("app", {
   plugins: [StoreLog],
})
```

### Store Cache

Persist store state in localstorage.

```ts
const AppStore = new Store("app", {
   plugins: [StoreCache],
})
```
