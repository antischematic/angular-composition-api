---
sidebar_position: 2
---

# Boundary: Introduction

[Error Boundaries](https://reactjs.org/docs/error-boundaries.html) to Angular, with a bit of [Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html).

:::caution

This package is still being developed, and may contain breaking changes between each release.

:::

## Get Started

Install via NPM

```bash
npm install @mmuscat/angular-error-boundary
```

Install via Yarn

```bash
yarn add @mmuscat/angular-error-boundary
```

Add `BoundaryModule` to your `NgModule` imports to enable error boundaries.

**my.module.ts**

```ts
@NgModule({
    imports: [BoundaryModule],
    declarations: [MyComponent],
    ...
})
export class MyModule {}
```

Add error boundaries to your components.

**my.component.html**

```html
<error-boundary>
   <ng-template>
      <my-widget></my-widget>
   </ng-template>
   <fallback>Something went wrong</fallback>
</error-boundary>
```

## Handling async errors

You should handle any errors that might occur in your Angular application by
injecting the [`ErrorHandler`](https://angular.io/api/core/ErrorHandler) service.
Calls to the `handleError` method are intercepted by the nearest error boundary.

```ts
class AsyncComponent {
   value
   constructor(api: ApiService, errorHandler: ErrorHandler) {
      this.value = api.thatMaybeFailsAfterSomeTime().pipe(
         catchError((error) => {
            errorHandler.handleError(error)
            return EMPTY
         }),
      )
   }
}
```

## With Angular Composition API

When used with Angular Composition API, errors are automatically caught in the following additional scenarios. No
additional setup required.

-  When `subscribe` receives an error notification without an error observer.
-  When a `subscribe` observer throws an error
-  During `ViewDef` or `Service` setup
-  When `listen` throws an error. This is useful for catching errors in event bindings.
   ```ts title="Example: Event handler"
   function setup() {
      const eventHandlerThatThrows = listen((event) => {
         throw new Error("Oops")
      })
      return {
         eventHandlerThatThrows
      }
   }
   
   @Component({
     template: `
       <button (click)="eventHandlerThatThrows($event)">Boom</button>
     `
   })
   ```
