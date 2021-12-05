import {
   AfterViewInit,
   ChangeDetectorRef,
   Component,
   ContentChildren,
   DoCheck,
   ErrorHandler,
   EventEmitter,
   Injectable,
   Output,
   QueryList,
   SkipSelf,
   TemplateRef,
} from "@angular/core"
import { NgIfContext } from "@angular/common"

@Injectable({ providedIn: "root" })
export class ErrorLogger {
   error(error: unknown) {
      console.error(error)
   }
}

@Component({
   selector: "error-boundary",
   template: `
      <ng-container *ngIf="hasError; else template?.first ?? null">
         <ng-content select="fallback, [fallback]"></ng-content>
      </ng-container>
   `,
   providers: [
      {
         provide: ErrorHandler,
         useExisting: ErrorBoundary,
      },
   ],
})
export class ErrorBoundary implements DoCheck, AfterViewInit {
   @Output()
   error
   hasError

   @ContentChildren(TemplateRef, { descendants: false })
   template?: QueryList<TemplateRef<NgIfContext<boolean>>>

   ngDoCheck() {
      if (this.hasError) return
      try {
         this.changeDetectorRef.detectChanges()
      } catch (error) {
         this.handleError(error)
      }
   }

   ngAfterViewInit() {
      this.changeDetectorRef.detach()
   }

   handleError(fault: unknown) {
      try {
         this.hasError = true
         this.changeDetectorRef.detectChanges()
         this.logger.error(fault)
         this.error.emit(
            new ErrorEvent("ErrorBoundary", {
               error: fault,
            }),
         )
      } catch (doubleFault) {
         this.errorHandler.handleError(fault)
         if (fault !== doubleFault) {
            this.errorHandler.handleError(doubleFault)
         }
      }
   }

   retry() {
      this.hasError = false
      this.changeDetectorRef.detectChanges()
   }

   constructor(
      public changeDetectorRef: ChangeDetectorRef,
      public logger: ErrorLogger,
      @SkipSelf() private errorHandler: ErrorHandler,
   ) {
      this.hasError = false
      this.error = new EventEmitter<ErrorEvent>()
   }
}
