---
sidebar_position: 8
---

# Zone.js

## Improve runtime performance with `zone.js` partial opt-out. 

Application performance can be further optimised by disabling parts of zone.js.

Next to `polyfills.ts`, create a `zone-flags.ts` with the following content:

```ts title="zone-flags.ts (recommended)"
(window as any).__Zone_disable_MessagePort = true;
(window as any).__Zone_disable_notification = true;
(window as any).__Zone_disable_mediaQuery = true;
(window as any).__Zone_disable_geolocation = true;
(window as any).__Zone_disable_XHR = true;
(window as any).__Zone_enable_cross_context_check = true;
(window as any).__Zone_disable_IE_check = true;
(window as any).__Zone_disable_canvas = true;
(window as any).__Zone_disable_FileReader = true;
(window as any).__Zone_disable_IntersectionObserver = true;
(window as any).__Zone_disable_MutationObserver = true;
(window as any).__Zone_disable_blocking = true;
(window as any).__Zone_disable_on_property = true;
(window as any).__Zone_disable_requestAnimationFrame = true;
(window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'mousemove'];
```

Then import this file before importing `zone.js`. If you encounter change detection issues, try commenting out one or
more of these flags until it is fixed.

```ts title="polyfills.ts"
import "./zone-flags"
import "zone.js" // Included with Angular CLI.
```

At the moment opting out of zone.js entirely is not recommended. Many libraries such as Angular Material depend on it to
function correctly. This project will align with Angular's zone.js opt-out milestone as more details become available.
