import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing"
import { favouritesSchema, UserForm } from "./user-form"
import { FormsModule } from "../forms.module"
import { By } from "@angular/platform-browser"
import { FormFieldComponent } from "../form-field.component"
import { TextComponent } from "../theme/default/text/text.component"
import { FormContainerComponent } from "../form-container.component"
import { DebugElement, Renderer2 } from "@angular/core"
import { FormGroup } from "@angular/forms"

function getRenderer(debugElement: DebugElement) {
   return debugElement.injector.get(Renderer2)
}

function enterText(debugElement: DebugElement, value: any) {
   const renderer = getRenderer(debugElement)
   renderer.setProperty(debugElement.nativeElement, "value", value)
   debugElement.nativeElement.dispatchEvent(new InputEvent("input"))
}

function getContainer(fixture: ComponentFixture<UserForm>) {
   return fixture.debugElement.query(By.directive(FormContainerComponent))
}

function getModel(fixture: ComponentFixture<UserForm>): FormGroup {
   return getContainer(fixture).componentInstance.model
}

describe("Basic form", () => {
   beforeEach(waitForAsync(() => {
      TestBed.configureTestingModule({
         imports: [FormsModule],
         declarations: [UserForm]
      }).compileComponents()
   }))

   it("should create", () => {
      const fixture = TestBed.createComponent(UserForm)
      expect(fixture).toBeTruthy()
   })

   it("should render default theme", () => {
      const fixture = TestBed.createComponent(UserForm)
      fixture.detectChanges()
      const textField = fixture.debugElement.query(By.directive(TextComponent))
      expect(textField).toBeTruthy()
   })

   it("should set an initial value using schema defaults", () => {
      const fixture = TestBed.createComponent(UserForm)
      fixture.detectChanges()

      const container = fixture.debugElement.query(By.directive(FormContainerComponent))

      expect(container.componentInstance.model.value).toEqual({ username: "", password: "", gender: null })
   })

   it("should set an initial value using input value", () => {
      const fixture = TestBed.createComponent(UserForm)
      const value = { username: "BOGUS", password: "PASSWORD", gender: "M" }
      fixture.componentInstance.value = value
      fixture.detectChanges()

      const model = getModel(fixture)

      expect(model.value).toEqual(value)
   })

   it("should update model when value is entered into a field", () => {
      const fixture = TestBed.createComponent(UserForm)
      const model = getModel(fixture)
      fixture.detectChanges()
      const textInput = fixture.debugElement.query(By.css('input'))

      enterText(textInput, "BOGUS")

      expect(model.value.username).toBe("BOGUS")
   })

   it("should update when schema changes", () => {
      const fixture = TestBed.createComponent(UserForm)
      const model = getModel(fixture)
      fixture.detectChanges()

      fixture.componentInstance.schema = favouritesSchema
      fixture.componentInstance.value = { favourites: ["apple", "pie"] }
      fixture.detectChanges()

      expect(model.value).toEqual({ favourites: ["apple", "pie"] })
   })
})
