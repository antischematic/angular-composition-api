"use strict";(self.webpackChunkpackages_docs=self.webpackChunkpackages_docs||[]).push([[690],{3905:function(e,n,t){t.d(n,{Zo:function(){return p},kt:function(){return d}});var i=t(7294);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function o(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);n&&(i=i.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,i)}return t}function r(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?o(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function l(e,n){if(null==e)return{};var t,i,a=function(e,n){if(null==e)return{};var t,i,a={},o=Object.keys(e);for(i=0;i<o.length;i++)t=o[i],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(i=0;i<o.length;i++)t=o[i],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var s=i.createContext({}),u=function(e){var n=i.useContext(s),t=n;return e&&(t="function"==typeof e?e(n):r(r({},n),e)),t},p=function(e){var n=u(e.components);return i.createElement(s.Provider,{value:n},e.children)},c={inlineCode:"code",wrapper:function(e){var n=e.children;return i.createElement(i.Fragment,{},n)}},m=i.forwardRef((function(e,n){var t=e.components,a=e.mdxType,o=e.originalType,s=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),m=u(t),d=a,h=m["".concat(s,".").concat(d)]||m[d]||c[d]||o;return t?i.createElement(h,r(r({ref:n},p),{},{components:t})):i.createElement(h,r({ref:n},p))}));function d(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var o=t.length,r=new Array(o);r[0]=m;var l={};for(var s in n)hasOwnProperty.call(n,s)&&(l[s]=n[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,r[1]=l;for(var u=2;u<o;u++)r[u]=t[u];return i.createElement.apply(null,r)}return i.createElement.apply(null,t)}m.displayName="MDXCreateElement"},2370:function(e,n,t){t.r(n),t.d(n,{frontMatter:function(){return l},contentTitle:function(){return s},metadata:function(){return u},toc:function(){return p},default:function(){return m}});var i=t(7462),a=t(3366),o=(t(7294),t(3905)),r=["components"],l={sidebar_position:3},s="Views",u={unversionedId:"views",id:"views",isDocsHomePage:!1,title:"Views",description:"Views are the basic building block for reactive components.",source:"@site/docs/views.md",sourceDirName:".",slug:"/views",permalink:"/angular-composition-api/docs/views",editUrl:"https://github.com/mmuscat/angular-composition-api/tree/master/docs/views.md",tags:[],version:"current",sidebarPosition:3,frontMatter:{sidebar_position:3},sidebar:"tutorialSidebar",previous:{title:"Setup",permalink:"/angular-composition-api/docs/setup"},next:{title:"Services",permalink:"/angular-composition-api/docs/services"}},p=[{value:"Change Detection",id:"change-detection",children:[]},{value:"Inputs",id:"inputs",children:[]},{value:"Outputs",id:"outputs",children:[]},{value:"Queries",id:"queries",children:[]},{value:"Listeners",id:"listeners",children:[{value:"Host Listener",id:"host-listener",children:[]},{value:"DOM Listener",id:"dom-listener",children:[]}]},{value:"Attributes",id:"attributes",children:[]},{value:"Two-way Binding",id:"two-way-binding",children:[]}],c={toc:p};function m(e){var n=e.components,t=(0,a.Z)(e,r);return(0,o.kt)("wrapper",(0,i.Z)({},c,t,{components:n,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"views"},"Views"),(0,o.kt)("p",null,"Views are the basic building block for reactive components."),(0,o.kt)("div",{className:"admonition admonition-info alert alert--info"},(0,o.kt)("div",{parentName:"div",className:"admonition-heading"},(0,o.kt)("h5",{parentName:"div"},(0,o.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,o.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,o.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"info")),(0,o.kt)("div",{parentName:"div",className:"admonition-content"},(0,o.kt)("p",{parentName:"div"},"While most of the documentation refers to components, the same features are supported by directives too."))),(0,o.kt)("p",null,"Views are created using ",(0,o.kt)("inlineCode",{parentName:"p"},"ViewDef"),", which accepts a setup function that initializes component state."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: A basic view"',title:'"Example:',A:!0,basic:!0,'view"':!0},'import { Component } from "@angular/core"\nimport { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const count = use(0)\n\n   subscribe(count, console.log)\n\n   return {\n      count,\n   }\n}\n\n@Component({\n   selector: "my-component",\n   template: `{{ count }}`,\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("p",null,"Values returned from the setup function are automatically unwrapped. For example, ",(0,o.kt)("inlineCode",{parentName:"p"},"Value<number>")," becomes ",(0,o.kt)("inlineCode",{parentName:"p"},"number")," when\nexamined by the component instance. Inputs and queries are automatically synced with the view."),(0,o.kt)("h2",{id:"change-detection"},"Change Detection"),(0,o.kt)("p",null,"Change detection occurs in the following scenarios (assuming ",(0,o.kt)("inlineCode",{parentName:"p"},"OnPush")," strategy):"),(0,o.kt)("ul",null,(0,o.kt)("li",{parentName:"ul"},"On first render."),(0,o.kt)("li",{parentName:"ul"},"When inputs change."),(0,o.kt)("li",{parentName:"ul"},"When an event binding is executed."),(0,o.kt)("li",{parentName:"ul"},"When ",(0,o.kt)("inlineCode",{parentName:"li"},"subscribe")," emits a value, after the observer is called.")),(0,o.kt)("p",null,"Updates to reactive state are not immediately reflected in the view. If you need an immediate update,\ncall ",(0,o.kt)("inlineCode",{parentName:"p"},"detectChanges")," after updating a value."),(0,o.kt)("p",null,"Change detection might ",(0,o.kt)("em",{parentName:"p"},"not")," occur when:"),(0,o.kt)("ul",null,(0,o.kt)("li",{parentName:"ul"},"Imperatively mutating fields on the component instance."),(0,o.kt)("li",{parentName:"ul"},"Imperatively calling state mutating methods on the component instance. Unless the mutated state has a ",(0,o.kt)("inlineCode",{parentName:"li"},"subscribe"),"\nobserver, this will not trigger a change detection run."),(0,o.kt)("li",{parentName:"ul"},"Mutating state inside asynchronous callbacks such as ",(0,o.kt)("inlineCode",{parentName:"li"},"setTimeout")," or ",(0,o.kt)("inlineCode",{parentName:"li"},"Promise")," (use ",(0,o.kt)("inlineCode",{parentName:"li"},"subscribe")," instead)")),(0,o.kt)("h2",{id:"inputs"},"Inputs"),(0,o.kt)("p",null,"Inputs are declared on the ",(0,o.kt)("inlineCode",{parentName:"p"},"inputs")," component metadata array. The name of the input must have a matching ",(0,o.kt)("inlineCode",{parentName:"p"},"Value")," key on\nthe object returned from a ",(0,o.kt)("inlineCode",{parentName:"p"},"ViewDef"),"."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Input binding"',title:'"Example:',Input:!0,'binding"':!0},'import { Component } from "@angular/core"\nimport { use, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const count = use(0)\n\n   return {\n      count,\n   }\n}\n\n@Component({\n   inputs: ["count"],\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("h2",{id:"outputs"},"Outputs"),(0,o.kt)("p",null,"Outputs are declared on the ",(0,o.kt)("inlineCode",{parentName:"p"},"outputs")," component metadata array. The name of the output must have a matching ",(0,o.kt)("inlineCode",{parentName:"p"},"Observable"),"\nkey on the object returned from ",(0,o.kt)("inlineCode",{parentName:"p"},"ViewDef"),"."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Output binding"',title:'"Example:',Output:!0,'binding"':!0},'import { Component } from "@angular/core"\nimport { use, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const increment = use<void>(Function)\n\n   return {\n      increment,\n   }\n}\n\n@Component({\n   outputs: ["increment"],\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("h2",{id:"queries"},"Queries"),(0,o.kt)("p",null,"Content queries, view queries and query lists are configured the same way as inputs, using the ",(0,o.kt)("inlineCode",{parentName:"p"},"queries")," component\nmetadata. These values are readonly."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Content child query"',title:'"Example:',Content:!0,child:!0,'query"':!0},'import { ContentChild, Component } from "@angular/core"\nimport { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"\nimport { Child } from "./child.component"\n\nfunction setup() {\n   const child = use<Child>(ContentChild)\n\n   subscribe(child, (value) => {\n      console.log(value)\n   })\n\n   return {\n      child,\n   }\n}\n\n@Component({\n   queries: {\n      child: new ContentChild(Child),\n   },\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: View children query"',title:'"Example:',View:!0,children:!0,'query"':!0},'import { Component, ViewChildren } from "@angular/core"\nimport { subscribe, use, ViewDef } from "@mmuscat/angular-composition-api"\nimport { Child } from "./child.component"\n\nfunction setup() {\n   const children = use<Child>(ViewChildren)\n\n   subscribe(children, (values) => {\n      for (const child of values) {\n         console.log(child)\n      }\n   })\n\n   return {\n      children,\n   }\n}\n\n@Component({\n   queries: {\n      children: new ViewChildren(Child),\n   },\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("h2",{id:"listeners"},"Listeners"),(0,o.kt)("p",null,"Use ",(0,o.kt)("inlineCode",{parentName:"p"},"listen")," to react to events that are emitted from a component template, DOM element or callback function. The event\nhandler can return ",(0,o.kt)("inlineCode",{parentName:"p"},"Teardown")," logic which is executed each time the handler is called. The return value is an ",(0,o.kt)("inlineCode",{parentName:"p"},"Emitter"),"\nthat can be used to invoke the listener and ",(0,o.kt)("inlineCode",{parentName:"p"},"subscribe")," to its events."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Basic callback with template binding"',title:'"Example:',Basic:!0,callback:!0,with:!0,template:!0,'binding"':!0},'import { Component } from "@angular/core"\nimport { listen, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const handleClick = listen<Event>((event) => {\n      console.log(event)\n\n      return () => {\n         // Teardown logic\n      }\n   })\n\n   return {\n      handleClick,\n   }\n}\n\n@Component({\n   template: ` <button (click)="handleClick($event)">Click</button> `,\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("div",{className:"admonition admonition-tip alert alert--success"},(0,o.kt)("div",{parentName:"div",className:"admonition-heading"},(0,o.kt)("h5",{parentName:"div"},(0,o.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,o.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"12",height:"16",viewBox:"0 0 12 16"},(0,o.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.5 0C3.48 0 1 2.19 1 5c0 .92.55 2.25 1 3 1.34 2.25 1.78 2.78 2 4v1h5v-1c.22-1.22.66-1.75 2-4 .45-.75 1-2.08 1-3 0-2.81-2.48-5-5.5-5zm3.64 7.48c-.25.44-.47.8-.67 1.11-.86 1.41-1.25 2.06-1.45 3.23-.02.05-.02.11-.02.17H5c0-.06 0-.13-.02-.17-.2-1.17-.59-1.83-1.45-3.23-.2-.31-.42-.67-.67-1.11C2.44 6.78 2 5.65 2 5c0-2.2 2.02-4 4.5-4 1.22 0 2.36.42 3.22 1.19C10.55 2.94 11 3.94 11 5c0 .66-.44 1.78-.86 2.48zM4 14h5c-.23 1.14-1.3 2-2.5 2s-2.27-.86-2.5-2z"}))),"tip")),(0,o.kt)("div",{parentName:"div",className:"admonition-content"},(0,o.kt)("p",{parentName:"div"},"The callback function for ",(0,o.kt)("inlineCode",{parentName:"p"},"listen")," can be composed with ",(0,o.kt)("inlineCode",{parentName:"p"},"subscribe"),". Nested subscriptions are automatically cleaned up\neach time the listener is called and when the view is destroyed."),(0,o.kt)("pre",{parentName:"div"},(0,o.kt)("code",{parentName:"pre",className:"language-ts"},"listen((event) => {\n   subscribe(doSomethingAsync(event), {\n      next(result) {\n         console.log(result)\n      },\n   })\n})\n")))),(0,o.kt)("h3",{id:"host-listener"},"Host Listener"),(0,o.kt)("p",null,"Views can ",(0,o.kt)("inlineCode",{parentName:"p"},"listen")," to named events on the host element, including special event targets such as ",(0,o.kt)("inlineCode",{parentName:"p"},"document")," and\n",(0,o.kt)("inlineCode",{parentName:"p"},"window"),". The listener is automatically cleaned up when the view is destroyed."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Host listener"',title:'"Example:',Host:!0,'listener"':!0},'import { Component } from "@angular/core"\nimport { listen, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   listen<MouseEvent>("click", (event) => {\n      console.log("clicked!", event)\n   })\n\n   listen("window:scroll", () => {\n      console.log("scrolling!")\n   })\n\n   return {}\n}\n\n@Component()\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("h3",{id:"dom-listener"},"DOM Listener"),(0,o.kt)("p",null,"Views can ",(0,o.kt)("inlineCode",{parentName:"p"},"listen")," to events from arbitrary DOM elements. The listener is automatically cleaned up when the view is\ndestroyed."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: DOM element listener"',title:'"Example:',DOM:!0,element:!0,'listener"':!0},'import { Component } from "@angular/core"\nimport { listen, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const button = use<HTMLElement>()\n\n   listen<MouseEvent>(button, "click", (event) => {\n      console.log("clicked!", event)\n   })\n\n   return {\n      button,\n   }\n}\n\n@Component({\n   template: ` <button #button>Click</button> `,\n   queries: {\n      button: new ViewChild("button", { static: true }),\n   },\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("h2",{id:"attributes"},"Attributes"),(0,o.kt)("p",null,"To get static attributes during component creation, use the ",(0,o.kt)("inlineCode",{parentName:"p"},"attribute")," selector. This is useful when casting boolean\nattributes, for example. The second argument is a function used to cast the attribute value to another type."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Boolean attributes"',title:'"Example:',Boolean:!0,'attributes"':!0},'import { Component } from "@angular/core"\nimport { attribute, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const disabled = attribute("disabled", Boolean)\n   \n   return {\n      disabled\n   }\n}\n\n@Component({\n   selector: \'my-button\',\n   template: `\n      <button [disabled]="disabled">\n         <ng-content></ng-content>\n      </button>\n   `,\n   inputs: ["disabled"]\n})\nexport class ButtonComponent extends ViewDef(setup) {}\n')),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-html",metastring:'title="Example: Boolean attribute usage"',title:'"Example:',Boolean:!0,attribute:!0,'usage"':!0},"<my-button disabled></button>\n")),(0,o.kt)("h2",{id:"two-way-binding"},"Two-way Binding"),(0,o.kt)("p",null,"Two-way bindings be created with a ",(0,o.kt)("inlineCode",{parentName:"p"},"Value")," and ",(0,o.kt)("inlineCode",{parentName:"p"},"Emitter")," combination."),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre",className:"language-ts",metastring:'title="Example: Two-way binding"',title:'"Example:',"Two-way":!0,'binding"':!0},'import { Component } from "@angular/core"\nimport { listen, use, ViewDef } from "@mmuscat/angular-composition-api"\n\nfunction setup() {\n   const count = use(0)\n   const countChange = listen(count)\n\n   function increment() {\n      countChange(count() + 1)\n   }\n\n   return {\n      increment,\n      count,\n      countChange,\n   }\n}\n\n@Component({\n   inputs: ["count"],\n   outputs: ["countChange"],\n})\nexport class MyComponent extends ViewDef(setup) {}\n')),(0,o.kt)("p",null,"When ",(0,o.kt)("inlineCode",{parentName:"p"},"countChange")," is invoked, this will also update the value of ",(0,o.kt)("inlineCode",{parentName:"p"},"count"),". Conversely, updates to ",(0,o.kt)("inlineCode",{parentName:"p"},"count")," via its input\nbinding will not trigger ",(0,o.kt)("inlineCode",{parentName:"p"},"countChange"),"."))}m.isMDXComponent=!0}}]);