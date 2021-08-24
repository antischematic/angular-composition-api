# Angular Resource

Remote data streams for Angular.

## Quick Start

Install via NPM

```bash
npm install @mmuscat/angular-resource
```

Install via Yarn

```bash
yarn add @mmuscat/angular-resource
```

### Example

```ts
class Props {
   static create() {
      const user = Resource("/api/user", source)
      return {
         user,
      }
   }
}

@Component({
   template: `
      <div *ngIf="user.error">Failed to load</div>
      <div *ngIf="user.pending">Loading...</div>
      <div *ngIf="user.value">hello {user.value.name}!</div>
   `,
})
export class Profile extends State(Props) {}
```

## Api Reference

### Resource

Creates a `ResourceSubject` that subscribes to a data source, updating itself as the data stream progresses from its
initial state to completion. Subscribers to
`ResourceSubject` will receive `ResourceSubject` notifications each time the internal state changes. The data source is
not subscribed until there is at least one observer, and is disposed when there are no more observers.

```ts
function create() {
   const user = Resource("/api/user", source)

   Subscribe(user, () => {
      console.log(user.value)
      console.log(user.pending)
      console.log(user.error)
   })

   return {
      user,
   }
}
```

Usage with params

```ts
function source(url: string) {
   const http = Inject(HttpClient)
   return switchMap((params) =>
      http.get(url, {
         params,
      }),
   )
}

class Props {
   userId = Value<string>()
   static create = create
}

function create({ userId }: Props) {
   const user = Resource(["/api/user", { userId }], source)

   Subscribe(user, () => {
      console.log(user.value)
      console.log(user.pending)
      console.log(user.error)
   })

   return {
      user,
   }
}
```

#### method `mutate`

Invalidates the resource cache and replays its last action. TBD.

```ts
function create({ userId }: Props) {
   const user = Resource(["/api/user", userId], source)

   user.mutate()

   return {
      user,
   }
}
```

#### method `subscribe`

Subscribes an observer to state changes. TBD.

### mutate

A global function that will invalidate all active resources that match the given `key` argument, replaying each
invalidated resource's last action. TBD.

```ts
function create({ userId }: Props) {
   const user = Resource(["/api/user", userId], source)

   mutate("/api/user")

   return {
      user,
   }
}
```

## Cloak Mode

If `@mmuscat/angular-error-boundary` is installed, `Resource` can be configured with a cloak boundary that hides components
until at least one value has emitted. When used with reactive params, the cloak is activated each time the params
change, unless the value is already cached.

```ts
function create({ userId }: Props) {
   const user = Resource(["/api/user", userId], source, { cloak: true })

   return {
      user,
   }
}
```
