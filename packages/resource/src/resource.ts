import {Type} from "@angular/core";
import {Service, subscribe, use, Value, select} from "@mmuscat/angular-composition-api";
import {materialize, repeat, switchMap} from "rxjs/operators";
import {Notification} from "rxjs";

interface QueryStatic {
   new(factory: () => Function): Type<any>
}

class ResultObserver {
   next(result: Notification<any>) {
      switch (result.kind) {
         case "N": {
            this.value.next({
               value: result.value,
               pending: false,
               error: undefined
            })
            break
         }
      }
   }
   constructor(private value: Value<any>) {}
}

function queryFactory(factory: () => () => Function, config?: any) {
   const mapFunction = factory()
   return function query(...params: any[]) {
      const args = params[params.length - 2]
      const options = params[params.length - 1]
      const sink = subscribe()
      const value = use({
         value: options.initialValue,
         pending: false,
         error: undefined,
      })
      const fetch = use(Function)
      const result = fetch.pipe(
         switchMap(mapFunction),
         materialize(),
         repeat()
      )

      if (args) {
         sink.add(args.subscribe(fetch))
      }

      sink.add(result.subscribe(new ResultObserver(value)))

      return [value, fetch]
   }
}

function createQueryFactory(factory: () => Function, config?: any) {
   return new Service(queryFactory, {
      providedIn: "root",
      name: factory.name,
      arguments: [factory, config]
   })
}

export const Query: QueryStatic = createQueryFactory as any


function mutateFactory() {
   const subscribe = use()
   const next = use<void>(Function)
   const mutate = select({
      next,
      subscribe
   })

   subscribe(mutate)
   mutate()

   return mutate
}