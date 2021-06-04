import {ErrorHandler, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';

import {AppComponent} from './app.component';
import {TodoListModule} from './todo-list.component';
import {HttpClientModule} from '@angular/common/http';
import {BoundaryHandler, BoundaryModule} from "@mmuscat/angular-error-boundary";

@NgModule({
    imports: [BrowserModule, FormsModule, TodoListModule, HttpClientModule, BoundaryModule],
  declarations: [ AppComponent ],
  bootstrap:    [ AppComponent ],
    providers: [{
        provide: ErrorHandler,
        useExisting: BoundaryHandler
    }]
})
export class AppModule { }
