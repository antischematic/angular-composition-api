import {Component, Directive, ElementRef, Input, NgModule, Output, Renderer2, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Emitter, Inject, set, Subscribe, Value, State} from '@mmuscat/angular-composition-api';

export interface Todo {
    id?: number
    text: string;
    done: boolean;
}

@Directive()
export class Props {
    @Input() id = Value<number>()
    @Input() text = Value('');
    @Input() done = Value(false);
    @Input() resetOnSave = Value(false);
    @Output() saveTodo = Emitter<Todo>();
    @ViewChild('textContent') textEditor!: ElementRef<HTMLDivElement>;

    static create(props: Props) {
        const renderer = Inject(Renderer2);

        function toggleDone(value: boolean) {
            props.saveTodo.emit({
                id: props.id.value,
                text: props.text.value,
                done: value
            });
        }

        function editText(value: string) {
            if (!value || value === props.text.value) return;
            props.saveTodo.emit({
                text: value,
                done: props.done.value
            });
            if (props.resetOnSave) {
                reset()
            } else {
                set(props.text, value);
            }
        }

        function setText(value: string) {
            renderer.setProperty(
                props.textEditor.nativeElement,
                'textContent',
                value
            );
        }

        function reset() {
            setText(props.text.value)
        }

        Subscribe(props.text, setText)

        return {
            toggleDone,
            editText,
            reset
        };
    }
}

@Component({
    selector: 'app-todo',
    templateUrl: './todo.component.html'
})
export class TodoComponent extends State(Props) {
}

@NgModule({
    imports: [FormsModule],
    declarations: [TodoComponent],
    exports: [TodoComponent]
})
export class TodoModule {
}
