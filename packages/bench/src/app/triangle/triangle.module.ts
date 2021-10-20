import { NgModule } from "@angular/core"
import { CommonModule } from "@angular/common"
import { TriangleComponent } from "./triangle.component"
import { DotComponent } from "./dot/dot.component"

@NgModule({
   declarations: [TriangleComponent, DotComponent],
   exports: [TriangleComponent],
   imports: [CommonModule],
})
export class TriangleModule {}
