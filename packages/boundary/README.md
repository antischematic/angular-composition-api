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

Override the default `ErrorHandler` service in the root module.

**app.module.ts**
```ts
@NgModule({
    providers: [{
        provide: ErrorHandler,
        useExisting: BoundaryHandler,
    }],
    ...
})
export class AppModule {}
```

Add `BoundaryModule` to a `NgModule` to enable error boundaries.

**my.module.ts**
```ts
@NgModule({
    imports: [BoundaryModule],
    declarations: [MyComponent],
    ...
})
export class MyModule {}
```

Add global styles for `ng-cloak` to hide content when fallback is shown.

**styles.css**
```css
.ng-cloak {
    display: none !important;
}
```

Your can now use error boundaries in your components.

**my.component.html**
```html
<error-boundary>
    <my-widget *catchError></my-widget>
    <div fallback>
        Something went wrong
    </div>
</error-boundary>
```

## Example

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

**selector:** `error-boundary`

Defines a boundary for `catchError`. Renders `fallback` content when an error occurs,
otherwise renders the embedded view.

**exportAs:** `errorBoundary`

**method:** `reset()`

Resets the error state, hides `fallback` content and re-creates the embedded view.

**output:** `error`

Emits an `ErrorBoundaryEvent` when an error is caught. Calls to `reset` will
dismiss the error state and re-create the embedded view

```ts
interface ErrorBoundaryEvent {
    closed: boolean
    error: unknown
    reset(): void
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

Catches and funnels errors that occur during change detection to the nearest
`ErrorBoundary`. Does *not* catch errors for:

- Component/Directive constructors
- Event handlers
- Asynchronous code (e.g. setTimeout or requestAnimationFrame callbacks)
- Async pipe
- Server side rendering
- Errors thrown in the error boundary itself 

Each error boundary can only have one `catchError` as a direct descendant.

### Fallback

**selector:** `[fallback]`

If used on a DOM element, hides the element until an error is caught by the
error boundary, then shows it. The element is hidden again when the error
state resets.

If used on a template, embeds the view when an error is caught by the error boundary
and destroys it when the error state resets.

Each error boundary can only have one `fallback` as a direct descendant.

**examples:**

With DOM element

```html
<error-boundary [fallback]="domElement"></error-boundary>
<div #domElement>An error has occurred</div>

<!-- or -->

<error-boundary>
    <div fallback>An error has occurred</div>
</error-boundary>
```

With `ng-template`

```html
<error-boundary [fallback]="templateRef"></error-boundary>
<ng-template #templateRef></ng-template>

<!-- or -->

<error-boundary>
    <ng-template fallback>An error has occurred.</ng-template>
</error-boundary>
```

With component

```html
<error-boundary [fallback]="MyCustomError"></error-boundary>

<!-- or -->

<error-boundary>
    <my-custom-error fallback></my-custom-error>
</error-boundary>
```

### NgCloak

**selector:** `ng-cloak`

---

**What's the difference between NgCloak and Suspense?**

- We wrap observables in a `CloakBoundary` instead of throwing them.
- Components templates are always rendered, giving child components a chance to load data before the
parent has finished resolving.
- Components are hidden with the `ng-cloak` class instead of unmounting them, unless an
  error occurs.
---

Hides components and displays a `fallback` until all components have resolved
"cloaked" data sources. Cloaked data sources are observables that has been wrapped by
 `CloakBoundary`. Any component in the `ng-cloak` tree can mark data as cloaked, which
will hide the entire tree from display until all cloaked data has resolved. The lead time
and trailing time for showing/hiding content can be configured with the `NG_CLOAK_CONFIG`
provider.

Each cloak boundary can only have one `fallback` as a direct descendant.

**examples:**

```html
<error-boundary>
    <ng-cloak *catchError>
        <my-brand></my-brand>
    </ng-cloak>
</error-boundary>
```

### CloakBoundary

An injectable service with a single method: **cloak**

```ts
interface CloakBoundary {
 cloak<T>(source: Observable<T>): Observable<T>
}
```

**method:** `cloak`

Returns a "cloaked" observable that is bound to the `CloakBoundary`. Subscribing to a
cloaked observable triggers the cloak boundary, hiding content until the observable
completes, errors, or emits a value. Multiple cloaked observables can be subscribed to
in this way, hiding content until all observables have emitted, errored or completed.

**examples:**

In this example, the component is cloaked/hidden for 2 seconds, then is displayed.

```ts
@Component({
    template: `
        <p>{{ values | async | json }}</p>
    `
})
class MyComponent {
    values
    constructor(boundary: CloakBoundary) {
        this.values = boundary.cloak(timer(2000)).pipe(
            map(() => [1, 2, 3])
        )
    }
}
```

### NG_CLOAK_CONFIG

Provide this value to configure the `leading` and `trailing` delay when a
`CloakBoundary` state transition occurs.

```ts
export interface CloakConfig {
    leading: number
    trailing: number
}

DEFAULT_CLOAK_CONFIG = {
    leading: 0,
    trailing: 1000
}
```
