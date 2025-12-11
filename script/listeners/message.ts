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
  WAMessage,
} from '@whiskeysockets/baileys'
import { BaseClient } from '../handlers'
import type { Whatsapp } from 'violet'
import { Logger } from '../utils'

interface IPouchMessageDoc {
  keyId: string
  type: MessageUpsertType
  message: proto.IWebMessageInfo
  deleted?: boolean
}

class Message {
  public M!: Whatsapp.IMessage
  public groupMetadata: GroupMetadata | undefined

  constructor(
    public client: BaseClient,
    public readonly message: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType }
  ) {
    this.message = message
    this.serializeM()
  }

  public emitNewMessage() {
    return this.client.emit('pair.cmd', this)
  }

  private async fetchQuotedFromStore(stanzaId?: string): Promise<proto.IWebMessageInfo | null> {
    try {
      if (!stanzaId) return null
      const doc = (await (this.client.store).getMessage(stanzaId)) as IPouchMessageDoc | null
      return doc?.message ?? null
    } catch {
      return null
    }
  }

  public async serializeM(): Promise<any> {
    try {
      const BotWaNumber = jidNormalizedUser(this.client.sock.authState.creds.me.id)
      this.M = this.M ?? this.message.messages[0]
      this.M.baileysID = this.M.key.id?.length === 16 || !!this.M.key.id?.startsWith('BAE5')
      this.M.message = this.M.message?.ephemeralMessage || this.M.message?.viewOnceMessage
        ? normalizeMessageContent(this.M.message)
        : this.M.message

      this.M.sender = this.M.key.fromMe
        ? BotWaNumber
        : (this.M.key.participant ?? (this.M).participant ?? this.M.key.remoteJid)!

      this.M.from = isJidGroup(this.M.key.remoteJid!) ? (this.M.key.remoteJid as string) : (this.M.sender as string)
      this.M.isGroup = this.isInGroup

      if (this.M.isGroup) {
        this.groupMetadata = await this.client.sock
          .groupMetadata(this.M.from!)
          .catch(() => this.serializeM())
      }

      this.M.isBotSending = this.M.sender === BotWaNumber || (this.M).status == 1
      this.M.admin = await this.isAdmin(this.M.sender as string)

      if (isJidStatusBroadcast(this.M.from as string)) return void null

      if (this.M?.message?.reactionMessage) {
        this.client.emit('reaction', {
          key: this.M.key,
          reaction: { text: this.M.message.reactionMessage.text },
          operation: (this.M.message.reactionMessage.text as string).length != 0 ? 'add' : 'remove',
        })
      }

      if (this.M.messageStubType) this.onMessageStubType()

      this.M.type = getContentType(this.M.message as proto.IMessage)
      this.M.body =
        (this.M.message)?.conversation ||
        (this.M.message)?.extendedTextMessage?.text ||
        (this.M.message as any)?.[this.M.type as keyof proto.IMessage]?.caption ||
        null
      this.M.body = (this.M.body)?.trim?.().length === 0 ? undefined : this.M.body

      this.M.downloadMediaMsg = (type: 'stream' | 'buffer' = 'buffer') => {
        return downloadMediaMessage(this.M as WAMessage, type, {
          startByte: undefined,
          endByte: undefined,
        }) as Promise<Buffer>
      }

      this.M.messageContextInfo = this.messageContextInfo
      if (this.messageContextInfo) {
        const emitOnTagAll = () => {
          this.client.emit('message.tag', {
            group: { id: this.groupMetadata?.id as string, name: this.groupMetadata?.subject as string },
            from: this.M.quoted?.sender,
            tag: this.M.sender!,
          })
        }

        type WAMessageQuoted = NonNullable<Whatsapp.IMessage['quoted']>
        const getContextInfo = this.messageContextInfo

        const quotedId = getContextInfo.stanzaId!
        const quotedRaw = await this.fetchQuotedFromStore(quotedId)

        this.M.quoted = {
          get message() {
            return getContextInfo.quotedMessage!
          },
          get sender() {
            return getContextInfo.participant
          },
          get content() {
            return quotedRaw
              ? {
                  key: quotedRaw.key,
                  message: quotedRaw.message,
                  downloadMediaMsg: (type: 'stream' | 'buffer' = 'buffer') =>
                    downloadMediaMessage(quotedRaw as WAMessage, type, {
                      startByte: undefined,
                      endByte: undefined,
                    }) as Promise<Buffer>,
                }
              : undefined
          },
        } as WAMessageQuoted

        const embeddedQuoted = 'quotedMessage' in getContextInfo ? (getContextInfo).quotedMessage : null
        const quotedSource = embeddedQuoted || quotedRaw?.message || null

        ;(this.M.quoted).text = quotedSource
          ? (quotedSource).conversation ||
            (quotedSource)?.imageMessage?.caption ||
            (quotedSource)?.videoMessage?.caption ||
            undefined
          : ' '

        ;(this.M.quoted).download = async (type: 'stream' | 'buffer' = 'buffer') =>
          (this.M.quoted)?.content?.downloadMediaMsg
            ? await (this.M.quoted).content.downloadMediaMsg(type)
            : Buffer.from([])

        ;(this.M.quoted).owner =
          (this.M.quoted).sender === jidNormalizedUser(this.client.sock.authState.creds.me?.id!)
        ;(this.M.quoted).admin = await this.isAdmin((this.M.quoted).sender)

        if (this.isInGroup && (this.messageContextInfo?.mentionedJid as string[])?.length > 1) {
          const participant: string[] = (this.groupMetadata?.participants.map((us) => us.id as string) ?? []) as string[]
          const mention = this.messageContextInfo.mentionedJid as string[]
          if (participant.length && participant.length === mention.length) return void emitOnTagAll()
        }
      }

      await this.client.sock.readMessages([this.M.key])
      if (this.emitNewMessage()) return void (await null)
    } catch (error) {
      Logger.error(error)
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
            name: (await this.client.sock.groupMetadata(this.M.from as string)).subject,
            id: this.M.from,
          },
          participant: this.M.messageStubParameters as string[],
          fromAdmin: this.M.messageStubType === 27 || this.M.messageStubType === 28 ? !0 : !1,
          innerAction: this.M.messageStubType === 27 || this.M.messageStubType === 20 ? 'join' : 'leave',
        })
        break
      case WAMessageStubType.DISAPPEARING_MODE:
      case 130:
        break
      case WAMessageStubType.GROUP_PARTICIPANT_DEMOTE:
      case WAMessageStubType.GROUP_PARTICIPANT_PROMOTE:
        this.client.emit('participant.action', {
          participant: this.M.messageStubParameters as string[],
          setBy: this.M.sender,
          innerAction: (this.M.messageStubType as number) == 29 ? 'promote' : 'demote',
        })
    }
  }

  async getAdmin(): Promise<string[]> {
    const parseJid: GroupParticipant[] = (this.groupMetadata as GroupMetadata)?.participants.filter((user) => {
      return user.admin === 'admin' || user.admin === 'superadmin'
    })
    return Promise.all(parseJid.map((value) => jidNormalizedUser(value.id)))
  }

  public newFlexId(): string {
    return `FLEX${(Date.now().toString(36) + Math.random().toString(36).substr(2)).toUpperCase()}`
  }

  get messageContextInfo(): proto.IContextInfo {
    return (this.M.message?.[this.M.type] as WAProto.Message.IExtendedTextMessage)?.contextInfo as proto.IContextInfo
  }

  private get isInGroup() {
    return isJidGroup(this.M.from as string)
  }

  private async isAdmin(user: string) {
    return this.isInGroup ? (await this.getAdmin()).find((predicate) => predicate === user) !== undefined : false
  }
}

export { Message }
