import { FieldSchema } from "./form-container.component"

export interface Schema extends FieldSchema {
   fields: FieldSchema[]
}

class Field {
   field: {
      [key: string]: Field
   }

   constructor(public schema: FieldSchema) {
      this.field = {}
      for (const field of schema.fields ?? []) {
         this.field[field.name] = new Field(field)
      }
   }
}

export class FormSchema extends Field {
   get name() {
      return this.schema.name
   }

   get fields() {
      return this.schema.fields
   }

   get type() {
      return this.schema.type
   }

   findFieldByName(name: string) {
      const field = this.schema.fields.find(field => field.name === name)
      if (field) {
         const { nullable = false, default: defaultValue = null } = field
         return {
            ...field,
            nullable,
            default: defaultValue
         }
      }
      console.error(this)
      throw new Error(`Form field "${name}" does not exist in schema`)
   }

   getDefault(name: string) {
      const { default: defaultValue, nullable } = this.findFieldByName(name)
      if ((defaultValue === undefined || defaultValue === null) && nullable) {
         throw new Error(`Form field "${name}" has no default and is not not nullable`)
      }
      return defaultValue ?? null
   }

   has(path: string) {
      const parts = path.split(".")
      let part: string | undefined
      while (part = parts.shift()) {
         const field = this.field[part]
         if (!field) return false
      }
      return true
   }

   get(path: string) {
      const parts = path.split(".")
      let part: string | undefined
      while (part = parts.shift()) {
         const field = this.field[part]
         if (field) return field
      }
      throw new Error(`Form field "${path}" does not exist in schema`)
   }

   constructor(public uri: string, public schema: Schema) {
      super(schema)
   }
}
