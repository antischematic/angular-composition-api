import { HttpClient } from "@angular/common/http"
import { share, timer } from "rxjs"
import { map } from "rxjs/operators"
import {
   inject,
   Service,
   subscribe,
   use,
} from "@mmuscat/angular-composition-api"
import { Todo } from "./todo.component"
import { ErrorHandler } from "@angular/core"

let database = [
   {
      id: 1,
      text: "Think of an idea",
      done: true,
   },
   {
      id: 2,
      text: "Create a prototype in StackBlitz",
      done: true,
   },
   {
      id: 3,
      text: "Write a library",
      done: false,
   },
]

function loadTodosById() {
   const http = inject(HttpClient)
   const boundary = inject(ErrorHandler)
   return function (userId: string) {
      console.log("Loading from fake server. userId:", userId)
      // http.get() for real application
      const result = timer(1000).pipe(
         map(() => database.sort(() => Math.random())),
         share(),
      )
      boundary.handleError(result)
      return result
   }
}

export const LoadTodosById = new Service(loadTodosById, { providedIn: "root" })

interface Request<T> {
   type: "request"
   value: T
}

interface Response<T> {
   type: "response"
   value: T
}

type ApiEvent<T, U> = Request<T> | Response<U>

function createTodo() {
   const resource = use<ApiEvent<Todo, Todo>>(Function)

   subscribe(resource, (message) => {
      if (message.type === "request") {
         const entity = {
            ...message.value,
            id: database.length + 1,
         }
         database = database.concat(entity)
         subscribe(timer(250), () => {
            resource({
               type: "response",
               value: entity,
            })
         })
      }
   })
   return resource
}

export const CreateTodo = new Service(createTodo)
