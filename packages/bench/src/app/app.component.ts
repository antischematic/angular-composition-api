import {Component} from '@angular/core';
import {inject, select, subscribe, use, ViewDef} from "@mmuscat/angular-composition-api";
import {DomSanitizer} from "@angular/platform-browser";
import {animationFrameScheduler, interval} from "rxjs";

export function calculateScaleX(elapsed: number) {
   const t = (elapsed / 100) % 10;
   const scale = 1 + (t > 5 ? 10 - t : t) / 10;
   return scale / 2.1;
}

export function getTransform(elapsed: number) {
   return `scale(${calculateScaleX(elapsed)}, 0.7) translate3d(0, 0, 0)`;
}

function app() {
   const elapsed = use(0)
   const sanitizer = inject(DomSanitizer)
   const transform = select(() => sanitizer.bypassSecurityTrustStyle(getTransform(elapsed())))

   subscribe(interval(0), elapsed)

   return {
      transform
   }
}

@Component({
   selector: "app-root",
   templateUrl: "./app.component.html",
   styleUrls: ["./app.component.css"]
})
export class AppComponent extends ViewDef(app) {
   title = "bench"
}
