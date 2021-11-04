# Angular Error Boundary

[Error Boundaries](https://reactjs.org/docs/error-boundaries.html) for Angular, with a bit of [Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html). Click here to [Learn More](h)

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
