---
sidebar_position: 7
---

# Lifecycle Hooks

Angular Composition API provides a layer of abstraction on top of Angular's change detection cycle. As a result not
all lifecycle hooks have an equivalent representation. There are also some additional lifecycles that are not present
in standard Angular components. The table below lists each standard lifecycle hook and their composition API equivalent
where applicable.

| Standard              | Composition API |
| --------------------- | --------------- |
| constructor           | ViewDef/Service |
| ngOnChanges           | beforeUpdate    |
| ngOnInit              | N/A             |
| ngDoCheck             | N/A             |
| ngAfterContentInit    | N/A             |
| ngAfterContentChecked | N/A             |
| ngAfterViewInit       | subscribe       |
| ngAfterViewChecked    | onUpdated       |
| ngOnDestroy           | onDestroy       |

## Composition Lifecycle

The examples below illustrate the lifecycle for components, directives and services.

### Components

:::info
The `beforeUpdate` and `onUpdated` lifecycle hooks are only available in components and directives.
:::

```ts
import { Component } from "@angular/core"
import {
   beforeUpdate,
   onDestroy,
   onUpdated,
   subscribe,
   use,
   ViewDef,
} from "@mmuscat/angular-composition-api"

function setup() {
   const count = use(0)

   subscribe(count, () => {
      // <3>
      return () => {
         // <4>
      }
   })

   beforeUpdate(() => {
      // <5>
   })

   onUpdated(() => {
      // <6>
   })

   onDestroy(() => {
      // <7>
   })

   return {
      count, // <1>
   }
}

@Component({
   inputs: ["count"], // <2>
})
export class MyComponent extends ViewDef(setup) {}
```

1. During component creation any `Value` returned from the setup function is unwrapped and synchronised with the
   component instance.

2. Inputs and queries are automatically checked and synchronised with a matching `Value` by name.

3. Subscriptions are subscribed to once the component has been mounted. The component template is checked once
   immediately and each time after a subscription emits a value.

4. `TeardownLogic` returned from a `subscribe` observer is executed each time the observer receives a new value, or
   the subscription ends.

5. Executed after component state mutation, just before the component template updates. Compared with
   `ngOnChanges` this is not just limited to `inputs`.

6. Executed after the component template updated. Compared with `ngAfterViewInit`, this will only run once per render
   cycle.

7. Executed once when the component is destroyed.

:::tip

The `onBeforeUpdate` and `onUpdated` lifecycle hooks can also be used as observables

```ts
const beforeUpdate = onBeforeUpdate()

subscribe(beforeUpdate, () => {
   // mutate state
})
```

:::

### Directives

Directives share the same lifecycle as components.

### Services

```ts
import { Service, use } from "@mmuscat/angular-composition-api"

function myService() {
   const count = use(0)

   subscribe(count, () => {
      // <2>
      return () => {
         // <3>
      }
   })

   onDestroy(() => {
      // <4>
   })

   return {
      count, // <1>
   }
}

export const MyService = new Service(myService)
```

1. During service creation no special treatment is given to `Value`, it is returned as given.

2. Subscriptions work the same way as components, except they are subscribed to immediately after the setup function
   has run.

3. `TeardownLogic` runs when the observer receives a new value, or the subscription ends.

4. Executed once when the service is destroyed.
