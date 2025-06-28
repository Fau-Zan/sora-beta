import {
      isJidGroup,
      proto,
      WAMessageStubType,
      downloadMediaMessage,
      isJidStatusBroadcast,
      jidNormalizedUser,
      GroupParticipant,
      GroupMetadata,
      normalizeMessageContent,
      getContentType,
      MessageUpsertType,
      WAProto,
} from '@whiskeysockets/baileys';
import { BaseClient } from '../handlers';
import { Whatsapp } from 'violet';
import { Logger } from '../utils';

class Message {
      public M: Whatsapp.IMessage;
      constructor(
            public client: BaseClient,
            public readonly message: {
                  messages: proto.IWebMessageInfo[];
                  type: MessageUpsertType;
            },
      ) {
            this.message = message;
            this.serializeM();
      }
      public emitNewMessage() {
            return this.client.emit('pair.cmd', this);
      }
      public async check(content: { query: 'j' | 'g' | 'p'; param?: string }) {
            const { pocket } = this.client;
            const config = await pocket
                  .get<import('violet').Whatsapp.IConfig>('config')
                  .then((value) => {
                        if (content.query === 'j')
                              return value.user?.find((predicate) => predicate.jid === content.param);
                        if (content.query === 'g')
                              return value.group?.find((predicate) => predicate.groupJid === content.param);
                        if (content.query === 'p') return value.botPublic;
                  })
                  .catch(() => {})
                  .finally(() => {});
      }

      public groupMetadata: GroupMetadata | undefined;
      public async serializeM(): Promise<any> {
            try {
                  const BotWaNumber = jidNormalizedUser(this.client.sock.authState.creds.me.id);
                  this.M = this.M ?? this.message.messages[0];
                  this.M.baileysID = this.M.key.id?.length === 16 || this.M.key.id?.startsWith('BAE5')!;
                  this.M.message =
                        this.M.message?.ephemeralMessage || this.M.message?.viewOnceMessage
                              ? normalizeMessageContent(this.M.message)
                              : this.M.message;
                  this.M.sender = this.M.key.fromMe
                        ? BotWaNumber
                        : this.M.key.participant ?? this.M.participant ?? this.M.key.remoteJid;
                  this.M.from = isJidGroup(this.M.key.remoteJid!) ? this.M.key.remoteJid! : this.M.sender;
                  this.M.isGroup = this.isInGroup;
                  if (this.M.isGroup)
                        this.groupMetadata = await this.client.sock
                              .groupMetadata(this.M.from!)
                              .catch(() => this.serializeM());
                  this.M.isBotSending = this.M.sender === BotWaNumber || this.M.status == 1;
                  this.M.admin = await this.isAdmin(this.M.sender);
                  if (isJidStatusBroadcast(this.M.from)) return void null;
                  if (this.M?.message?.reactionMessage)
                        this.client.emit('reaction', {
                              key: this.M.key,
                              reaction: {
                                    text: this.M.message.reactionMessage.text,
                              },
                              operation: (this.M.message.reactionMessage.text as string).length != 0 ? 'add' : 'remove',
                        });
                  if (this.M.messageStubType) this.onMessageStubType();
                  this.M.type = getContentType(this.M.message as proto.IMessage);
                  this.M.body =
                        this.M.message?.conversation ||
                        this.M.message?.extendedTextMessage?.text ||
                        (this.M.message?.[this.M.type as keyof proto.IMessage] as any)?.caption ||
                        null;
                  this.M.body = this.M.body?.trim().length === 0 ? undefined : this.M.body;
                  this.M.downloadMediaMsg = (type: 'stream' | 'buffer' = 'buffer') => {
                        return downloadMediaMessage(this.M, type, {
                              startByte: undefined,
                              endByte: undefined,
                        }) as Promise<Buffer>;
                  };
                  this.M.messageContextInfo = this.messageContextInfo;
                  if (this.messageContextInfo) {
                        const emitOnTagAll = () => {
                              this.client.emit('message.tag', {
                                    group: {
                                          id: this.groupMetadata?.id as string,
                                          name: this.groupMetadata?.subject as string,
                                    },
                                    from: this.M.quoted?.sender,
                                    tag: this.M.sender!,
                              });
                        };
                        type WAMessageQuoted = NonNullable<Whatsapp.IMessage['quoted']>;
                        const getContextInfo = this.messageContextInfo;
                        const WAContent = this.client.store.messages[this.M.from].get(
                              this.messageContextInfo.stanzaId!,
                        );
                        if (getContextInfo) {
                              this.M.quoted = {
                                    get message() {
                                          return getContextInfo.quotedMessage!;
                                    },
                                    get sender() {
                                          return getContextInfo.participant;
                                    },
                                    get content() {
                                          return WAContent!;
                                    },
                              } as WAMessageQuoted;
                              var getQuotedMessage =
                                    'quotedMessage' in getContextInfo ? getContextInfo.quotedMessage : null;
                              this.M.quoted.text = getQuotedMessage
                                    ? getQuotedMessage.conversation ||
                                      getQuotedMessage?.imageMessage?.caption ||
                                      getQuotedMessage?.videoMessage?.caption
                                    : String(' ');
                              this.M.quoted.download = async (type: 'stream' | 'buffer' = 'buffer') =>
                                    await this.M.quoted?.content?.downloadMediaMsg(type);
                              this.M.quoted.owner =
                                    this.M.quoted.sender ===
                                    jidNormalizedUser(this.client.sock.authState.creds.me?.id!);
                              this.M.quoted.admin = await this.isAdmin(this.M.quoted.sender);
                              if (this.isInGroup && (this.messageContextInfo?.mentionedJid as string[])?.length > 1) {
                                    const participant: string[] = this.groupMetadata?.participants.map(
                                          (us) => us.id as string,
                                    ) as string[];
                                    const mention = this.messageContextInfo.mentionedJid;
                                    if (participant.length === (mention as string[]).length) return void emitOnTagAll();
                              }
                        }
                  }
                  await this.client.sock.readMessages([this.M.key]);
                  if (this.emitNewMessage()) return void (await null);
            } catch (error) {
                  Logger.error(error);
            }
      }

