import { MiscMessageGenerationOptions, proto, WAProto } from '@whiskeysockets/baileys';
import type { WAMessage, WAMessageKey } from '@whiskeysockets/baileys';

declare module 'violet' {
      namespace Whatsapp {

            type IMessage = (proto.IWebMessageInfo | WAMessage) & Partial<Message>;
            export type IClient = import('../listeners').Message['client'];
            export type IWaMess = import('../listeners').Message['M'];
            export interface ExtraContents {
                  cmd: string;
                  args: string[];
                  modify?: {
                        verify: Record<string, boolean>;
                        usage: Record<string, string>;
                        command: string;
                  };
                  query: { full: string; parsed: string };
            }
            export interface ICmd {
                  as?: string[];
                  help?: string;
                  description?: string;
                  division?: string;
                  usePrefix: boolean;
                  acc?: {
                        owner?: boolean;
                        admin?: boolean;
                        textOrQuotedText?: boolean;
                        response?: boolean;
                  };
            }
            type ParentContent = string | Buffer;
            type OtherOptions = {
                  caption?: string;
            } & MiscMessageGenerationOptions;
      }
      namespace WhatsType {
            export type Method = 'conversation' | 'imageMessage' | 'videoMessage' | 'stickerMessage' | 'audioMessage';
            export type ParentWAMediaMessageContent<K extends Method> = (K extends 'imageMessage'
                  ? {
                          caption?: string;
                          jpegThumbnail?: Buffer;
                    }
                  : K extends 'videoMessage'
                  ? {
                          caption?: string;
                          gifPlayback?: Buffer;
                          jpegThumbnail?: Buffer;
                    }
                  : K extends 'audioMessage'
                  ? {
                          mimetype?: string;
                          filename?: string;
                    }
                  : any) & {
                  mentions?: string[];
            };
      }
}

interface Message extends proto.IWebMessageInfo {
      sender: string;
      admin: boolean;
      isGroup: boolean;
      gptNextPage: {
            conversationId?: string;
            parentMessageId?: string;
      };
      content: Message;
      from: string;
      body: string;
      parsedText: (text: string) => {
            result_parsed: import('violet').Whatsapp.ExtraContents['modify'];
            text_parsed: string;
      };
      mention: string[];
      baileysID: boolean;
      isBotSending: boolean;
      forward: boolean;
      edit: boolean;
      timestamp: number;
      type: keyof proto.IMessage;
      messageContextInfo?: WAProto.IContextInfo;
      downloadMediaMsg(type: 'stream' | 'buffer'): Promise<Buffer> | Buffer;
      quoted: {
            text: string;
            sender: string;
            admin: boolean;
            download(type: 'stream' | 'buffer'): Promise<Buffer>;
            content: proto.IWebMessageInfo & Message;
            owner: boolean;
            message: proto.IWebMessageInfo;
      };
}
export {};
