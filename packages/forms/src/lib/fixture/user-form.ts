import { Component } from "@angular/core"
import { FormSchema } from "../schema"

const userSchema = new FormSchema("http://example.com/api/v1/forms/user", {
   name: "user",
   fields: [
      {
         name: "username",
         label: "Username",
         type: "text",
         default: "",
      },
      {
         name: "password",
         label: "Password",
         type: "password",
         default: "",
      },
      {
         name: "gender",
         label: "Gender",
         type: "select",
         nullable: true,
         fields: [
            {
               name: "male",
               label: "Male",
               type: "option",
               default: "M",
            },
            {
               name: "female",
               label: "Female",
               type: "option",
               default: "F",
            },
         ],
      },
   ],
})

export const favouritesSchema = new FormSchema("", {
   name: "favourites",
   fields: [
      {
         name: "favourites",
         label: "Favourites",
         type: "array",
         fields: [
            {
               name: "name",
               label: "Name",
               type: "text",
               default: ""
            },
         ]
      }
   ],
})

@Component({
   template: `
      <form-container [schema]="schema" [value]="value">
         <ng-container *ngIf="schema.field.username else favourites">
            <form-field name="username"></form-field>
            <form-field name="password"></form-field>
            <form-field name="gender"></form-field>
         </ng-container>
         <ng-template #favourites>
            <form-container name="favourites">
               <form-field name="name" *formTemplate></form-field>
            </form-container>
         </ng-template>
      </form-container>
      <button (click)="changeForm()"></button>
   `,
})
export class UserForm {
   schema
   value: any

   changeForm() {
      this.schema = favouritesSchema
      this.value = [
         "apple",
         "pie"
      ]
   }

   constructor() {
      this.schema = userSchema
   }
}
