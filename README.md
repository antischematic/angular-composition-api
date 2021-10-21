
# Angular Composition API

Composition API and supporting libraries for writing functional Angular applications.

[Learn more](https://mmuscat.github.io/angular-composition-api/docs/intro)

```ts
function setup() {
   const service = inject(Service)
   const count = use(0)

   subscribe(count, () => {
      service.log(count.value)
   })

   return {
      count,
   }
}
```

## RFC

This repository is a reference implementation for this [RFC
discussion](https://github.com/mmuscat/angular-composition-api/discussions/11).

## Packages

| Name  | Description |
|---|---|
| [Core](https://github.com/mmuscat/angular-composition-api/tree/master/packages/core) | Composition model for writing functional reactive Angular applications.
| [Boundary](https://github.com/mmuscat/angular-composition-api/tree/master/packages/boundary) | [Error Boundary](https://reactjs.org/docs/error-boundaries.html) and [Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html) implementation for Angular.
| [Store](https://github.com/mmuscat/angular-composition-api/tree/master/packages/store) | State management library for Angular Composition API.
| [Resource](https://github.com/mmuscat/angular-composition-api/tree/master/packages/resource) | Data fetching library for Angular Composition API.

[comment]: <> (| [Example]&#40;https://github.com/mmuscat/angular-composition-api/tree/master/packages/example&#41; | Todo List sandbox.)

## Contributing

1. Clone this repository.

2. Run `yarn` inside the project root.

3. Run `ng test` to ensure tests are passing.

4. Run `ng build [package]` to build the library.

5. Run `ng link` from `dist/[package]` and `ng link @mmuscat/[package]` to
link the build files to your workspace

7. Run `ng serve` to check the example application works.
