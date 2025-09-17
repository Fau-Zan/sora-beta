var applyDecorators = (this && this.applyDecorators) || function (decorators, target, key, descriptor) {
    var argCount = arguments.length,
        result = argCount < 3
            ? target
            : descriptor === null
                ? descriptor = Object.getOwnPropertyDescriptor(target, key)
                : descriptor,
        decorator;

    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") {
        result = Reflect.decorate(decorators, target, key, descriptor);
    } else {
        for (var i = decorators.length - 1; i >= 0; i--) {
            if (decorator = decorators[i]) {
                result = (argCount < 3
                    ? decorator(result)
                    : argCount > 3
                        ? decorator(target, key, result)
                        : decorator(target, key)) || result;
            }
        }
    }
    return argCount > 3 && result && Object.defineProperty(target, key, result), result;
};

export function Config() {
  return (Ctor) => {
    function* forceGetName(_constructor) {
      while (_constructor) {
        yield _constructor.name;
        _constructor = Object.getPrototypeOf(_constructor);
      }
    }

    const className = [];
    const property = Ctor.prototype.property;

    for (const forceName of forceGetName(Ctor)) {
      if (!forceName) continue;
      className.push(forceName);
    }

    const arr = [];
    Array.from(property).forEach(([K, content]) => {
      arr.push([K, content]);
    });

    Ctor.prototype.property = arr;
    Ctor.prototype.subClassName = className[1];
    return Ctor;
  };
}

export function Cmd(cmd, structure) {
  return (target, _, descriptor) => {
    function isValue(T) {
      return (T === null || T === undefined) === false;
    }

    const res = new Map();
    const property = descriptor.value;

    for (const keys in structure) {
      const value = structure?.[keys];
      if (value && isValue(value)) property[keys] = value;
    }

    target.property = target.property || res;
    target.property.set(cmd, property);
  };
}

export class BaseCommand {
  /*constructor(client, M) {
    (this.client = client), (this.M = M);
  }
  MessageMethod = MessType;
  client;
  M;
  setting;
  modify;
  query;
  cmd;
  args;
  async after() {}
  async sendWait() {
    return await console.log('Please wait, your request is being processed');
  }
  replyText = (content) => {
    return this.client.sendText(this.M.from, content, {
      quoted: this.M,
    });
  };
  isImage() {
    let M;
    if (this.M.quoted) M = this.M.quoted.content;
    else M = this.M;
    return M.type === 'imageMessage';
  }
  isVideo() {
    let M;
    if (this.M.quoted) M = this.M.quoted.content;
    else M = this.M;
    return M.type === 'videoMessage';
  }
  isSticker() {
    let M;
    if (this.M.quoted) M = this.M.quoted.content;
    else M = this.M;
    return M.type === 'stickerMessage';
  }
  isAudio() {
    let M;
    if (this.M.quoted) M = this.M.quoted.content;
    else M = this.M;
    return M.type === 'audioMessage';
  }
  functions = functions;
  */
}

import { format } from 'util';
import { execSync } from 'child_process';

@Config()
export class Command extends BaseCommand {
      constructor(client, M) {
            super(client, M);
      }

      @Cmd('(>)', {
            as: ['>'],
            division: 'owner',
            usePrefix: false,
            help: 'code',
            acc: {
                  owner: true,
            },
      })
      async Eval() {
            let ev;
            try {
                  const cycletls = await CycleTLS();
                  let { query, modify } = this;
                  if (modify.verify?.r) query.full = 'return ' + query.parsed;
                  ev = await eval(`(async () => { ${query.full}})()`);
            } catch (e) {
                  ev = e.message;
            }
            return void (await this.replyText(format(ev)));
      }
      @Cmd('($)', {
            as: ['$'],
            division: 'owner',
            usePrefix: false,
            acc: {
                  owner: true,
            },
      })
      async Exec() {
            try {
                  const response = execSync(this.query.full).toString('utf-8');
                  if (response) return void (await this.replyText(format(response)));
            } catch (error) {
                  this.replyText(format(error));
            }
      }
}

let property = Command.prototype.property;
console.log(property)