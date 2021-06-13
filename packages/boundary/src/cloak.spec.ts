import {Component, ElementRef, Inject, InjectionToken, Input, Type} from "@angular/core";
import {
    ComponentFixture,
    discardPeriodicTasks,
    fakeAsync,
    flush,
    flushMicrotasks,
    TestBed,
    tick
} from "@angular/core/testing";
import {BoundaryModule} from "./boundary.module";
import {NG_CLOAK_CONFIG, NgCloak} from "./cloak";
import {asyncScheduler, Observable, queueScheduler, throwError, timer} from "rxjs";
import {delay, mapTo} from "rxjs/operators";
import {CommonModule} from "@angular/common";
import {By} from "@angular/platform-browser";
import {CustomFallback} from "./error-boundary.spec";
import {ErrorBoundary} from "./error-boundary";

const styles = `
    :host {
        padding: 40px;   
    }
    .ng-cloak {
        display: none
    }
`

@Component({
    selector: "test-subject",
    template: `{{ result | async }}`
})
class TestSubject {
    result!: Observable<number>
    @Input() delay: number = 0
    @Input() throwError?: boolean
    ngOnInit() {
        if (this.throwError) {
            this.result = this.boundary.cloak(throwError(new Error()))
        } else {
            this.result = this.boundary.cloak(timer(this.delay, this.delay ? asyncScheduler : queueScheduler)).pipe(mapTo(10))
        }
    }
    constructor(private boundary: NgCloak) {}
}

@Component({
    template: `
        <error-boundary>
            <ng-cloak *catchError>
                <test-subject [delay]="duration"></test-subject>
                <div fallback>Fallback</div>
            </ng-cloak>
            <div fallback>Fallback</div>
        </error-boundary>
    `,
    styles: [styles]
})
class Host {
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <error-boundary>
            <ng-cloak *catchError>
                <test-subject [delay]="duration" [throwError]="true"></test-subject>
                <div fallback>Fallback</div>
            </ng-cloak>
            <div fallback>Fallback</div>
        </error-boundary>
    `,
    styles: [styles]
})
class ErrorHost {
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <ng-cloak>
            <test-subject [delay]="duration"></test-subject>
            <div *fallback>Fallback</div>
        </ng-cloak>
    `,
    styles: [styles]
})
class HostWithTemplate {
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <ng-cloak [fallback]="fallback">
            <test-subject [delay]="duration"></test-subject>
        </ng-cloak>
        <ng-template #fallback><div>Fallback ref</div></ng-template>
    `,
    styles: [styles]
})
class HostWithTemplateInput {
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <ng-cloak>
            <test-subject [delay]="duration"></test-subject>
            <custom-fallback fallback>Fallback ref</custom-fallback>
        </ng-cloak>
    `,
    styles: [styles]
})
class HostWithComponent {
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <ng-cloak [fallback]="CustomFallback">
            <test-subject [delay]="duration"></test-subject>
        </ng-cloak>
    `,
    styles: [styles]
})
class HostWithComponentInput {
    CustomFallback = CustomFallback
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <ng-cloak>
            <test-subject [delay]="duration"></test-subject>
            <div fallback>Fallback</div>
        </ng-cloak>
    `,
    styles: [styles]
})
class HostWithElement {
    constructor(@Inject(DURATION) public duration: number) {}
}

@Component({
    template: `
        <ng-cloak [fallback]="fallback">
            <test-subject [delay]="duration"></test-subject>
        </ng-cloak>
        <div #fallback></div>
    `,
    styles: [styles]
})
class HostWithElementInput {
    constructor(@Inject(DURATION) public duration: number) {}
}

const DURATION = new InjectionToken("DURATION", {
    factory() {
        return 500
    }
})

function defineBoundary(Host: Type<any>) {
    TestBed.configureTestingModule({
        imports: [BoundaryModule, CommonModule],
        declarations: [
            Host,
            TestSubject,
            CustomFallback
        ],
    })

    return function createBoundary() {
        return TestBed.createComponent(Host)
    }
}

function getNgCloak(host: ComponentFixture<any>) {
    return host.debugElement.query(By.directive(NgCloak))
}

function getTestSubject(host: ComponentFixture<any>) {
    return host.debugElement.query(By.directive(TestSubject))
}

