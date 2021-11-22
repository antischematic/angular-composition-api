import {Emitter, use, Value, ValueToken} from "@mmuscat/angular-composition-api"

export class CommandToken<T> extends ValueToken<T> {}

class CommandFactory {
   factory() {
      const emitter = use(Function)
      return this.createCommand ? use(this.createCommand(emitter)) : emitter
   }
   constructor(private createCommand?: (emitter: Emitter<any>) => Value<any>) {}
}

function createCommand<TName extends string, TArgs, TValue>(name: TName, factory?: (emitter: Emitter<TArgs>) => Value<TValue>): ValueToken<TValue> {
   return new CommandToken(name, new CommandFactory(factory))
}

export const Command = createCommand
