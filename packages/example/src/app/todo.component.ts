import {Component, Directive, ElementRef, Input, NgModule, Output, Renderer2, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Emitter, Inject, set, Subscribe, Value, View} from '@mmuscat/angular-composition-api';

export interface Todo {
  id?: number
  text: string;
  done: boolean;
}

@Directive()
export class Props {
  @Input() id?: number;
  @Input() text = Value('');
  @Input() done = false;
  @Input() resetOnSave = false;
  @Output() saveTodo = Emitter<Todo>();
  @ViewChild('textContent') textEditor!: ElementRef<HTMLDivElement>;
}

export function State(props: Props) {
  const renderer = Inject(Renderer2);

  function toggleDone(value: boolean) {
    props.saveTodo.emit({
      id: props.id,
      text: props.text.value,
      done: value
    });
  }

  function editText(value: string) {
    if (!value || value === props.text.value) return;
    props.saveTodo.emit({
      text: value,
      done: props.done
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

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html'
})
export class TodoComponent extends View(Props, State) {}

@NgModule({
  imports: [FormsModule],
  declarations: [TodoComponent],
  exports: [TodoComponent]
})
export class TodoModule {}
