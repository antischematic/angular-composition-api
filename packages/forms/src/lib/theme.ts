import { InjectionToken, Type } from "@angular/core"

export interface FormThemeEntry {
   component: Type<any>
   data?: ThemeData
}

export interface FormTheme {
   default: FormThemeEntry
   [key: string]: FormThemeEntry
}

export const FormTheme = new InjectionToken<FormTheme>("FormTheme")

export class ThemeData {
   [key: string]: any
}
