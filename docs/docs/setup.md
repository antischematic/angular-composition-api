---
sidebar_position: 2
---

# Get Started

Install via NPM

```bash
npm install @mmuscat/angular-composition-api
```

Install via Yarn

```bash
yarn add @mmuscat/angular-composition-api
```

## Setup

After the package is installed, provide `ZonelessEventManager` in the root module of your application. This is required
for proper change detection in Angular template event handlers, even when zones are enabled.

```ts
import { ZonelessEventManager } from "@mmuscat/angular-composition-api"
import { EventManager, NgModule } from "@angular/core"

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
