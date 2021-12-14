---
sidebar_position: 2
---

# Queries

A `Query` represents a single value. Queries can be composed with any observable data source, including other queries,
effects or commands from a `Store`.

```ts title="Example: A basic Query"
import { use } from "@mmuscat/angular-composition-api"
import { Query } from "@mmuscat/angular-phalanx"

const Count = new Query("count", () => use(0))
```

## Providers

Before a `Query` can be used it has to be provided somewhere in a module, component or directive. Once provided it can
be accessed from anywhere inside the injector tree.

### With Store

When using multiple queries it is better to combine them with a `Store`.

```ts
import { Component } from "@angular/core"
import { ViewDef, inject } from "@mmuscat/angular-composition-api"
import { Store } from "@mmuscat/angular-phalanx"

const AppStore = new Store("app", {
   tokens: [Count],
})

function setup() {
   const {
      query: { count },
   } = inject(Store)

   return {
      count,
   }
}

@Component({
   providers: [AppStore.Provider],
})
export class MyComponent extends ViewDef(setup) {}
```

### Standalone

A `Query` can also be injected with or without a `Store`.

```ts
import { Component } from "@angular/core"
import { ViewDef, inject } from "@mmuscat/angular-composition-api"

function setup() {
   const count = inject(Count)

   return {
      count,
   }
}

@Component({
   providers: [Count.Provider],
})
export class MyComponent extends ViewDef(setup) {}
```

## Dependency Injection

Use dependency injection to access services inside a `Query`.

```ts title="Example: Get user from a http endpoint"
import { use } from "@mmuscat/angular-composition-api"
import { Query } from "@mmuscat/angular-phalanx"
import { HttpClient } from "@angular/common/http"
import { switchMap } from "rxjs/operators"

export interface ChangeUser {
   id: string
}

export const ChangeUser = new Command("changeUser", action<ChangeUser>())

export const User = new Query("user", ({ event }) => {
   const http = inject(HttpClient)
   return pipe(
      event(ChangeUser),
      switchMap(({ id }) =>
         http.get("https://example.com/api/v1/user", { params: { id } }),
      ),
   )
})
```

## Derived Queries

A `Query` can be injected into other queries to create a derived query.

```ts Example="Derive one query from another"
import { use, inject, select } from "@mmuscat/angular-composition-api"
import { Query } from "@mmuscat/angular-phalanx"

const Count = new Query("count", () => use(10))
const Doubled = new Query("doubled", () => {
   const count = inject(Count)
   return select(() => count() * 2)
})
```

## Error Handling

Queries are terminated when an uncaught error occurs, so it is important that all errors inside a `Query` are properly
handled. One way is to intercept them with the `onError` hook inside a derived query. The following example makes
the error observable and retries the query using a `Command`.

```ts title="Example: Get user from a http endpoint (with error handling)"
import { use, onError } from "@mmuscat/angular-composition-api"
import { Query } from "@mmuscat/angular-phalanx"
import { HttpClient } from "@angular/common/http"
import { switchMap } from "rxjs/operators"

export interface ChangeUser {
   id: string
}

export const ChangeUser = new Command("changeUser", action<ChangeUser>())

export const User = new Query("user", ({ event }) => {
   const http = inject(HttpClient)
   return pipe(
      event(ChangeUser),
      switchMap(({ id }) =>
         http.get("https://example.com/api/v1/user", { params: { id } }),
      ),
   )
})

export const Retry = new Command("retry", action<void>())

export const UserError = new Query("userError", ({ event }) => {
   return onError(inject(User), () => event(Retry))
})
```
