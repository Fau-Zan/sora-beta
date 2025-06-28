import { Logger } from '../utils';

export class violetError extends Error {
      constructor(message: string) {
            super(message);
            this.name = this.constructor.name;
            Object.setPrototypeOf(this, new.target.prototype);
      }
      public static fromError(error: Error): violetError {
            const newError = new violetError(error.message);
            newError.stack = error.stack;
            return newError;
      }
      public toObject() {
            return {
                  message: this.message,
                  name: this.name,
                  stack: this.stack,
            };
      }
      public print() {
            Logger.error(this.toObject()!.message!);
      }
}
