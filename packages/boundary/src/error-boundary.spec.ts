import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {ChangeDetectorRef, Component, DebugElement, EventEmitter, ErrorHandler, Inject, InjectionToken, Type} from "@angular/core";
import {BoundaryModule} from "./boundary.module";
import {ErrorBoundary} from "./error-boundary";
import {By} from "@angular/platform-browser";
import createSpy = jasmine.createSpy;

const styles = `
    :host {
        padding: 40px;   
    }
    .ng-cloak {
        display: none
    }
`

@Component({
    template: `
        <error-boundary (error)="errorListener.next($event)">
            <test-subject *catchError></test-subject>
            <div fallback>Fallback</div>
        </error-boundary>
    `,
    styles: [styles]
})
class Host {
    errorListener = new EventEmitter<any>()
}

@Component({
    template: `
        <error-boundary>
            <test-subject></test-subject>
        </error-boundary>
    `,
    styles: [styles]
})
class HostWithoutCatchOrFallback {}

@Component({
    template: `
        <error-boundary>
            <test-subject *catchError></test-subject>
            <div *fallback>Fallback</div>
        </error-boundary>
    `,
    styles: [styles]
})
class HostWithTemplate {}

@Component({
    template: `
        <error-boundary [fallback]="fallback">
            <test-subject *catchError></test-subject>
        </error-boundary>
        <ng-template #fallback><div>Fallback ref</div></ng-template>
    `,
    styles: [styles]
})
class HostWithTemplateInput {}

@Component({
    template: `
        <error-boundary>
            <test-subject *catchError></test-subject>
            <custom-fallback fallback>Fallback ref</custom-fallback>
        </error-boundary>
    `,
    styles: [styles]
})
class HostWithComponent {}

@Component({
    template: `
        <error-boundary [fallback]="CustomFallback">
            <test-subject *catchError></test-subject>
        </error-boundary>
    `,
    styles: [styles]
})
class HostWithComponentInput {
    CustomFallback = CustomFallback
}

@Component({
    template: `
        <error-boundary>
            <test-subject *catchError></test-subject>
            <div fallback>Fallback</div>
        </error-boundary>
    `,
    styles: [styles]
})
class HostWithElement {}

@Component({
    template: `
        <error-boundary [fallback]="fallback">
            <test-subject *catchError></test-subject>
        </error-boundary>
        <div #fallback></div>
    `,
    styles: [styles]
})
class HostWithElementInput {}

@Component({
    selector: "custom-fallback",
    template: `Fallback`
})
export class CustomFallback {}

class TestError extends Error {}

const Counter = new InjectionToken("Counter")

@Component({
    selector: `test-subject`,
    template: `{{ fail.if.not.exists }}`
})
export class TestSubject {
    createCount: number
    fail: any = { if: { not: { exists: true }}}
    breakTemplate(imperativeChangeDetection: boolean) {
        this.fail = true
        if (imperativeChangeDetection) {
            try {
                this.changeDetectorRef.detectChanges()
            } catch (error) {
                this.errorHandler.handleError(error)
            }
        }
    }
    handleAsyncError() {
        setTimeout(() =>  {
            this.errorHandler.handleError(new TestError())
        })
    }
    constructor(private errorHandler: ErrorHandler, private changeDetectorRef: ChangeDetectorRef, @Inject(Counter) private counter: { count: number }) {
        this.createCount = counter.count++
    }
}

function defineBoundary(Host: Type<any>) {
    TestBed.configureTestingModule({
        imports: [BoundaryModule],
        declarations: [
            Host,
            TestSubject,
            CustomFallback,
            HostWithTemplate,
            HostWithTemplateInput,
            HostWithComponent,
            HostWithComponentInput,
            HostWithElement,
            HostWithElementInput,
        ],
        providers: [{
            provide: Counter,
            useValue: {
                count: 1
            }
        }]
    })

    return function createBoundary() {
        return TestBed.createComponent(Host)
    }
}

function getErrorBoundary(host: ComponentFixture<any>) {
    return host.debugElement.query(By.directive(ErrorBoundary))
}

function getErrorBoundaryInstance(host: ComponentFixture<any>) {
    return getErrorBoundary(host).injector.get(ErrorBoundary)
}

function getTestSubject(host: ComponentFixture<any>): DebugElement {
    return host.debugElement.query(By.directive(TestSubject))
}

function getFallback(host: ComponentFixture<any>) {
    return host.debugElement.query(By.css("div"))
}

function getCustomFallback(host: ComponentFixture<any>) {
    return host.debugElement.query(By.directive(CustomFallback))
}