      private async onMessageStubType() {
            switch (this.M.messageStubType) {
                  case WAMessageStubType.GROUP_PARTICIPANT_ADD:
                  case WAMessageStubType.GROUP_CREATE:
                  case WAMessageStubType.GROUP_PARTICIPANT_LEAVE:
                  case WAMessageStubType.GROUP_PARTICIPANT_REMOVE:
                        this.client.emit('group.action', {
                              group: {
                                    name: (await this.client.sock.groupMetadata(this.M.from)).subject,
                                    id: this.M.from,
                              },
                              participant: this.M.messageStubParameters as string[],
                              fromAdmin: this.M.messageStubType === 27 || this.M.messageStubType === 28 ? !0 : !1,
                              innerAction:
                                    this.M.messageStubType === 27 || this.M.messageStubType === 20 ? 'join' : 'leave',
                        });
                        break;
                  case WAMessageStubType.DISAPPEARING_MODE:
                  case 130:
                        break;
                  case WAMessageStubType.GROUP_PARTICIPANT_DEMOTE:
                  case WAMessageStubType.GROUP_PARTICIPANT_PROMOTE:
                        this.client.emit('participant.action', {
                              participant: this.M.messageStubParameters as string[],
                              setBy: this.M.sender,
                              innerAction: this.M.messageStubType == 29 ? 'promote' : 'demote',
                        });
            }
      }
      async getAdmin(): Promise<string[]> {
            const parseJid: GroupParticipant[] = (this.groupMetadata as GroupMetadata)?.participants.filter((user) => {
                  return user.admin === 'admin' || user.admin === 'superadmin';
            });
            return Promise.all(parseJid.map((value) => jidNormalizedUser(value.id)));
      }
      public newFlexId(): string {
            return `FLEX${Date.now().toString(36) + Math.random().toString(36).substr(2)}`.toUpperCase();
      }
      get messageContextInfo(): proto.IContextInfo {
            return (this.M.message?.[this.M.type] as WAProto.Message.IExtendedTextMessage)
                  ?.contextInfo as proto.IContextInfo;
      }

      private get isInGroup() {
            return isJidGroup(this.M.from);
      }

      private async isAdmin(user: string) {
            return this.isInGroup
                  ? (await this.getAdmin()).find((predicate) => predicate === user) !== undefined
                  : false;
      }
}
export { Message };
