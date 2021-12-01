import {
   Emitter,
   isEmitter,
   use,
   select,
   ValueToken,
   isValue, Service,
   inject,
} from "@mmuscat/angular-composition-api"

const tokens = new WeakSet()

export function isCommandToken(token: any) {
   return tokens.has(token)
}

function command(name: string, factory: (emitter: Emitter<any>) => any) {
   const emitter = use(Function)
   if (factory) {
      const result = factory(emitter)
      return isEmitter(result)
         ? result
         : select({
            next: emitter,
            value: isValue(result) ? result : use(result),
         })
   }
   return emitter
}

function createCommand<TName extends string, TArgs, TValue>(
   name: TName,
   factory?: (emitter: Emitter<TArgs>) => TValue,
): ValueToken<TValue> {
   const service = new Service(command, {
      providedIn: null,
      name,
      arguments: [name, factory],
   })
   const token = new ValueToken(name, {
      providedIn: null,
      factory() {
         return inject(service)
      },
   })
   token.Provider.push(service)
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
