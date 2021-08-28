# Angular Composition API

Composition API and supporting libraries for writing functional Angular applications.

## Packages

| Name  | Description |
|---|---|
| [Core](https://github.com/mmuscat/angular-composition-api/tree/master/packages/core) | A lightweight (3kb) library for writing functional Angular applications.
| [Boundary](https://github.com/mmuscat/angular-composition-api/tree/master/packages/boundary) | A lightweight (3kb) implementation of [Error Boundaries](https://reactjs.org/docs/error-boundaries.html) for Angular, with a bit of [Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html).
| [Store](https://github.com/mmuscat/angular-composition-api/tree/master/packages/store) | A tiny (1kb) state management library for Angular Composition API.

[comment]: <> (| [Resource]&#40;https://github.com/mmuscat/angular-composition-api/tree/master/packages/resource&#41; | Remote data streams for Angular.)
[comment]: <> (| [Example]&#40;https://github.com/mmuscat/angular-composition-api/tree/master/packages/example&#41; | Todo List sandbox.)

## Contributing

1. Clone this repository.

2. Run `yarn` inside the project root.

3. Run `ng test` to ensure tests are passing.

4. Run `ng build [package]` to build the library.

5. Run `ng link` from `dist/[package]` and `ng link @mmuscat/[package]` to
link the build files to your workspace

7. Run `ng serve` to check the example application works.