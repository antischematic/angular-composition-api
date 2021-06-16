import {
    ChangeDetectionStrategy,
    Component,
    Directive,
    ElementRef,
    HostBinding,
    Input,
    NgModule,
    Output,
    Renderer2,
    ViewChild
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Emitter, Inject, Query, set, Subscribe, Value, ValueSubject} from '@mmuscat/angular-composition-api';
import {State} from "./state";

export interface Todo {
    id?: number
    text: string;
    done: boolean;
}

@Directive()
export class Props {
    @Input()
    id = Value<number>()
    @Input()
    text = Value('')
    @HostBinding("class.red")
    @Input()
    done = Value(false)
    @Input()
    resetOnSave = Value(false)
    @Output()
    saveTodo = Emitter<Todo>()
    @Output()
    textChange = Emitter<string>()
    @ViewChild('textContent')
    textEditor = Query<ElementRef>(false)

    static create({
        id,
        text,
        done,
        resetOnSave,
        saveTodo,
        textEditor,
    }: Props) {
        const renderer = Inject(Renderer2);

        function toggleDone(value: boolean) {
            saveTodo.emit({
                id: id.value,
                text: text.value,
                done: value
            });
        }

        function editText(value: string) {
            if (!value || value === text.value) return;
            setText(value)
            set(saveTodo, {
                id: id.value,
                text: value,
                done: done.value
            });
            if (resetOnSave.value) {
                reset()
            } else {
                set(text, value);
            }
        }

        function setText(value: string) {
            renderer.setProperty(
                textEditor.value?.nativeElement,
                'textContent',
                value
            )
        }

        function reset() {
            text.next(text.value)
        }

        Subscribe(text, setText)

        return {
            editText,
            toggleDone
        }
    }

}

@Component({
    selector: 'app-todo',
    templateUrl: './todo.component.html'
})
export class TodoComponent extends State(Props) {}
@Directive()
export class HelloProps {
    @Input() names!: ValueSubject<string>
}


@Component({
    selector: 'hello',
    template: `<h1>Hello {{names}}!</h1>`,
    styles: [`h1 { font-family: Lato; }`]
})
export class HelloComponent extends State(HelloProps) {}

@NgModule({
    imports: [FormsModule],
    declarations: [TodoComponent, HelloComponent],
    exports: [TodoComponent, HelloComponent]
})
export class TodoModule {}
