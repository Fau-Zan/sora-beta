import type { Events as Clients, WhatsType } from 'violet';
import {
      AnyMessageContent,
      generateWAMessageContent,
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
type MediaKind = 'imageMessage' | 'videoMessage' | 'stickerMessage' | 'audioMessage'

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

      private async resolveJid(msgJid: string): Promise<string> {
            return isJidGroup(msgJid) ? msgJid : isLidUser(msgJid) ? this.parseJid(msgJid) : String(msgJid)
      }

      private async resolveContent(
            kind: WhatsType.Method,
            valueContent: string | Buffer,
      ): Promise<string | Buffer> {
            if (kind === 'conversation') {
                  return (typeof valueContent === 'string' ? util.format(valueContent) : '') || ''
            }
            if (Buffer.isBuffer(valueContent)) return valueContent
            return (await functions.getFile(valueContent)).data
      }

      private buildMessage(kind: WhatsType.Method, value: string | Buffer, options?: any): AnyMessageContent {
            if (kind === 'conversation') {
                  return Object.assign({ text: value as string }, { ...options })
            }
            let key: 'image' | 'video' | 'sticker' | 'audio'
            switch (kind as MediaKind) {
                  case 'imageMessage':
                        key = 'image'
                        break
                  case 'videoMessage':
                        key = 'video'
                        break
                  case 'stickerMessage':
                        key = 'sticker'
                        break
                  case 'audioMessage':
                        key = 'audio'
                        break
                  default:
                        key = 'image'
                        break
            }
            const payload = Object.assign({ [key]: value as Buffer } as any, { ...options })
            return payload as unknown as AnyMessageContent
      }

      async sendMessage<K extends WhatsType.Method>(
            msgJid: string,
            valueContent: string | Buffer,
            messageMethod: K,
            options?: WhatsType.ParentWAMediaMessageContent<K> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            const jid = await this.resolveJid(msgJid)
            const value = await this.resolveContent(messageMethod, valueContent)
            const fullMsg = this.buildMessage(messageMethod, value, options)
            return this.sock.sendMessage(jid, fullMsg, options)
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

      public async sendAudio(
            to: string,
            path: string | Buffer,
            options?: WhatsType.ParentWAMediaMessageContent<'audioMessage'> & MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            return this.sendMessage(to, path, 'audioMessage', options)
      }

      public async react(
            to: string,
            emoji: string,
            quotedKey?: proto.IMessageKey,
      ): Promise<WAProto.IWebMessageInfo> {
            const jid = await this.resolveJid(to)
            return this.sock.sendMessage(jid, { react: { key: quotedKey, text: emoji } } as any)
      }

      
      /**
       * Description placeholder
       *
       * @public
       * @readonly
       * @type {{}}
       */
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
            ]
      }


      /**
       * Description placeholder
       *
       * @public
       * @async
       * @param {string} to 
       * @param {string} text 
       * @param {Array<
       *                   | { type: 'reply'; id: string; text: string }
       *                   | { type: 'url'; text: string; url: string }
       *                   | { type: 'call'; text: string; phoneNumber: string }
       *             >} buttons 
       * @param {?string} [footer] 
       * @param {?MiscMessageGenerationOptions & {
       *                   media?: { type: 'image' | 'video' | 'document'; data: Buffer | { url: string }; options?: any }
       *                   title?: string
       *                   subtitle?: string
       *             }} [options] 
       * @returns {Promise<WAProto.IWebMessageInfo>} 
       */
      public async sendButtons(
            to: string,
            text: string,
            buttons: Array<
                  | { type: 'reply'; id: string; text: string }
                  | { type: 'url'; text: string; url: string }
                  | { type: 'call'; text: string; phoneNumber: string }
            >,
            footer?: string,
            options?: MiscMessageGenerationOptions & {
                  media?: { type: 'image' | 'video' | 'document'; data: Buffer | { url: string }; options?: any }
                  title?: string
                  subtitle?: string
            },
      ): Promise<WAProto.IWebMessageInfo> {
            const jid = await this.resolveJid(to)
                  if (typeof to !== 'string' || !to.trim()) throw new TypeError('sendButtons: "to" must be a non-empty string')
                  if (typeof text !== 'string' || !text.trim()) throw new TypeError('sendButtons: "text" must be a non-empty string')
                  if (footer !== undefined && typeof footer !== 'string') throw new TypeError('sendButtons: "footer" must be a string if provided')
                  if (!Array.isArray(buttons) || buttons.length === 0) throw new TypeError('sendButtons: "buttons" must be a non-empty array')
                  if (buttons.length > 10) throw new RangeError('sendButtons: maximum is 10 buttons')
                  if (options?.title !== undefined && typeof options.title !== 'string') throw new TypeError('sendButtons: "options.title" must be a string')
                  if (options?.subtitle !== undefined && typeof options.subtitle !== 'string') throw new TypeError('sendButtons: "options.subtitle" must be a string')
                  if (options?.media) {
                        const allowed = ['image', 'video', 'document']
                        if (!allowed.includes(options.media.type)) throw new TypeError('sendButtons: media.type must be image|video|document')
                        const isBuf = Buffer.isBuffer((options.media as any).data)
                        const isUrlObj = !!(options.media as any).data?.url && typeof (options.media as any).data.url === 'string'
                        if (!isBuf && !isUrlObj) throw new TypeError('sendButtons: media.data must be Buffer or { url: string }')
                  }

                  const builtButtons = buttons
                        .map((b) => {
                              if ((b as any).type === 'reply') {
                                    if (typeof (b as any).text !== 'string' || typeof (b as any).id !== 'string') {
                                          throw new TypeError('sendButtons: reply button requires string id and text')
                                    }
                                    return {
                                          name: 'quick_reply',
                                          buttonParamsJson: JSON.stringify({ display_text: (b as any).text, id: (b as any).id }),
                                    }
                              }
                              if ((b as any).type === 'url') {
                                    if (typeof (b as any).text !== 'string' || typeof (b as any).url !== 'string') {
                                          throw new TypeError('sendButtons: url button requires string text and url')
                                    }
                                    return {
                                          name: 'cta_url',
                                          buttonParamsJson: JSON.stringify({ display_text: (b as any).text, url: (b as any).url, merchant_url: (b as any).url }),
                                    }
                              }
                              if ((b as any).type === 'call') {
                                    if (typeof (b as any).text !== 'string' || typeof (b as any).phoneNumber !== 'string') {
                                          throw new TypeError('sendButtons: call button requires string text and phoneNumber')
                                    }
                                    return {
                                          name: 'cta_call',
                                          buttonParamsJson: JSON.stringify({ display_text: (b as any).text, phone_number: (b as any).phoneNumber }),
                                    }
                              }
                              throw new TypeError('sendButtons: unsupported button type')
                        })
                        .filter(Boolean)

            const headerBase = {
                  title: options?.title,
                  subtitle: options?.subtitle,
            }

            let headerWithMedia = undefined
            if (options?.media) {
                  const uploadContent = await generateWAMessageContent(
                        { [options.media.type]: options.media.data, ...(options.media.options || {}) } ,
                        { upload: this.sock.waUploadToServer },
                  )
                  headerWithMedia = { ...headerBase, hasMediaAttachment: true, ...uploadContent }
            }

            const content = {
                  viewOnceMessage: {
                        message: {
                              messageContextInfo: {
                                    deviceListMetadata: {},
                                    deviceListMetadataVersion: 2,
                              },
                              interactiveMessage: {
                                          header: headerWithMedia || {
                                                ...headerBase,
                                                hasMediaAttachment: false,
                                          },
                                    body: { text },
                                    footer: footer ? { text: footer } : undefined,
                                    nativeFlowMessage: {
                                          buttons: builtButtons,
                                          messageParamsJson: '{}',
                                    },
                              },
                        },
                  },
            } as proto.Message

            const protoMsg = generateWAMessageFromContent(jid, content, {
                  userJid: this.sock.authState.creds.me?.id,
                  ...options,
            })

            await this.sock.relayMessage(protoMsg.key.remoteJid as string, protoMsg.message as proto.IMessage, {
                  messageId: protoMsg.key.id as string,
                  additionalNodes: [
                        {
                              tag: 'biz',
                              attrs: {},
                              content: [
                                    {
                                          tag: 'interactive',
                                          attrs: {
                                                type: 'native_flow',
                                                v: '1',
                                          },
                                          content: [
                                                {
                                                      tag: 'native_flow',
                                                      attrs: {
                                                            v: '9',
                                                            name: 'mixed',
                                                      },
                                                      content: [],
                                                },
                                          ],
                                    },
                              ],
                        },
                  ],
            })

            return protoMsg as unknown as WAProto.IWebMessageInfo
      }


      public async sendList(
            to: string,
            title: string,
            text: string,
            buttonText: string,
            sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
            footer?: string,
            options?: MiscMessageGenerationOptions & {
                  media?: { type: 'image' | 'video' | 'document'; data: Buffer | { url: string }; options?: any }
            },
      ): Promise<WAProto.IWebMessageInfo> {
            if (typeof to !== 'string' || !to.trim()) throw new TypeError('sendList: "to" must be a non-empty string')
            if (typeof title !== 'string' || !title.trim()) throw new TypeError('sendList: "title" must be a non-empty string')
            if (typeof text !== 'string' || !text.trim()) throw new TypeError('sendList: "text" must be a non-empty string')
            if (typeof buttonText !== 'string' || !buttonText.trim()) throw new TypeError('sendList: "buttonText" must be a non-empty string')
            if (footer !== undefined && typeof footer !== 'string') throw new TypeError('sendList: "footer" must be a string if provided')
            if (!Array.isArray(sections) || sections.length === 0) throw new TypeError('sendList: "sections" must be a non-empty array')
            for (const i in sections) {
                  const s = sections[i]
                  if (typeof s.title !== 'string') throw new TypeError(`sendList: sections[${i}].title must be a string`)
                  if (!Array.isArray(s.rows) || s.rows.length === 0) throw new TypeError(`sendList: sections[${i}].rows must be a non-empty array`)
                  for (const ii in s.rows) {
                        const r = s.rows[ii]
                        if (typeof r.id !== 'string' || !r.id.trim()) throw new TypeError(`sendList: sections[${i}].rows[${ii}].id must be a non-empty string`)
                        if (typeof r.title !== 'string' || !r.title.trim()) throw new TypeError(`sendList: sections[${i}].rows[${ii}].title must be a non-empty string`)
                        if (r.description !== undefined && typeof r.description !== 'string') throw new TypeError(`sendList: sections[${i}].rows[${ii}].description must be a string if provided`)
                  }
            }

            const jid = await this.resolveJid(to)

            const content = {
                  viewOnceMessage: {
                        message: {
                              interactiveMessage: {
                                    body: { text },
                                    footer: footer ? { text: footer } : undefined,
                                    header: { hasMediaAttachment: false },
                                    nativeFlowMessage: {
                                          buttons: [
                                                {
                                                      name: 'single_select',
                                                      buttonParamsJson: JSON.stringify({ title: buttonText, sections }),
                                                },
                                          ],
                                          messageParamsJson: '{}',
                                    },
                              },
                        },
                  },
            } as proto.Message

            if (options?.media) {
                  const uploadContent = await generateWAMessageContent(
                        { [options.media.type]: options.media.data, ...(options.media.options || {}) } as any,
                        { upload: this.sock.waUploadToServer },
                  )
                  ;(content.viewOnceMessage.message.interactiveMessage as any).header = {
                        hasMediaAttachment: true,
                        ...uploadContent,
                  }
            }

            const protoMsg = generateWAMessageFromContent(jid, content, {
                  userJid: this.sock.authState.creds.me?.id,
                  ...options,
            })

            await this.sock.relayMessage(protoMsg.key.remoteJid as string, protoMsg.message as proto.IMessage, {
                  messageId: protoMsg.key.id as string,
            })

            return protoMsg as unknown as WAProto.IWebMessageInfo
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

      
      /**
       * Description placeholder
       *
       * @public
       * @template {WAProto.IMessage} Message 
       * @param {string} to 
       * @param {Message} message 
       * @param {?string} [jid] 
       * @returns {*} 
       */
      public sendContentMessage<Message extends WAProto.IMessage>(to: string, message: Message, jid?: string) {
            const Proto = generateWAMessageFromContent(to, message as Message, {
                  userJid: jid ?? (this.sock.authState.creds.me?.id as string),
            });
            return this.sock.relayMessage(Proto.key.remoteJid as string, Proto.message as Message, {
                  messageId: Proto.key.id as string,
            });
      }

      public store: WhatsType.IPostgresStore;

      
      /**
       * Description placeholder
       *
       * @public
       * @param {proto.IMessageKey} key 
       * @param {string} str 
       * @returns {*} 
       */
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

      
      /**
       * Description placeholder
       *
       * @public
       * @param {string} jid 
       * @returns {boolean} 
       */
      public isOwner(jid: string): boolean {
            const normalized = this.parseJid(jid)
            const owners = this.owner.map((o) => this.parseJid(o.number + '@s.whatsapp.net'))
            return owners.includes(normalized)
      }

      
      /**
       * Description placeholder
       *
       * @public
       * @async
       * @param {string} text 
       * @returns {Promise<void>} 
       */
      public async notifyOwners(text: string): Promise<void> {
            for (const o of this.owner) {
                  try {
                        const jid = this.parseJid(o.number + '@s.whatsapp.net')
                        await this.sendText(jid, text)
                  } catch {}
            }
      }

      
      /**
       * Description placeholder
       *
       * @param {string} url 
       * @returns {*} 
       */
      public parseURI = (url: string) =>
            JSON.parse('{"' + decodeURI(url.replace(/&/g, '","').replace(/=/g, '":"')) + '"}');
      public parseJid = (jid: string) => jidNormalizedUser(jid);

      
      /**
       * Description placeholder
       *
       * @public
       * @async
       * @param {string} to 
       * @param {(string | Buffer)} input 
       * @param {?MiscMessageGenerationOptions} [options] 
       * @returns {Promise<WAProto.IWebMessageInfo>} 
       */
      public async sendFileAuto(
            to: string,
            input: string | Buffer,
            options?: MiscMessageGenerationOptions,
      ): Promise<WAProto.IWebMessageInfo> {
            const file = await functions.getFile(input)
            const mime = file.mime || ''
            if (mime.startsWith('image/')) {
                  return this.sendImage(to, file.data, options as any)
            } else if (mime.startsWith('video/')) {
                  return this.sendVideo(to, file.data, options as any)
            } else if (mime.startsWith('audio/')) {
                  return this.sendAudio(to, file.data, options as any)
            } else if (mime === 'image/webp') {
                  return this.sendSticker(to, file.data, options as any)
            } else {
                  return this.sendText(to, `Received file: ${file.filename || 'unknown'}`)
            }
      }
}
