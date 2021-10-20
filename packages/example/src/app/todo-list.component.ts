import { CommonModule } from "@angular/common"
import {
   ChangeDetectionStrategy,
   Component,
   ErrorHandler,
   NgModule,
} from "@angular/core"
import { CreateTodo, LoadTodosById } from "./api.service"
import { Todo, TodoModule } from "./todo.component"
import {
   inject,
   subscribe,
   use,
   ViewDef,
} from "@mmuscat/angular-composition-api"
import { MatButtonModule } from "@angular/material/button"
import {
   MatDialog,
   MatDialogModule,
   MatDialogRef,
} from "@angular/material/dialog"
import { timer } from "rxjs"

function trackById(index: number, value: any) {
   return value?.id ?? index
}

function todoList() {
   const userId = use(""),
      todos = use<Todo[]>([]),
      creating = use<Todo | null>(null),
      loadTodosById = inject(LoadTodosById),
      createTodo = inject(CreateTodo),
      error = inject(ErrorHandler),
      changesCount = use(0),
      dialog = inject(MatDialog)

   subscribe(userId, (value) => {
      subscribe(loadTodosById(value), {
         next: todos,
         complete() {
            creating(null)
         },
      })
   })

   subscribe(createTodo, ({ value, type }) => {
      switch (type) {
         case "request": {
            console.log("create todo", value)
            creating(value)
            break
         }
         case "response": {
            console.log("todo created!", value)
            userId(userId())
            break
         }
      }
   })

   subscribe(todos, () => {
      changesCount(changesCount() + 1)
   })

   subscribe(todos, () => {
      console.log("todos changed!", todos())
      creating.next(null)
   })

   subscribe(() => {
      console.log("change count:", changesCount())
   })

   function explode() {
      const dialogRef = dialog.open(DialogText)
      subscribe(dialogRef.afterClosed(), () => {
         error.handleError(new Error("Boom!"))
      })
   }

   function toggleAll() {
      const done = todos().some((todo) => !todo.done)
      todos(todos().map((todo) => ({ ...todo, done })))
   }

   function todoChange(value: Todo) {
      todos(
         todos().map((todo) => ({
            ...(todo.id === value.id ? value : todo),
         })),
      )
   }

   return {
      todos,
      createTodo,
      creating,
      explode,
      id: trackById,
      toggleAll,
      todoChange,
   }
}

export function dialog() {
   const dialog = inject(MatDialogRef)

   subscribe(timer(1500), () => {
      dialog.close()
   })

   return {}
}

@Component({
   template: ` Uh oh... `,
   changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogText extends ViewDef(dialog) {}

@Component({
   selector: "app-todo-list",
   templateUrl: "./todo-list.component.html",
   providers: [CreateTodo, LoadTodosById],
   changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoList extends ViewDef(todoList) {}

@NgModule({
   imports: [CommonModule, TodoModule, MatButtonModule, MatDialogModule],
   declarations: [TodoList, DialogText],
   exports: [TodoList],
})
export class TodoListModule {}
