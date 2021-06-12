import {Observable, PartialObserver, Subscription, SubscriptionLike, TeardownLogic} from "rxjs";
import {ElementRef, Renderer2} from "@angular/core";
import {Subscribe} from "./common";
import {Inject} from "./core";

export function HostListener<T>(eventName: string): Observable<T>
export function HostListener<T>(eventName: string, observer: PartialObserver<T> | (() => TeardownLogic)): Subscription
export function HostListener<T>(eventName: string, observer?: PartialObserver<T> | (() => TeardownLogic)): Observable<T> | SubscriptionLike {
    const renderer = Inject(Renderer2)
    const element = Inject(ElementRef)
    const parts = eventName.split(":").reverse()
    const [event, target = element.nativeElement] = parts
    const source = new Observable<T>((subscriber) => renderer.listen(target, event, (event) => subscriber.next(event)))
    if (observer) {
        return Subscribe(source, observer)
    } else {
        return new Observable((subscriber) => renderer.listen(target, event, (event) => subscriber.next(event)))
    }
}

export function HostBinding(target: string, source: Observable<string>) {
    const renderer = Inject(Renderer2)
    const { nativeElement } = Inject(ElementRef)
    const parts = target.split(".")
    let observer: (value: string) => any
    if (parts.length === 1) {
        observer = (value) => renderer.setProperty(nativeElement, parts[0], value)
    } else {
        switch (parts[0]) {
            case "attr": {
                const attr = parts[1].split(":")
                const attrName = attr[1] ?? attr[0]
                const namespace = attr[0]
                observer = (value) => value === null ? renderer.removeAttribute(nativeElement, attrName, namespace) : renderer.setAttribute(nativeElement, attrName, value, namespace)
                break
            }
            case "style": {
                observer = (value) => value === null ? renderer.removeStyle(nativeElement, parts[1]) : renderer.setStyle(nativeElement, parts[1], value)
                break
            }
            case "class": {
                observer = (value) => value ? renderer.addClass(nativeElement, parts[1]) : renderer.removeClass(nativeElement, parts[1])
                break
            }
            default: {
                throw new Error(`Host binding target "${parts[0]}" is not supported`)
            }
        }
    }
    return Subscribe(source, observer)
}
