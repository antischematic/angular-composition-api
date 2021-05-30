import { HttpClient } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { Emitter, Subscribe } from '@mmuscat/angular-composition-api';
import { Inject, Factory } from '@mmuscat/angular-composition-api';
import { Todo } from './todo.component';

let database = [
  {
    id: 1,
    text: 'Think of an idea',
    done: true
  },
  {
    id: 2,
    text: 'Create a prototype in StackBlitz',
    done: true
  },
  {
    id: 3,
    text: 'Write a library',
    done: false
  }
];

function loadTodosById() {
  const http = Inject(HttpClient);
  return function(userId: string) {
    console.log('Loading from fake server. userId:', userId);
    // http.get() for real application
    return timer(1000).pipe(map(() => database));
  };
}

export const LoadTodosById = new InjectionToken('LoadTodosById', {
  factory: Factory(loadTodosById)
});

interface Request<T> {
  type: 'request';
  value: T;
}

interface Response<T> {
  type: 'response';
  value: T;
}

type ApiEvent<T, U> = Request<T> | Response<U>;

function createTodo() {
  const resource = Emitter<ApiEvent<Todo, Todo>>();

  Subscribe(resource, message => {
    if (message.type === 'request') {
      const entity = {
        id: database.length,
        ...message.value
      };
      database = database.concat(entity);
      Subscribe(timer(250), () => {
        resource.emit({
          type: 'response',
          value: entity
        });
      });
    }
  });
  return resource;
}

export const CreateTodo = Factory('CreateTodo', createTodo);
