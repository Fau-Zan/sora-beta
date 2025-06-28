import * as baileys from '@whiskeysockets/baileys';
const { proto, BufferJSON, initAuthCreds } = baileys;
import type { SignalDataTypeMap, AuthenticationCreds } from '@whiskeysockets/baileys';
import { Logger } from '../utils';
import { Database } from './index';

declare module 'violet' {
      namespace Whatsapp {
            interface Store extends PouchDB.Core.IdMeta {
                  store: string;
            }
            interface IAuth {
                  creds: AuthenticationCreds;
                  keys: any;
            }
      }
}

const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
      'pre-key': 'preKeys',
      session: 'sessions',
      'sender-key': 'senderKeys',
      'app-state-sync-key': 'appStateSyncKeys',
      'app-state-sync-version': 'appStateVersions',
      'sender-key-memory': 'senderKeyMemory',
};

export const singleSession = async (session: string) => {
      const pocket: Database = new Database();
      let creds: AuthenticationCreds;
      let keys: any;
      const saveState = async () => {
            let input = {
                  creds,
                  keys,
            };

            const value = await pocket.get<IAuthentication>(session).catch(() => null)!;
            if (!value) input = input;
            else {
                  const auth = JSON.parse(value.auth, BufferJSON.reviver);
                  input = Object.assign({}, auth, input);
            }
            return await pocket
                  .saveOrUpdateDocument<IAuthentication>({
                        _id: String(session),
                        auth: JSON.stringify(input, BufferJSON.replacer, 2),
                  })
                  .catch(() => void null);
      };
      const result = await pocket
            .get<IAuthentication>(session)
            .then((doc: any) => doc.auth)
            .catch(() => void Logger.warn('new session detected'));

      const parser = result ? JSON.parse(result, BufferJSON.reviver) : null;
      if (parser) {
            creds = parser?.creds;
            keys = parser?.keys;
      } else {
            creds = initAuthCreds();
            keys = {};
      }
      return {
            state: {
                  creds,
                  keys: {
                        get: (type: string, ids: any) => {
                              const key = KEY_MAP[type as keyof SignalDataTypeMap];
                              return ids.reduce((dict: any, id: any) => {
                                    let value = keys[key]?.[id];
                                    if (value) {
                                          if (type === 'app-state-sync-key') {
                                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                                          }

                                          dict[id] = value;
                                    }
                                    return dict;
                              }, {});
                        },
                        set: async (data: any) => {
                              for (const _key in data) {
                                    const key = KEY_MAP[_key as keyof SignalDataTypeMap];
                                    keys[key] = keys[key] || {};
                                    Object.assign(keys[key], data[_key as keyof SignalDataTypeMap]);
                              }
                              saveState();
                        },
                  },
            },
            saveState,
      };
};
interface IAuthentication {
      auth: string;
}
