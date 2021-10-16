import { NgModule } from "@angular/core"
import { BrowserModule } from "@angular/platform-browser"

import { AppComponent } from "./app.component"
import { TriangleModule } from "./triangle/triangle.module"

@NgModule({
   declarations: [AppComponent],
   imports: [BrowserModule, TriangleModule],
   providers: [],
   bootstrap: [AppComponent],
})
export class AppModule {}
