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
import {State} from "./state";
import {DETACHED, Emitter, Inject, Query, Subscribe, Value} from "@mmuscat/angular-composition-api";

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
    @ViewChild('textContent')
    textEditor = Query<ElementRef>(false)

    static create = create
}

@Component({
    selector: 'app-todo',
    templateUrl: './todo.component.html',
    providers: [DETACHED]
})
export class TodoComponent extends State(Props) {
    toggleDone(value: boolean) {
        this.saveTodo.emit({
            id: this.id,
            text: this.text,
            done: value
        });
    }
    editText(value: string) {
        if (!value || value === this.text) return;
        this.text = value
        this.saveTodo.emit({
            id: this.id,
            text: this.text,
            done: this.done
        });
        if (this.resetOnSave) {
            this.setEditorText(this.text)
        } else {
            this.text = value
        }
    }
}

@NgModule({
    imports: [FormsModule],
    declarations: [TodoComponent],
    exports: [TodoComponent]
})
export class TodoModule {}

function create({
    text,
    textEditor,
}: Props) {
    const renderer = Inject(Renderer2);

    function setEditorText(value: string) {
        renderer.setProperty(
            textEditor.value?.nativeElement,
            'textContent',
            value
        )
    }

    Subscribe(text, setEditorText)

    return {
        setEditorText
    }
}