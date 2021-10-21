# Angular Composition API

Composition model for functional reactive Angular applications.

**Features**

-  Small bundle size (4kb min gzipped)
-  Minimal API
-  Granular change detection
-  Better-than `OnPush` performance
-  Optional Zone.js
-  Observable inputs and queries
-  Reactive two-way bindings
-  Composable components, directives and services
-  Composable providers
-  Composable subscriptions
-  Lifecycle hooks
-  Computed values
-  Automatic teardown
-  RxJS interop (v6 and v7)
-  Incrementally adoptable

**What it looks like**

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

@Component({
   inputs: ["count"],
})
export class MyComponent extends ViewDef(setup) {}
```

## Quick Start

[Install via NPM](https://www.npmjs.com/package/@mmuscat/angular-composition-api)

```bash
npm install @mmuscat/angular-composition-api
```

[Install via Yarn](https://yarnpkg.com/package/@mmuscat/angular-composition-api)

```bash
yarn add @mmuscat/angular-composition-api
```

### Setup

Provide `ZonelessEventManager` in your root module. This is required 
for proper change detection in event handlers.

```ts
@NgModule({
   providers: [
      {
         provide: EventManager,
         useClass: ZonelessEventManager,
      },
   ],
})
export class AppModule {}
```

## Api Reference

<big>

[Read the docs](https://mmuscat.github.io/angular-composition-api/docs/intro)

</big>