describe("ErrorBoundary", () => {
    it("should create", () => {
        const createBoundary = defineBoundary(Host)
        expect(createBoundary).not.toThrow()
    })
    it("should cloak fallback on first render", () => {
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        expect(getFallback(boundary).nativeElement).toHaveClass("ng-cloak")
    })
    it("should show content on first render", () => {
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        expect(subject).toBeTruthy()
        expect(subject.nativeElement).not.toHaveClass("ng-cloak")
    })
    it("should cloak when an error is caught", async () => {
        const logger = spyOn(console, "error")
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        subject.componentInstance.breakTemplate()
        boundary.changeDetectorRef.detectChanges()
        expect(getErrorBoundary(boundary).nativeElement).toHaveClass("ng-cloak")
        expect(logger).toHaveBeenCalledWith('ERROR', new TypeError("Cannot read property 'not' of undefined"))
    })
    it("should show fallback when error is caught", () => {
        const logger = spyOn(console, "error")
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        subject.componentInstance.breakTemplate()
        boundary.changeDetectorRef.detectChanges()
        expect(getFallback(boundary).nativeElement).not.toHaveClass("ng-cloak")
        expect(logger).toHaveBeenCalledWith('ERROR', new TypeError("Cannot read property 'not' of undefined"))
    })
    it("should show fallback when async error is handled", fakeAsync(() => {
        const logger = spyOn(console, "error")
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        subject.componentInstance.handleAsyncError()
        tick()
        expect(getFallback(boundary).nativeElement).not.toHaveClass("ng-cloak")
        expect(logger).toHaveBeenCalledWith('ERROR', new TestError())
    }))
    it("should reset error state once", () => {
        const logger = spyOn(console, "error")
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        const errorBoundary = getErrorBoundary(boundary)
        const fallback = getFallback(boundary)
        subject.componentInstance.breakTemplate()
        boundary.detectChanges()
        const instance = getErrorBoundaryInstance(boundary)
        instance.reset()
        instance.reset()
        instance.reset()
        const newSubject = getTestSubject(boundary)
        expect(newSubject).not.toBe(subject)
        expect(newSubject.injector.get(TestSubject).createCount).toBe(2)
        expect(errorBoundary.nativeElement).not.toHaveClass("ng-cloak")
        expect(fallback.nativeElement).toHaveClass("ng-cloak")
        expect(logger).toHaveBeenCalledTimes(2)
    })
    it("should reset error state once (event object)", () => {
        spyOn(console, "error")
        const spy = createSpy()
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        boundary.componentInstance.errorListener.subscribe((error: any) => {
            spy()
            error.reset()
            error.reset()
            error.reset()
        })
        subject.componentInstance.breakTemplate()
        boundary.detectChanges()
        const newSubject = getTestSubject(boundary)
        expect(newSubject).not.toBe(subject)
        expect(newSubject.injector.get(TestSubject).createCount).toBe(2)
        expect(spy).toHaveBeenCalledTimes(1)
    })
    it("should catch errors with imperative change detection", async () => {
        const logger = spyOn(console, "error")
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const subject = getTestSubject(boundary)
        subject.componentInstance.breakTemplate(true)
        expect(getErrorBoundary(boundary).nativeElement).toHaveClass("ng-cloak")
        expect(logger).toHaveBeenCalledWith("ERROR", new TypeError("Cannot read property 'not' of undefined"))
    })
})
function testDomElement(type: any) {
    const createBoundary = defineBoundary(type)
    const boundary = createBoundary()
    boundary.detectChanges()
    expect(getFallback(boundary).nativeElement).toHaveClass("ng-cloak")
    getTestSubject(boundary).componentInstance.breakTemplate()
    boundary.detectChanges()
    expect(getFallback(boundary).nativeElement).not.toHaveClass("ng-cloak")
}

function testTemplate(type: any) {
    const createBoundary = defineBoundary(HostWithTemplateInput)
    const boundary = createBoundary()
    boundary.detectChanges()
    expect(getFallback(boundary)).not.toBeTruthy()
    getTestSubject(boundary).componentInstance.breakTemplate()
    boundary.detectChanges()
    expect(getFallback(boundary)).toBeTruthy()
}

function testComponent(type: any, isRef: boolean) {
    const createBoundary = defineBoundary(type)
    const boundary = createBoundary()
    boundary.detectChanges()
    expect(!!getCustomFallback(boundary)).toBe(isRef)
    getTestSubject(boundary).componentInstance.breakTemplate()
    boundary.detectChanges()
    expect(getCustomFallback(boundary)).toBeTruthy()
}

describe("Fallback", () => {
    beforeEach(() => {
        spyOn(console, "error")
    })
    it("should render dom input", () => {
        testDomElement(HostWithElementInput)
    })
    it("should render dom ref", () => {
        testDomElement(HostWithElement)
    })
    it("should render template input", () => {
        testTemplate(HostWithTemplateInput)
    })
    it("should render template ref", () => {
        testTemplate(HostWithTemplate)
    })
    it("should render component input", () => {
        testComponent(HostWithComponentInput, false)
    })
    it("should render component ref", () => {
        testComponent(HostWithComponent, true)
    })
})

describe("CatchError", () => {
    it("should work if omitted", () => {
        const createBoundary = defineBoundary(HostWithoutCatchOrFallback)
        const boundary = createBoundary()
        expect(() => boundary.detectChanges()).not.toThrow()
        getTestSubject(boundary).componentInstance.breakTemplate()
        expect(() => boundary.detectChanges()).toThrow()
    })
})