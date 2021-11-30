import {
   Emitter,
   isEmitter,
   use,
   select,
   ValueToken,
} from "@mmuscat/angular-composition-api"

const tokens = new WeakSet()

export function isCommandToken(token: any) {
   return tokens.has(token)
}

class CommandFactory {
   factory = () => {
      const emitter = use(Function)
      if (this.createCommand) {
         const result = this.createCommand(emitter)
         return isEmitter(result)
            ? result
            : select({ next: emitter, value: result })
      }
      return emitter
   }
   constructor(private createCommand?: (emitter: Emitter<any>) => any) {}
}

function createCommand<TName extends string, TArgs, TValue>(
   name: TName,
   factory?: (emitter: Emitter<TArgs>) => TValue,
): ValueToken<TValue> {
   const token = new ValueToken(name, new CommandFactory(factory))
   tokens.add(token)
   return token
}

export interface CommandStatic {
   new <TName extends string, TArgs, TValue>(
      name: TName,
      factory: (emitter: Emitter<TArgs>) => TValue,
   ): ValueToken<TValue>
}

export const Command: CommandStatic = createCommand as any
