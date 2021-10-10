import { NgModule } from "@angular/core"
import {BrowserModule, EventManager} from "@angular/platform-browser"
import { FormsModule } from "@angular/forms"

import { AppComponent } from "./app.component"
import { TodoListModule } from "./todo-list.component"
import { HttpClientModule } from "@angular/common/http"
import { BoundaryModule } from "@mmuscat/angular-error-boundary"
import {ZonelessEventManager} from "@mmuscat/angular-composition-api";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatButtonModule} from "@angular/material/button";

@NgModule({
   imports: [
      BrowserModule,
      FormsModule,
      TodoListModule,
      HttpClientModule,
      BoundaryModule,
      BoundaryModule,
      BrowserAnimationsModule,
      MatButtonModule,
   ],
   declarations: [AppComponent],
   bootstrap: [AppComponent],
   providers: [{
      provide: EventManager,
      useClass: ZonelessEventManager
   }]
})
export class AppModule {}
