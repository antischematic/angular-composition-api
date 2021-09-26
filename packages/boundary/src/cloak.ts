import { isObservable, Observable, Observer, Subject, Subscriber } from "rxjs"
import {
   AfterContentInit,
   ChangeDetectorRef,
   Component,
   ContentChildren,
   Directive,
   ElementRef,
   ErrorHandler,
   EventEmitter,
   Input,
   OnDestroy,
   Output,
   QueryList,
   Renderer2,
   SkipSelf,
} from "@angular/core"

class ValueSubscriber extends Subscriber<any> {
   next() {
      super.complete()
      this.unsubscribe()
   }

   error(error: unknown) {
      super.error(error)
      this.unsubscribe()
   }

   complete() {
      super.complete()
      this.unsubscribe()
   }

   unsubscribe() {
      this.boundary.subscription.remove(this)
      super.unsubscribe()
   }

   constructor(private boundary: NgCloak, observer: CloakObserver) {
      super(observer)
      boundary.subscription.add(this)
   }
}

class CloakObserver implements Observer<any> {
   next(source: Observable<any>) {
      const subscriber = new ValueSubscriber(this.boundary, this)
      subscriber.add(source.subscribe(subscriber))
   }
   error(error: unknown) {
      this.boundary.handleError(error)
   }
   complete() {
      const { boundary } = this
      if (boundary.refCount > 0) {
         boundary.refCount--
         if (boundary.refCount === 0) {
            boundary.cloak(false)
         }
      }
   }
   constructor(private boundary: NgCloak) {}
}

@Component({
   selector: "ng-cloak",
   template: `
      <ng-content
         select="fallback, [fallback]"
         *ngIf="cloaked; else content"
      ></ng-content>
      <ng-template #content>
         <ng-content></ng-content>
      </ng-template>
   `,
   providers: [
      {
         provide: ErrorHandler,
         useExisting: NgCloak,
      },
   ],
})
export class NgCloak implements AfterContentInit, OnDestroy {
   cloaked
   observer
   subscription
   queue
   refCount
   parent?: NgCloakList

   @Output()
   cloakChange

   get element() {
      return this.elementRef.nativeElement
   }

   register(parent: NgCloakList) {
      this.parent = parent
   }

   handleError(value: unknown) {
      if (isObservable(value)) {
         this.refCount++
         this.queue.next(value)
         this.cloak(true)
      } else {
         this.refCount = 0
         this.subscription.unsubscribe()
         this.subscription = this.subscribe()
         this.cloak(false)
         this.errorHandler.handleError(value)
      }
   }

   cloak(cloaked: boolean) {
      this.cloaked = cloaked
      if (cloaked) this.changeDetectorRef.detach()
      else this.changeDetectorRef.reattach()
      if (!this.parent) this.render()
   }

   render() {
      this.changeDetectorRef.detectChanges()
   }

   subscribe() {
      return this.queue.subscribe(this.observer)
   }

   ngAfterContentInit() {
      this.cloak(this.refCount > 0)
   }

   ngOnDestroy() {
      this.subscription.unsubscribe()
   }

   constructor(
      private elementRef: ElementRef,
      @SkipSelf() private errorHandler: ErrorHandler,
      public changeDetectorRef: ChangeDetectorRef,
   ) {
      this.cloaked = false
      this.refCount = 0
      this.observer = new CloakObserver(this)
      this.queue = new Subject<Observable<any>>()
      this.subscription = this.subscribe()
      this.cloakChange = new EventEmitter()
   }
}

class CloakListObserver {
   next() {
      this.list.render(this.children)
   }
   constructor(
      private list: NgCloakList,
      private child: NgCloak,
      private children: NgCloak[],
   ) {}
}

@Directive({
   selector: "ng-cloak-list",
})
export class NgCloakList implements AfterContentInit {
   @Input()
   revealOrder: "together" | "forwards" | "reverse"

   @Input()
   tail?: "collapsed" | "hidden"

   @ContentChildren(NgCloak, { descendants: true })
   children?: QueryList<NgCloak>

   render(children: NgCloak[]) {
      const {
         elementRef: { nativeElement },
         renderer,
         revealOrder,
         tail,
      } = this
      let child
      let previous = null
      let renderChildren: NgCloak[] = children.slice()
      if (revealOrder === "reverse") {
         renderChildren = renderChildren.reverse()
      }
      while ((child = renderChildren.shift())) {
         if (tail === "hidden" && child.cloaked) break
         if (revealOrder === "reverse") {
            renderer.insertBefore(nativeElement, child, previous)
         } else {
            renderer.appendChild(nativeElement, child.element)
         }
         previous = child
         child.render()
         if (tail === "collapsed" && child.cloaked) break
      }
      while ((child = renderChildren.shift())) {
         renderer.removeChild(nativeElement, child.element)
      }
   }

   subscribe(children: NgCloak[]) {
      for (const child of children) {
         child.cloakChange.subscribe(
            new CloakListObserver(this, child, children),
         )
      }
   }

   ngAfterContentInit() {
      if (this.children) {
         this.subscribe(this.children.toArray())
      }
   }

   constructor(private elementRef: ElementRef, private renderer: Renderer2) {
      this.revealOrder = "together"
   }
}
