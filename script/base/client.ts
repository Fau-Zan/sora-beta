import type { Events as Clients, WhatsType} from 'violet';
import {
      AnyMessageContent,
      generateWAMessageFromContent,
      MiscMessageGenerationOptions,
      jidNormalizedUser,
      WAProto,
      WASocket,
      isJidGroup,
      isLidUser,
      proto,
} from '@whiskeysockets/baileys';
import util from 'util';
import { BuildEvents } from '.';
import { spawn } from 'child_process';
import { functions } from '../utils';
import * as postgres from '../database/postgres';

type CurrentMessageType = keyof typeof WAProto.Message.prototype;
export default class BaseClient extends BuildEvents<Clients.MessageEvent> {
      constructor() {
            super();
            for (const i of Object.keys(WAProto.Message.prototype) as CurrentMessageType[]) {
                  this.MessageType[i] = this.MessageType[i];
            }
            delete (this.MessageType as any)['toJSON'];
      }

      public get cache(): Cache {
            return new Cache();
      }

      public postgresdb = postgres;
      public sock: WASocket;
      public get MessageType() {
            return {} as { [K in CurrentMessageType]: string };
      }

      async sendMessage<K extends WhatsType.Method>(
            msgJid: string,
            valueContent: string | Buffer,
            messageMethod: K,
            options?: WhatsType.ParentWAMediaMessageContent<K> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            let fullMsg: AnyMessageContent,
                  value =
                        messageMethod === 'conversation'
                              ? (typeof valueContent === 'string' ? util.format(valueContent) : null) || ''
                              : Buffer.isBuffer(valueContent)
                              ? valueContent
                              : (await functions.getFile(valueContent)).data,
                  jid = isJidGroup(msgJid) ? msgJid : isLidUser(msgJid) ? this.parseJid(msgJid) : String(msgJid);
            switch (messageMethod) {
                  case 'conversation':
                        fullMsg = {
                              ['text']: value as string,
                        };
                        fullMsg = Object.assign(fullMsg, { ...options });
                        break;
                  case 'imageMessage':
                        fullMsg = {
                              ['image']: value as Buffer,
                        };
                        fullMsg = Object.assign(fullMsg, { ...options });
                        break;
                  case 'videoMessage':
                        fullMsg = {
                              ['video']: value as Buffer,
                        };
                        fullMsg = Object.assign(fullMsg, { ...options });
                        break;
                  case 'stickerMessage':
                        fullMsg = {
                              ['sticker']: value as Buffer,
                        };
                        fullMsg = Object.assign(fullMsg, { ...options });
                        break;
                  case 'audioMessage':
                        fullMsg = {
                              ['audio']: value as Buffer,
                        };
                        fullMsg = Object.assign(fullMsg, { ...options });
                        break;
            }
            return this.sock.sendMessage(jid, fullMsg, options);
      }

      public sendText(
            to: string,
            message: string,
            options?: WhatsType.ParentWAMediaMessageContent<'stickerMessage'> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            return this.sendMessage(to, util.format(message), 'conversation', options);
      }

      public async sendSticker(
            to: string,
            path: string | Buffer,
            options?: WhatsType.ParentWAMediaMessageContent<'stickerMessage'> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            return this.sendMessage(to, path, 'stickerMessage', options);
      }

      public async sendImage(
            to: string,
            path: string | Buffer,
            options?: WhatsType.ParentWAMediaMessageContent<'imageMessage'> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            return this.sendMessage(to, path, 'imageMessage', options);
      }

      public async sendVideo(
            to: string,
            path: string | Buffer,
            options?: WhatsType.ParentWAMediaMessageContent<'videoMessage'> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            return this.sendMessage(to, path, 'videoMessage', options);
      }

      public get owner() {
            return [
                  {
                        name: 'fauzan',
                        number: '6285824304273',
                        superOwner: true,
                  },
                  {
                        name: 'abil',
                        number: '6283893962591',
                        superOwner: true,
                  },
                  {
                        name: 'fauzan',
                        number: '6282298069899',
                        superOwner: true,
                  },
                  {
                        name: 'firgi',
                        number: '6285173118500',
                        superOwner: true,
                  },
                  {
                        name: 'restu',
                        number: '6285783417029',
                        superOwner: true,
                  },
                  {
                        name: 'denta',
                        number: '6281242860439',
                        superOwner: true,
                  },
            ];
      }

      restartNodeProcess(exitCode: number) {
            if (exitCode !== 0) {
                  process.exit(1);
            }
            const node = spawn(process.argv[0], process.argv.slice(1), {
                  cwd: process.cwd(),
                  stdio: 'inherit',
            });

            node.on('exit', (code: number) => {
                  this.restartNodeProcess(code);
            });
      }

      public sendContentMessage<Message extends WAProto.IMessage>(to: string, message: Message, jid?: string) {
            const Proto = generateWAMessageFromContent(to, message as Message, {
                  userJid: jid ?? (this.sock.authState.creds.me?.id as string),
            });
            return this.sock.relayMessage(Proto.key.remoteJid as string, Proto.message as Message, {
                  messageId: Proto.key.id as string,
            });
      }

      public store: WhatsType.IPostgresStore;

      public editMessage(key: proto.IMessageKey, str: string) {
            if (key.id)
                  return this.sock.relayMessage(
                        key.remoteJid,
                        {
                              protocolMessage: {
                                    key,
                                    editedMessage: {
                                          conversation: str,
                                    },
                                    type: 14,
                              },
                        },
                        {},
                  );
      }

      public parseURI = (url: string) =>
            JSON.parse('{"' + decodeURI(url.replace(/&/g, '","').replace(/=/g, '":"')) + '"}');
      public parseJid = (jid: string) => jidNormalizedUser(jid);
}
