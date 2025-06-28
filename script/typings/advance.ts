declare module 'violet' {
      namespace WhatsType {
            export type Maybe<T> = T | undefined | null;
            export type KeyOf<T, U> = {
                  [K in keyof T]: T[K] extends U ? K : never;
            };
            export type RequiredKeys<T> = {
                  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
            }[keyof T];
            export type Paths<T extends object = {}> = T;
      }
}

export {};
