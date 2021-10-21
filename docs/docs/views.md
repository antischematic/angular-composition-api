---
sidebar_position: 3
---

# Views

Views are the basic building block for reactive components.

:::info

While most of the documentation refers to components, the same features are supported by directives too.

:::

Views are created using `ViewDef`, which accepts a setup function that initializes component state.

```ts title="Example: A basic view"
import { Component } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)

   subscribe(count, console.log)

   return {
      count,
   }
}

@Component({
   selector: "my-component",
   template: `{{ count }}`,
})
export class MyComponent extends ViewDef(setup) {}
```

Values returned from the setup function are automatically unwrapped. For example, `Value<number>` becomes `number` when
examined by the component instance. Inputs and queries are automatically synced with the view.

## Change Detection

Change detection occurs in the following scenarios (assuming `OnPush` strategy):

-  On first render.
-  When inputs change.
-  When an event binding is executed.
-  When `subscribe` emits a value, after the observer is called.

Updates to reactive state are not immediately reflected in the view. If you need an immediate update, call `detectChanges` after updating a value.

Change detection might _not_ occur when:

- Imperatively mutating fields on the component instance.
- Imperatively calling state mutating methods on the component instance.
   Unless the mutated state has a `subscribe` observer, this will not trigger
   a change detection run.
- Mutating state inside asynchronous callbacks such as `setTimeout` or `Promise` (use `subscribe` instead)

## Inputs

Inputs are declared on the `inputs` component metadata array. The name of the input must have a matching `Value` key on the object
returned from a `ViewDef`.

```ts title="Example: Input binding"
import { Component } from "@angular/core"
import { use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)

   return {
      count,
   }
}

@Component({
   inputs: ["count"]
})
export class MyComponent extends ViewDef(setup) {}
```

## Outputs

Outputs are declared on the `outputs` component metadata array. The name of the output must have a matching `Observable`
key on the object returned from `ViewDef`.

```ts title="Example: Output binding"
import { Component } from "@angular/core"
import { use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const increment = use<void>(Function)

   return {
      increment,
   }
}

@Component({
   outputs: ["increment"]
})
export class MyComponent extends ViewDef(setup) {}
```

## Two-way Binding

Two-way bindings be created with a `Value` and `Emitter` combination.

```ts title="Example: Two-way binding"
import { Component } from "@angular/core"
import { use, ViewDef } from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)
   const countChange = use(count)
   
   function increment() {
      countChange(count() + 1)
   }

   return {
      increment,
      count,
      countChange
   }
}

@Component({
   inputs: ["count"],
   outputs: ["countChange"]
})
export class MyComponent extends ViewDef(setup) {}
```

When `countChange` is invoked, this will also update the value of `count`. Conversely, updates to `count` via its input
binding will not trigger `countChange`.

## Queries

Content queries, view queries and query lists are configured the same way as inputs, using the `queries` component
metadata. These values are readonly.

```ts title="Example: Content child query"
import { ContentChild, Component } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"
import { Child } from "./child.component"

function setup() {
   const child = use<Child>(ContentChild)

   subscribe(child, (value) => {
      console.log(value)
   })
   
   return {
      child,
   }
}

@Component({
   queries: {
      child: new ContentChild(Child)
   }
})
export class MyComponent extends ViewDef(setup) {}
```

```ts title="Example: View children query"
import { Component, ViewChildren } from "@angular/core"
import { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"
import { Child } from "./child.component"

function setup() {
   const children = use<Child>(ViewChildren)

   subscribe(children, (values) => {
      for (const child of values) {
         console.log(child)
      }
   })

   return {
      children,
   }
}

@Component({
   queries: {
      children: new ViewChildren(Child)
   }
})
export class MyComponent extends ViewDef(setup) {}
```
