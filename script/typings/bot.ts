import { WAProto } from '@whiskeysockets/baileys';
import { Message } from '../listeners';
declare module 'violet' {
      namespace Whatsapp {
            type CmdProperty = ((cli: Whatsapp.ExtraContents) => any) & Whatsapp.ICmd;
            interface FollowUp {
                  readonly setting: boolean;
                  client: import('violet').Whatsapp.IClient;
                  M: import('violet').Whatsapp.IWaMess;
            }
            interface IConfig extends PouchDB.Core.IdMeta {
                  botPublic?: true;
                  group?: { groupJid: string; date?: Date | null }[];
                  user?: { jid: string; date?: Date | null }[];
                  owner?: string;
            }
      }

      namespace Events {
            interface MessageEvent {
                  'store.update'(): void;
                  'pair.cmd'(proto: {
                        client: Whatsapp.IClient
                        M: Whatsapp.IMessage
                  }): void;
                  'reaction'(proto: {
                        key: WAProto.IMessageKey;
                        reaction: WAProto.IReaction;
                        operation: 'add' | 'remove';
                  }): void;
                  'group.action'(user: {
                        group: {
                              id: string;
                              name: string;
                        };
                        participant: string[];
                        fromAdmin: boolean;
                        innerAction: 'join' | 'leave';
                  }): Promise<void> | void;
                  'end'(): void;
                  'participant.action'(user: {
                        participant: string[];
                        setBy: string;
                        innerAction: 'promote' | 'demote';
                  }): void;
            }
      }
}

export namespace Bot {
      export interface VideoMessageOptions {
            readonly gif?: boolean;
      }
}
