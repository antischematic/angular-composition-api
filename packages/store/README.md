# Angular Actions

TBD

Create Queries

```ts
// queries
const UserId = new Query("userId", () => use(EMPTY))
const Todos = new Query("todos", () => loadUser(inject(UserId)))
const TodosError = new Query("todosError", () => {
   const retry = inject(Retry)
   return onError(inject(User), () => retry)
})
```

Create Commands

```ts
const Retry = new Command("retry", (action) => {
   return pipe(action, debounceTime(1000))
})
```

Create Stores

```ts
const AppStore = new Store("app", {
   tokens: [UserId, User, UserError],
   plugins: [
      ReduxDevTool,
   ],
})
```

Component Store

```ts
function setup() {
   const get = inject(AppStore)
   const todos = get(Todos)
   const error = get(TodosError)
   const retry = get(Retry)

   return {
      todos,
      error,
      retry,
   }
}

@Component({
   selector: "todos",
   template: `
      <div *ngIf="error; else showTodos">
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
   providers: [Store.Provider],
})
export class Todos extends ViewDef(setup) {}
```
