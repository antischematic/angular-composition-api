import {Component, Directive, ElementRef, Input, NgModule, Output, Renderer2, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Emitter, Inject, set, Subscribe, Value, State, Query} from '@mmuscat/angular-composition-api';

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
    @ViewChild('textContent') textEditor = Query<ElementRef<HTMLDivElement>>(false);

    static create({ saveTodo, id, text, done, resetOnSave, textEditor }: Props) {
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
            saveTodo.emit({
                text: value,
                done: done.value
            });
            if (resetOnSave.value) {
                reset()
            } else {
                setText(value)
                text.next(value);
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
            console.log('reset?')
            text.next(text.value)
        }

        Subscribe(text, setText)

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
