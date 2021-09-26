# Angular Error Boundary

A lightweight (3kb) implementation of [Error Boundaries](https://reactjs.org/docs/error-boundaries.html) for Angular,
with a bit of [Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html).

## Quick Start

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

[comment]: <> (## Example)

[comment]: <> ([View demo on Stackblitz]&#40;https://stackblitz.com/edit/angular-error-boundary?file=src%2Fapp%2Fapp.component.html&#41;)

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

## API Reference

### ErrorBoundary

**selector:** `error-boundary`

Creates an error boundary. Renders `fallback` content when an error is handled,
otherwise it renders an embedded template.

**method:** `retry()`

Resets the error state, hides `fallback` content and reloads the template.

**output:** `error`

Emits an `ErrorEvent` when an error is caught.

```ts
interface ErrorEvent {
   error: unknown
}
```

**examples:**

```html
<error-boundary (error)="handleError($event)" #boundary>
   <ng-template>
      <maybe-throws></maybe-throws>
   </ng-template>
   <fallback>
      <p>Uh oh... Something happened.</p>
      <button (click)="boundary.retry()">Start again</button>
   </fallback>
</error-boundary>
```

### Fallback

**selector:** `fallback, [fallback]`

Fallback are hidden until they are rendered by an error boundary.

**examples:**

```html
<error-boundary>
   <fallback>An error has occurred</fallback>
</error-boundary>
```

```html
<error-boundary>
   <div fallback>An error has occurred</div>
</error-boundary>
```

### NgCloak

**selector:** `ng-cloak`

Hides components and displays a `fallback` until all pending data sources are resolved. Cloak boundaries are triggered
by passing an `Observable` to the `ErrorHandler` service. Change detection still runs while a component is cloaked,
and will continue to render children until all data dependencies are met.

A data dependency is met after it emits its first value, or completes. If one or more data dependencies fail, this
will cascade up to the nearest error boundary.

**examples:**

Given a component with async data, inject the `ErrorHandler` service and pass your data dependencies to the `handleError`
method.

```ts
@Component()
export class MyBrand {
   data

   constructor(private errorHandler: ErrorHandler) {
      this.data = of([1, 2, 3]).pipe(
         delay(2000),
         share(), // multicast to prevent multiple subscriptions
      )
      errorHandler.handleError(this.data) // will be cloaked for 2 seconds
   }
}
```

```html
<error-boundary>
   <ng-template>
      <ng-cloak>
         <my-brand></my-brand>
         <fallback>Loading...</fallback>
      </ng-cloak>
   </ng-template>
   <fallback>Something went wrong</fallback>
</error-boundary>
```

### NgCloakList

**selector:** `ng-cloak-list`

**input:** `revealOrder` **enum:** `together` `forwards` `backwards`

Controls the order in which items are revealed. If omitted all items will be rendered by default.

**input:** `tail` **enum:** `collapsed` `hidden`

Controls how fallbacks are rendered. `collapsed` will only render the next fallback in the list, while `hidden` will
not render any fallbacks. If omitted all fallbacks will be rendered by default.

`NgCloakList` controls the rendering flow of multiple `NgCloak` components. This is useful when rendering lists or grids, where each
item has its own cloak boundary.

```html
<ng-cloak-list revealOrder="forwards" tail="collapsed">
  <li *ngFor="let item of items">
     <ng-cloak>
        <my-brand [item]="item"></my-brand>
        <fallback>Loading...</fallback>
     </ng-cloak>
  </li>
</ng-cloak-list>
```
