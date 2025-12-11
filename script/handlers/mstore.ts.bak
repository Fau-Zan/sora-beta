import type {
  BaileysEventEmitter,
  BufferedEventData,
  Chat,
  ConnectionState,
  Contact,
  MessageUpsertType,
  proto,
  WAMessageKey,
  WAMessageUpdate,
} from '@whiskeysockets/baileys'
import { Logger } from '../utils'
import { MongoBase } from '../database'

export type MongoStoreOptions = {
  namespace?: string
  uri: string
  dbName: string
  debounceMs?: number
}

declare module 'violet' {
  namespace WhatsType {
    interface IMongoStore {
      bind(ev: any): void
      load(): Promise<void>
      getChat(id: string): Promise<any | null>
      getContact(jid: string): Promise<any | null>
      getMessage(keyId: string): Promise<any | null>
      getAllChats(): Promise<any[]>
      getAllContacts(): Promise<any[]>
      getAllMessages(params?: { jid?: string; limit?: number }): Promise<any[]>
      close(): Promise<void>
    }
  }
}

export async function createMongoStore(opts: MongoStoreOptions) {
  const ns = (opts.namespace ?? 'wa').replace(/:$/, '')
  const debounceMs = opts.debounceMs ?? 300

  const db = await new MongoBase({ uri: opts.uri, dbName: opts.dbName, serializeWrites: true }).connect()

  const mem = {
    chats: new Map<string, any>(),
    contacts: new Map<string, any>(),
    messages: new Map<string, any>(),
  }

  const chatsBatch = new Map<string, any>()
  const contactsBatch = new Map<string, any>()
  const msgsBatch = new Map<string, any>()

  let chatsTimer: NodeJS.Timeout | null = null
  let contactsTimer: NodeJS.Timeout | null = null
  let msgsTimer: NodeJS.Timeout | null = null

  const schedule = (kind: 'chat' | 'contact' | 'msg') => {
    try {
      const flushKind = () => void flush(kind)
      if (kind === 'chat') {
        if (chatsTimer) clearTimeout(chatsTimer)
        chatsTimer = setTimeout(flushKind, debounceMs)
      } else if (kind === 'contact') {
        if (contactsTimer) clearTimeout(contactsTimer)
        contactsTimer = setTimeout(flushKind, debounceMs)
      } else {
        if (msgsTimer) clearTimeout(msgsTimer)
        msgsTimer = setTimeout(flushKind, debounceMs)
      }
    } catch (err) {
      Logger.error?.(`mongoStore.schedule(${kind}) failed`, err)
    }
  }

  const flush = async (kind: 'chat' | 'contact' | 'msg') => {
    try {
      const batch = kind === 'chat' ? chatsBatch : kind === 'contact' ? contactsBatch : msgsBatch
      if (!batch.size) return
      const docs = Array.from(batch.values())
      if (kind === 'msg') await db.bulkUpsert(`${ns}_messages`, docs, 'keyId' as any)
      else await db.bulkUpsert(`${ns}_${kind === 'chat' ? 'chats' : 'contacts'}`, docs, 'id' as any)
      batch.clear()
    } catch (err) {
      Logger.error?.(`mongoStore.flush(${kind}) failed`, err)
    }
  }

  async function load() {
    try {
      await db.ensureIndexes(`${ns}_chats`, [{ key: { id: 1 }, options: { unique: true } }])
      await db.ensureIndexes(`${ns}_contacts`, [{ key: { id: 1 }, options: { unique: true } }])
      await db.ensureIndexes(`${ns}_messages`, [
        { key: { keyId: 1 }, options: { unique: true } },
        { key: { remoteJid: 1, keyId: -1 } },
        { key: { 'message.messageTimestamp': -1 } },
      ])
      const rows = await db.findMany(`${ns}_chats`)
      for (const doc of rows) mem.chats.set(doc.id, doc)
    } catch (e) {
      Logger.warn?.('mongoStore.load failed', e)
    }
  }

  // API: single getters ---------------------------------------------------
  async function getChat(chatId: string) {
    if (mem.chats.has(chatId)) return mem.chats.get(chatId)
    try {
      const doc = await db.findOne(`${ns}_chats`, { id: chatId })
      if (doc) mem.chats.set(chatId, doc)
      return doc
    } catch (err) {
      Logger.warn?.('mongoStore.getChat failed', err)
      return null
    }
  }

  async function getContact(jid: string) {
    if (mem.contacts.has(jid)) return mem.contacts.get(jid)
    try {
      const doc = await db.findOne(`${ns}_contacts`, { id: jid })
      if (doc) mem.contacts.set(jid, doc)
      return doc
    } catch (err) {
      Logger.warn?.('mongoStore.getContact failed', err)
      return null
    }
  }

  async function getMessage(keyId: string) {
    if (mem.messages.has(keyId)) return mem.messages.get(keyId)
    try {
      const doc = await db.findOne(`${ns}_messages`, { keyId })
      if (doc) mem.messages.set(keyId, doc)
      return doc
    } catch (err) {
      Logger.warn?.('mongoStore.getMessage failed', err)
      return null
    }
  }

  function bind(ev: BaileysEventEmitter) {
    ev.on('chats.upsert', (updates: Chat[]) => {
      try {
        for (const c of updates) {
          const doc = { ...mem.chats.get(c.id), ...c, id: c.id }
          mem.chats.set(c.id, doc)
          chatsBatch.set(c.id, doc)
        }
        schedule('chat')
      } catch (err) {
        Logger.error?.('mongoStore.chats.upsert failed', err)
      }
    })

    ev.on(
      'chats.update',
      (updates: Array<
        Partial<proto.IConversation & { lastMessageRecvTimestamp?: number } & { conditional: (bufferedData: BufferedEventData) => boolean | undefined }>
      >) => {
        try {
          for (const u of updates) {
            if (!u.id) continue
            const doc = { ...mem.chats.get(u.id), ...u, id: u.id }
            mem.chats.set(u.id, doc)
            chatsBatch.set(u.id, doc)
          }
          schedule('chat')
        } catch (err) {
          Logger.error?.('mongoStore.chats.update failed', err)
        }
      }
    )

    ev.on('contacts.upsert', (list: Contact[]) => {
      try {
        for (const c of list) {
          const doc = { ...mem.contacts.get(c.id), ...c, id: c.id }
          mem.contacts.set(c.id, doc)
          contactsBatch.set(c.id, doc)
        }
        schedule('contact')
      } catch (err) {
        Logger.error?.('mongoStore.contacts.upsert failed', err)
      }
    })

    ev.on('contacts.update', (updates: Partial<Contact>[]) => {
      try {
        for (const u of updates) {
          if (!u.id) continue
          const doc = { ...mem.contacts.get(u.id), ...u, id: u.id }
          mem.contacts.set(u.id, doc)
          contactsBatch.set(u.id, doc)
        }
        schedule('contact')
      } catch (err) {
        Logger.error?.('mongoStore.contacts.update failed', err)
      }
    })

    ev.on('messages.upsert', (arg: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType; requestId?: string }) => {
      try {
        const { messages, type } = arg
        for (const m of messages) {
          const keyId = m.key?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const remoteJid = m.key?.remoteJid || ''
          const doc = { keyId, type, message: m, remoteJid }
          mem.messages.set(keyId, doc)
          msgsBatch.set(keyId, doc)
        }
        schedule('msg')
      } catch (err) {
        Logger.error?.('mongoStore.messages.upsert failed', err)
      }
    })

    ev.on('messages.update', (updates: WAMessageUpdate[]) => {
      try {
        for (const u of updates) {
          const keyId = u.key?.id
          if (!keyId) continue
          const curr = mem.messages.get(keyId) ?? { keyId, remoteJid: u.key?.remoteJid || '' }
          const doc = { ...curr, ...u }
          mem.messages.set(keyId, doc)
          msgsBatch.set(keyId, doc)
        }
        schedule('msg')
      } catch (err) {
        Logger.error?.('mongoStore.messages.update failed', err)
      }
    })

    ev.on('messages.delete', (d: { keys: WAMessageKey[] } | { jid: string; all: true }) => {
      try {
        if ('keys' in d) {
          for (const k of d.keys) {
            const keyId = k.id
            if (!keyId) continue
            const curr = mem.messages.get(keyId)
            const doc = { ...(curr ?? { keyId, remoteJid: k.remoteJid || '' }), deleted: true }
            mem.messages.set(keyId, doc)
            msgsBatch.set(keyId, doc)
          }
        } else if ('all' in d && d.all) {
          const target = d.jid
          for (const [id, val] of mem.messages) {
            if (val?.remoteJid === target) {
              const doc = { ...val, deleted: true }
              mem.messages.set(id, doc)
              msgsBatch.set(id, doc)
            }
          }
        }
        schedule('msg')
      } catch (err) {
        Logger.error?.('mongoStore.messages.delete failed', err)
      }
    })

    ;(ev as any).on('connection.update', (arg: Partial<ConnectionState>) => {
      try {
        if (arg?.connection === 'close') {
          Promise.all([flush('chat'), flush('contact'), flush('msg')]).catch(() => {})
        }
      } catch (err) {
        Logger.error?.('mongoStore.connection.update failed', err)
      }
    })
  }

  async function close() {
    try { await db.close() } catch {}
  }

  return {
    bind,
    load,
    getChat,
    getContact,
    getMessage,
    close,
  }
}
