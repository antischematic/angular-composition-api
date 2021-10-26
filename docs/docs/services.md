---
sidebar_position: 4
---

# Services

Creates a context-aware, tree-shakable service from the provided setup function. If the
`providedIn` option is set to null, or omitted, you must provide the service in a `NgModule`,
`Directive` or `Component`. Start or retrieve the service with `inject`. Services can return any non-primitive value.

```ts title="Example: Basic service"
import { HttpClient } from "@angular/common/http"
import { Service } from "@mmuscat/angular-composition-api"
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
