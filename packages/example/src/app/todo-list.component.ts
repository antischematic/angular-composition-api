import {CommonModule} from '@angular/common';
import {Component, Directive, ErrorHandler, Input, NgModule} from '@angular/core';
import {Emitter, Inject, set, State, Subscribe, Value} from '@mmuscat/angular-composition-api';
import {CreateTodo, LoadTodosById} from './api.service';
import {Todo, TodoModule} from './todo.component';

@Directive()
class Props {
    @Input() userId = Value<string>("");

    static create({userId}: Props) {
        const loadTodosById = Inject(LoadTodosById);
        const createTodo = Inject(CreateTodo);
        const todoChange = Emitter<Todo>();
        const todos = Value<Todo>([]);
        const setTodos = set(todos)
        const creating = Value<Todo | null>(null);
        const error = Inject(ErrorHandler)

        Subscribe(userId, value => {
            Subscribe(loadTodosById(value), setTodos);
        });

        Subscribe(todoChange, value => {
            console.log('todo changed!', value);
            setTodos((values) => {
                return values.map(todo => ({
                    ...todo,
                    done: todo.id === value.id ? value.done : todo.done
                }))
            })
        });

        Subscribe(createTodo, message => {
            if (message.type === 'request') {
                set(creating, message.value);
            }
            if (message.type === 'response') {
                console.log('todo created!', message.value);
                set(userId, userId)
            }
        });

        Subscribe(todos, () => creating.next(null));

        function explode() {
            error.handleError(new Error("Boom!"))
        }

        function toggleAll() {
            setTodos((value) => {
                const done = value.some(todo => !todo.done)
                return value.map(todo => ({...todo, done}))
            })
        }

        function id(value: any) {
            return value.id
        }

        return {
            todos,
            todoChange,
            createTodo,
            creating,
            toggleAll,
            explode,
            id
        };
    }
}

@Component({
    selector: 'app-todo-list',
    templateUrl: './todo-list.component.html',
    providers: [CreateTodo, LoadTodosById]
})
export class TodoListComponent extends State(Props) {
}

@NgModule({
    imports: [CommonModule, TodoModule],
    declarations: [TodoListComponent],
    exports: [TodoListComponent],
})
export class TodoListModule {
}