describe("NgCloak", () => {
    it("should create", () => {
        const createBoundary = defineBoundary(Host)
        expect(createBoundary).not.toThrow()
    })
    it("should render initial content", () => {
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        expect(getTestSubject(boundary)).toBeTruthy()
    })
    it("should wait a tick before cloaking", fakeAsync(() => {
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const cloak = getNgCloak(boundary)
        expect(cloak.nativeElement).not.toHaveClass("ng-cloak")
        tick()
        expect(cloak.nativeElement).toHaveClass("ng-cloak")
        discardPeriodicTasks()
    }))
    it("should cloak for 1 second", fakeAsync(() => {
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const cloak = getNgCloak(boundary)
        tick(0)
        expect(cloak.nativeElement).toHaveClass("ng-cloak")
        tick(1000)
        expect(cloak.nativeElement).not.toHaveClass("ng-cloak")
    }))
    it("should cloak for 1 second (min trailing time)", fakeAsync(() => {
        TestBed.overrideProvider(DURATION, { useValue: 50 })
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const cloak = getNgCloak(boundary)
        tick(0)
        expect(cloak.nativeElement).toHaveClass("ng-cloak")
        tick(50)
        expect(cloak.nativeElement).toHaveClass("ng-cloak")
        tick(950)
        expect(cloak.nativeElement).not.toHaveClass("ng-cloak")
    }))
    it("should cloak for 500 ms (no trailing time)", fakeAsync(() => {
        TestBed.overrideProvider(NG_CLOAK_CONFIG, { useValue: { leading: 0, trailing: 0 }})
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const cloak = getNgCloak(boundary)
        tick(0)
        expect(cloak.nativeElement).toHaveClass("ng-cloak")
        tick(500)
        expect(cloak.nativeElement).not.toHaveClass("ng-cloak")
    }))
    it("should not cloak if data is immediately available", fakeAsync(() => {
        TestBed.overrideProvider(DURATION, { useValue:  0 })
        const createBoundary = defineBoundary(Host)
        const boundary = createBoundary()
        boundary.detectChanges()
        const cloak = getNgCloak(boundary)
        tick(0)
        expect(cloak.nativeElement).not.toHaveClass("ng-cloak")
        discardPeriodicTasks()
    }))
    it("should handle errors", () => {
        spyOn(console, "error")
        const createBoundary = defineBoundary(ErrorHost)
        const boundary = createBoundary()
        boundary.detectChanges()
        const errorBoundary = getErrorBoundary(boundary)
        const cloak = getNgCloak(boundary)
        expect(cloak.nativeElement).not.toHaveClass("ng-cloak")
        expect(errorBoundary.injector.get(ElementRef).nativeElement).toHaveClass("ng-cloak")
        boundary.destroy()
    })
})

function getErrorBoundary(host: ComponentFixture<any>) {
    return host.debugElement.query(By.directive(ErrorBoundary))
}

function getFallback(host: ComponentFixture<any>) {
    return host.debugElement.query(By.css("div"))
}

function getCustomFallback(host: ComponentFixture<any>) {
    return host.debugElement.query(By.directive(CustomFallback))
}

function testDomElement(type: any) {
    const createBoundary = defineBoundary(type)
    const boundary = createBoundary()
    boundary.detectChanges()
    expect(getFallback(boundary).nativeElement).toHaveClass("ng-cloak")
    tick(0)
    expect(getFallback(boundary).nativeElement).not.toHaveClass("ng-cloak")
    discardPeriodicTasks()
}

function testTemplate(type: any) {
    const createBoundary = defineBoundary(HostWithTemplateInput)
    const boundary = createBoundary()
    boundary.detectChanges()
    expect(getFallback(boundary)).not.toBeTruthy()
    boundary.detectChanges()
    tick(0)
    expect(getFallback(boundary)).toBeTruthy()
    discardPeriodicTasks()
}

function testComponent(type: any, isRef: boolean) {
    const createBoundary = defineBoundary(type)
    const boundary = createBoundary()
    boundary.detectChanges()
    expect(!!getCustomFallback(boundary)).toBe(isRef)
    tick(0)
    expect(getCustomFallback(boundary)).toBeTruthy()
    discardPeriodicTasks()
}

describe("Fallback", () => {
    beforeEach(() => {
        spyOn(console, "error")
    })
    it("should render dom input", fakeAsync(() => {
        testDomElement(HostWithElementInput)
    }))
    it("should render dom ref", fakeAsync(() => {
        testDomElement(HostWithElement)
    }))
    it("should render template input", fakeAsync(() => {
        testTemplate(HostWithTemplateInput)
    }))
    it("should render template ref", fakeAsync(() => {
        testTemplate(HostWithTemplate)
    }))
    it("should render component input", fakeAsync(() => {
        testComponent(HostWithComponentInput, false)
    }))
    it("should render component ref", fakeAsync(() => {
        testComponent(HostWithComponent, true)
    }))
})
