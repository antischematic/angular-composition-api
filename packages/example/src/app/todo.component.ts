import {Component, ElementRef, NgModule, Renderer2, ViewChild, ViewChildren,} from "@angular/core"
import {FormsModule} from "@angular/forms"
import {Context, inject, subscribe, use, ViewDef} from "@mmuscat/angular-composition-api"

export interface Todo {
   id?: number
   text: string
   done: boolean
}


function create(context: Context) {
   const id = use<number>()
   const text = use("")
   const done = use(false)
   const resetOnSave = use(false)
   const saveTodo = use<Todo>(Function)
   const textEditor = use<ElementRef>(ViewChild)
   const renderer = inject(Renderer2)
   const viewChildren = use<ElementRef>(ViewChildren)

   function setEditorText(value: string) {
      if (!textEditor.value) return
      renderer.setProperty(
         textEditor.value?.nativeElement,
         "textContent",
         value,
      )
   }

   function toggleDone(value: boolean) {
      saveTodo({
         id: id(),
         text: text(),
         done: value,
      })
   }

   function editText(value: string) {
      if (!value || value === text()) return
      text(value)
      saveTodo({
         id: id(),
         text: text(),
         done: done(),
      })
      if (resetOnSave()) {
         text('')
      } else {
         text(value)
      }
   }

   subscribe(text, setEditorText)

   subscribe(() => {
      for (const child of viewChildren()) {
         console.log('viewChild', child)
      }
   })

   return {
      id,
      text,
      done,
      resetOnSave,
      saveTodo,
      textEditor,
      toggleDone,
      setEditorText,
      editText,
      viewChildren
   }
}

@Component({
   selector: "app-todo",
   templateUrl: "./todo.component.html",
   inputs: ["id", "text", "done", "resetOnSave"],
   outputs: ["saveTodo"],
   queries: {
      textEditor: new ViewChild("textContent"),
      viewChildren: new ViewChildren("textContent"),
   },
   host: {
      "[class.red]": "done",
   },
})
export class TodoComponent extends ViewDef(create) {}

@NgModule({
   imports: [FormsModule],
   declarations: [TodoComponent],
   exports: [TodoComponent],
})
export class TodoModule {}
