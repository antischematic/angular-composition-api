---
sidebar_position: 6
---

# Utilities

## Get

The `get` utility retrieves the flattened state of a `Value` or object containing `Value` objects. When used inside a reactive
observer, this operation is reactive. `Value` objects in arrays, maps or sets are not unwrapped.

```ts title="Example"
import { use, subscribe, get } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)
   const disabled = use(false)

   subscribe(() => {
      const state = get({
         count,
         nested: {
            disabled,
         },
      })

      console.log(state.count) // 0
      console.log(state.nested.disabled) // false
   })
}
```

## Access

Performs the same operation as `get` except it does not trigger reactive observers. `Value` objects in arrays,
maps or sets are not unwrapped.

```ts title="Example"
import { use, subscribe, access } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)
   const disabled = use(false)

   subscribe(() => {
      // not reactive!
      const state = access({
         count,
         nested: {
            disabled,
         },
      })

      console.log(state.count) // 0
      console.log(state.nested.disabled) // false
   })
}
```

## Combine

The `combine` utility creates a new `Value` from an object of `Value` objects.

```ts title="Example"
import { use, combine, subscribe } from "@mmuscat/angular-composition-api"

const count = use(0)
const disabled = use(false)
const state = combine({
   count,
   nested: {
      disabled
   }
})

subscribe(() => {
   // called whenever `count` or `disabled` changes
   const { count, nested: { disabled } } = state() 
})

console.log(state.value) // { count: 0, nested: { disabled: false }}
```

The combined `Value` will react whenever one of its upstream values change.

```ts
count(10)
console.log(state().count) // 10
```

When updating a combined `Value`, all upstream values are also updated. This operation accepts partial objects.

```ts
state({
   count: 20,
   nested: {
      disabled: true
   }
})

console.log(count()) // 20
console.log(disabled()) // true
```

## Pipe

The `pipe` utility flattens a series of operations into a single `Value`.

```ts title="Example"
import { use, subscribe, pipe } from "@mmuscat/angular-composition-api"
import { HttpClient } from "@angular/common/http"
import { exhaustMap } from "rxjs/operators"
import { environment } from "./environment.ts"

function setup() {
   const http = inject(HttpClient)
   const userId = use(EMPTY)
   const todos = pipe(
      userId,
      exhaustMap(() => http.get(environment.url, { params: { userId } })),
   )

   subscribe(todos, (value) => {
      console.log(value)
   })

   return {
      userId,
      todos,
   }
}
```
