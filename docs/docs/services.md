---
sidebar_position: 4
---

# Services

Angular Composition API encourages small reusable services. These are created from an injectable factory function.
A service can return any non-primitive value.

:::important

Remember to import `inject` from this package, not the one in `@angular/core`.

:::

## Examples

```ts title="Example: Basic service"
import { HttpClient } from "@angular/common/http"
import { Service, inject } from "@mmuscat/angular-composition-api"
import { environment } from "./environment"

function setup() {
   const http = inject(HttpClient)
   return function (data) {
      return http.post(environment.endpoint.url, data)
   }
}

const BasicService = new Service(setup)
```

```ts title="Example: Service with all options"
import { HttpClient } from "@angular/common/http"
import { Service } from "@mmuscat/angular-composition-api"
import { environment } from "./environment"

function setup(url) {
   const http = inject(HttpClient)
   return function (data) {
      return http.post(url, data)
   }
}

const ServiceWithOptions = new Service(setup, {
   providedIn: "root",
   name: "MyService", // descriptive name for error handling
   arguments: [environment.endpoint.url],
})
```

```ts title="Example: Consuming a service"
function setup() {
   const service = inject(BasicService)
}

@Component({
   providers: [BasicService], // or viewProviders
})
export class MyComponent extends ViewDef(setup) {}
```

:::note

If the `providedIn` option is set to null, or omitted, you must provide the service in a `NgModule`,
`Directive` or `Component`. Start or retrieve the service with `inject`.

:::

## Composition

`Service` supports a subset of composition APIs that are available in `ViewDef`. The main differences are:

- `Value` objects returned from a `Service` are not unwrapped
- `subscribe` is executed immediately after a `Service` is created
- `onDestroy` lifecycle is available for teardown logic, other hooks will have no effect
- The `provide` API is not available

