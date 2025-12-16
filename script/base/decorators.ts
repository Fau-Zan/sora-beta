import { Whatsapp } from 'violet';

export function Config() {
      return <T extends { new (...args: any[]): any }>(Ctor: T) => {
            function* forceGetName(_constructor: T) {
                  while (_constructor) {
                        yield _constructor.name;
                        _constructor = Object.getPrototypeOf(_constructor);
                  }
            }
            let className: string[] = [];
            let property: Map<string, Whatsapp.CmdProperty> = Ctor.prototype.property;
            for (let forceName of forceGetName(Ctor)) {
                  if (!forceName) continue;
                  className.push(forceName);
            }
            let arr = [] as [string | string[], Whatsapp.CmdProperty][];
            if (property) {
                  Array.from(property).forEach(([K, content]) => {
                        return arr.push([K, content]);
                  });
            }
            Ctor.prototype.property = arr;
            Ctor.prototype.subClassName = className[1];
            return Ctor;
      };
}

export function All() {
      return (target: any, _: string | symbol, descriptor: PropertyDescriptor) => {
            target.allMethod = descriptor.value;
      };
}
export function Cmd(cmd: string | string[], structure: Whatsapp.ICmd) {
      return (target: any, _: string | symbol, descriptor: PropertyDescriptor) => {
            function isValue(T: any) {
                  return (T === null || T === undefined) === false;
            }
            const res: Map<string, Whatsapp.CmdProperty> = new Map();
            let property: Whatsapp.CmdProperty = descriptor.value as Whatsapp.CmdProperty;
            for (const keys in structure) {
                  var value = structure?.[keys];
                  if (value && isValue(value)) property[keys] = value;
            }
            target.property = (target.property as typeof res) || res;
            target.property.set(cmd, property);
      };
}
