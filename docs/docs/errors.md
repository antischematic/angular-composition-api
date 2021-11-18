---
sidebar_position: 7
---

# Error Handling

Use the `onError` hook to catch and recover from errors automatically or on user interaction.

## Example

```ts title="Example: Error handling and recovery"
import { Component } from "@angular/core"
import {
   use,
   pipe,
   onError,
   subscribe,
   ViewDef,
} from "@mmuscat/angular-composition-api"
import { HttpClient } from "@angular/common/http"

function loadTodos(userId) {
   const http = inject(HttpClient)
   return pipe(
      userId,
      exhaustMap((userId) => http.get(url, { params: { userId } })),
   )
}

function setup() {
   const userId = use(EMPTY)
   const todos = loadTodos(userId)
   const reload = use(Function)
   const error = onError(todos, (error) => {
      console.error(error)
      return reload
   })

   return {
      userId,
      error,
      todos,
      reload,
   }
}

@Component({
   selector: "todos",
   templateUrl: "./todos.component.html",
})
export class Todos extends ViewDef(setup) {}
```

```html title="todos.component.html"
<div *ngIf="error; else showTodos">
   Something went wrong.
   <button (click)="reload()">Reload</button>
</div>
<ng-template #showTodos>
   <spinner *ngIf="!todos"></spinner>
   <div *ngFor="let todo of todos">
      <todo [value]="todo"></todo>
   </div>
</ng-template>
```

## Error Chaining

If multiple listeners are attached to the same `Value`, thrown errors are propagated sequentially until the error is
handled. If the last handler also throws, `Value` will emit an error notification.

```ts
import {HttpErrorResponse} from "@angular/common/http";

function setup() {
   const userId = use(EMPTY)
   const todos = loadTodos(userId)
   const retry = use<void>(Function)
   const firstError = onError(todos, (e) => {
      if (e instanceof HttpErrorResponse) {
         return retry
      }
      return e
   })
   const secondError = onError(todos, (e) => {
      if (e.error) {
         return retry
      }
      throw e
   })
   subscribe(value, spy)
   return {
      userId,
      todos,
      first,
      secondError,
      retry,
   }
}

```

When an error is caught, `onError` will subscribe to the `Observable` returned from its callback function and retry
the `Value` when it receives a next notification.

## Error State

The return value of `onError` is `Value` that emits `ErrorState | undefined` notifications. When an error is caught,
the `ErrorState` is emitted with information about the error.

```ts
interface ErrorState {
   error: unknown
   message?: string
   retries: number,
}
```

The number of retries is unique for each `onError` call, and increments each time it retries a `Value`.
