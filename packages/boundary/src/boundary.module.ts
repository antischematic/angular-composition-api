import { NgModule } from "@angular/core"
import {NgCloak, NgCloakList} from "./cloak"
import {CommonModule} from "@angular/common";
import {ErrorBoundary} from "./error-boundary";
import {Fallback} from "./fallback";

@NgModule({
   imports: [CommonModule],
   declarations: [ErrorBoundary, NgCloakList, NgCloak, Fallback],
   exports: [ErrorBoundary, NgCloakList, NgCloak, Fallback],
})
export class BoundaryModule {}
