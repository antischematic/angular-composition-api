import { CommonModule } from '@angular/common';
import {Component, Directive, ErrorHandler, Input, NgModule} from '@angular/core';
import { CreateTodo, LoadTodosById } from './api.service';
import { Todo, TodoModule } from './todo.component';
import { State } from './state';
import { get, Inject, Select, set, Subscribe, Value} from "@mmuscat/angular-composition-api";


function trackById(index: number, value: any) {
    return value?.id ?? index;
}

@Directive()
class Props {
    @Input()
    userId = Value('');

    static create = create;
}

@Component({
    selector: 'app-todo-list',
    templateUrl: './todo-list.component.html',
    providers: [CreateTodo, LoadTodosById]
})
export class TodoListComponent extends State(Props) {
    toggleAll() {
        const done = this.todos.some(todo => !todo.done);
        this.todos = this.todos.map(todo => ({ ...todo, done }));
    }
    todoChange(value: Todo) {
        this.todos = this.todos.map(todo => ({
            ...(todo.id === value.id ? value : todo)
        }));
    }
}

function create({ userId }: Props) {
    const loadTodosById = Inject(LoadTodosById),
        setUserId = set(userId),
        todos = Value<Todo>([]),
        setTodos = set(todos),
        createTodo = Inject(CreateTodo),
        creating = Value<Todo | null>(null),
        setCreating = set(creating),
        error = Inject(ErrorHandler);

    let count = 0
    const changeCount = Select(todos, (val) => count++)
    const setChangeCount = set(changeCount)

    Subscribe(userId, value => {
        Subscribe(loadTodosById(value), {
            next: setTodos,
            complete() {
                setCreating(null)
            }
        });
    });

    Subscribe(createTodo, ({ value, type }) => {
        switch (type) {
            case 'request': {
                console.log('create todo', value);
                setCreating(value);
                break
            }
            case 'response': {
                console.log('todo created!', value);
                setUserId(userId);
                break
            }
        }
    });
    Subscribe(todos, () => {
        setChangeCount(get(changeCount) + 1)
    })

    Subscribe(() => {
        console.log('todos changed!', get(todos))
        console.log('change count:', changeCount.value)
        creating.next(null)
    });

    function explode() {
        error.handleError(new Error("Boom!"))
    }


    return {
        todos,
        createTodo,
        creating,
        explode,
        id: trackById
    };
}

@NgModule({
    imports: [CommonModule, TodoModule],
    declarations: [TodoListComponent],
    exports: [TodoListComponent]
})
export class TodoListModule {}