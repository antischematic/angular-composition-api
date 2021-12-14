import { Command, Query, Store } from "@mmuscat/angular-phalanx"
import {
   ActivatedRoute,
   NavigationExtras,
   Router,
   UrlTree,
} from "@angular/router"
import { switchMap } from "rxjs/operators"
import { Emitter, inject, use } from "@mmuscat/angular-composition-api"

export type NavigateParams = [commands: any[], extras?: NavigationExtras]
export type NavigateByUrlParams = [
   commands: string | UrlTree,
   extras?: NavigationExtras,
]

export const Navigate = new Command(
   "navigate",
   (action: Emitter<NavigateParams>) => {
      const router = inject(Router)
      return action.pipe(switchMap((params) => router.navigate(...params)))
   },
)
export const NavigateByUrl = new Command(
   "navigateByUrl",
   (action: Emitter<NavigateByUrlParams>) => {
      const router = inject(Router)
      return action.pipe(switchMap((params) => router.navigateByUrl(...params)))
   },
)

export const RouteData = new Query("data", () => {
   const route = inject(ActivatedRoute)
   return use(route.data, { initial: route.snapshot.data })
})

export const RouteParams = new Query("params", () => {
   const route = inject(ActivatedRoute)
   return use(route.params, { initial: route.snapshot.params })
})

export const RouteParamMap = new Query("paramMap", () => {
   const route = inject(ActivatedRoute)
   return use(route.paramMap, { initial: route.snapshot.paramMap })
})

export const RouteFragment = new Query("fragment", () => {
   const route = inject(ActivatedRoute)
   return use(route.fragment, { initial: route.snapshot.fragment })
})

export const RouteQueryParams = new Query("queryParams", () => {
   const route = inject(ActivatedRoute)
   return use(route.queryParams, { initial: route.snapshot.queryParams })
})

export const RouteQueryParamMap = new Query("queryParamMap", () => {
   const route = inject(ActivatedRoute)
   return use(route.queryParamMap, { initial: route.snapshot.queryParamMap })
})

export const RouteUrl = new Query("url", () => {
   const route = inject(ActivatedRoute)
   return use(route.url, { initial: route.snapshot.url })
})

export const RouterStore = new Store("router", {
   tokens: [
      Navigate,
      NavigateByUrl,
      RouteData,
      RouteParams,
      RouteParamMap,
      RouteFragment,
      RouteQueryParams,
      RouteQueryParamMap,
      RouteUrl,
   ],
})
