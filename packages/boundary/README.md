# Angular Error Boundary

A lightweight (2kb) implementation of [Error Boundaries](https://reactjs.org/docs/error-boundaries.html) for Angular.

## Quick Start

Install via NPM

```bash
npm install @mmuscat/angular-error-boundary
```

Install via Yarn

```bash
yarn add @mmuscat/angular-error-boundary
```

Add `BoundaryModule` to your `NgModule` imports.

```ts
@NgModule({
    imports: [BoundaryModule],
    ...
})
export class MyModule {}
```

## Example

```html
<error-boundary>
    <my-widget *catchError></my-widget>
    <div fallback>
        Something went wrong
    </div>
</error-boundary>
```

[View demo on Stackblitz](https://stackblitz.com/edit/angular-error-boundary?file=src%2Fapp%2Fapp.component.html)

### Handling async errors

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
            })
        )
    }
}
```

## API Reference

### ErrorBoundary

**selector:** `error-boundary`, `[errorBoundary]`

Defines a boundary for `catchError`. Renders `fallback` content and detaches
the embedded view when an error is caught.

**exportAs:** `errorBoundary`

**method:** `reset(options?: { create: boolean })`

Resets the error state, removes `fallback` content. If `{ create: true }` is set, 
destroys the embedded view and creates a new one. Othwerise the existing view is
reinserted.

**output:** `error`

Emits an `ErrorBoundaryEvent` when an error is caught. Calls to `reset` will
dismiss the error state. Call `reset` with `{ create: true }` to re-create the
embedded view.

```ts
interface ErrorBoundaryEvent {
    error: unknown
    closed: boolean
    reset(options?: { create: boolean })
}
```

**examples:**
```html
<error-boundary (error)="handleError($event)" #boundary>
    <maybe-throws *catchError></maybe-throws>
    <div fallback>
        <p>Uh oh... Something happened.</p>
        <button (click)="boundary.reset({ create: true })">
            Start again
        </button>
    </div>
</error-boundary>
```

### CatchError

**selector:** `[catchError]`

Catches errors that occur during change detection and notifies the nearest
`ErrorBoundary`. Does *not* catch errors for:

- Component/Directive constructors
- Event handlers
- Asynchronous code (e.g. setTimeout or requestAnimationFrame callbacks)
- Async pipe
- Server side rendering
- Errors thrown in the error boundary itself 

Each error boundary can only have one `catchError`.

### Fallback

**selector:** `[fallback]`

If used on a DOM element, detaches the element until an error is caught by the
error boundary, then reattaches it. The element is detached again when the error
state resets.

If used on a template, embeds the view when an error is caught by the error boundary
and destroys it when the error state resets. The `$implicit` value is set to the
error that was thrown.

Each error boundary can only have one `fallback`.

**examples:**

With DOM element

```html
<error-boundary>
    <div fallback>An error has occured</div>
</error-boundary>
```

With `ng-template`

```html
<error-boundary>
    <ng-template fallback let-error>An error has occured: {{ error.message }}</ng-template>
</error-boundary>
```

With component

```html
<error-boundary
    <my-custom-error *fallback="let error" [error]="error"></my-custom-error>
</error-boundary>
```