import {
  Component,
  Directive,
  ElementRef,
  Input,
  NgModule,
  Output,
  Renderer2,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoCheck, Emitter, set, Subscribe, Inject, View } from '@mmuscat/angular-composition-api';

export interface Todo {
  text: string;
  done: boolean;
}

@Directive()
export class Props {
  @Input() text = '';
  @Input() done = false;
  @Input() resetOnSave = false;
  @Output() saveTodo = Emitter<Todo>();
  @ViewChild('textContent') textEditor!: ElementRef<HTMLDivElement>;
}

export function State(props: Props) {
  const text = DoCheck(() => props.text);
  const renderer = Inject(Renderer2);

  function toggleDone(value: boolean) {
    props.saveTodo.emit({
      text: props.text,
      done: value
    });
  }

  function editText(value: string) {
    if (!value || value === text.value) return;
    props.saveTodo.emit({
      text: value,
      done: props.done
    });
    if (props.resetOnSave) {
      reset()
    } else {
      set(text, value);
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
    setText(props.text)
  }

  Subscribe(text, setText)

  return {
    text,
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
