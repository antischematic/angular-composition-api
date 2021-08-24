import { NgModule } from "@angular/core"
import { NgCloak } from "./cloak"
import { CatchError, ErrorBoundary, Fallback } from "./error-boundary"

@NgModule({
   declarations: [ErrorBoundary, Fallback, CatchError, NgCloak],
   exports: [ErrorBoundary, Fallback, CatchError, NgCloak],
})
export class BoundaryModule {}
