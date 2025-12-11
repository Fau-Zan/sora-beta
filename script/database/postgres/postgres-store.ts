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
import { Logger } from '../../utils'
import { PostgresBase } from '..'

export type PostgresStoreOptions = {
  namespace?: string
  connectionString: string
  debounceMs?: number
}

declare module 'violet' {
  namespace WhatsType {
    interface IPostgresStore {
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

export async function createPostgresStore(opts: PostgresStoreOptions) {
  const ns = (opts.namespace ?? 'wa').replace(/:$/, '')
  const debounceMs = opts.debounceMs ?? 300

  const db = await new PostgresBase({ connectionString: opts.connectionString, serializeWrites: true }).connect()

  await db.ensureTable(
    `${ns}_chats`,
    `
      id VARCHAR(255) PRIMARY KEY,
      name TEXT,
      "unreadCount" INTEGER,
      "lastMessage" TEXT,
      "lastMessageRecvTimestamp" BIGINT,
      "lastMessageSentTimestamp" BIGINT,
      "liveLocationJid" TEXT,
      "isLiveLocationActive" BOOLEAN,
      "conversationTimestamp" BIGINT,
      "muteEndTime" BIGINT,
      "isMuted" BOOLEAN,
      "isMarkedSpam" BOOLEAN,
      "isArchived" BOOLEAN,
      "canFan" BOOLEAN,
      "isPin" BOOLEAN,
      "archive" BOOLEAN,
      data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `
  )

  await db.ensureTable(
    `${ns}_contacts`,
    `
      id VARCHAR(255) PRIMARY KEY,
      name TEXT,
      notify TEXT,
      "isContact" BOOLEAN,
      "isMyContact" BOOLEAN,
      "isBusiness" BOOLEAN,
      "isEnterprise" BOOLEAN,
      "verifiedName" TEXT,
      "verifiedLevel" TEXT,
      "businessAccountLinkUrl" TEXT,
      "statusMute" TEXT,
      "pictureUrl" TEXT,
      data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `
  )

  await db.ensureTable(
    `${ns}_messages`,
    `
      "keyId" VARCHAR(255) PRIMARY KEY,
      "remoteJid" VARCHAR(255),
      type TEXT,
      "messageTimestamp" BIGINT,
      message JSONB,
      deleted BOOLEAN DEFAULT FALSE,
      data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `
  )

  await db.ensureIndexes(`${ns}_chats`, [{ columns: ['id'], unique: true }])
  await db.ensureIndexes(`${ns}_contacts`, [{ columns: ['id'], unique: true }])
  await db.ensureIndexes(`${ns}_messages`, [
    { columns: ['keyId'], unique: true },
    { columns: ['remoteJid', 'keyId'] },
    { columns: ['messageTimestamp'] },
  ])

  const mem = {
    chats: new Map<string, any>(),
    contacts: new Map<string, any>(),
    messages: new Map<string, any>(),
  }

  const mapChatDoc = (c: Chat) => {
    const schemaFields = ['id', 'name', 'unreadCount', 'lastMessage', 'lastMessageRecvTimestamp', 'lastMessageSentTimestamp', 'liveLocationJid', 'isLiveLocationActive', 'conversationTimestamp', 'muteEndTime', 'isMuted', 'isMarkedSpam', 'isArchived', 'canFan', 'isPin', 'archive']
    const excludeFields = ['messages'] // Fields to never store even in data JSONB
    const doc: any = { id: c.id }
    const extraData: any = {}
    
    for (const [key, value] of Object.entries(c)) {
      if (excludeFields.includes(key)) {
        // Skip excluded fields entirely
        continue
      } else if (schemaFields.includes(key)) {
        doc[key] = value
      } else if (key !== 'id') {
        extraData[key] = value
      }
    }
    
    if (Object.keys(extraData).length > 0) {
      doc.data = extraData
    }
    return doc
  }

  const mapContactDoc = (c: Contact) => {
    const schemaFields = ['id', 'name', 'notify', 'isContact', 'isMyContact', 'isBusiness', 'isEnterprise', 'verifiedName', 'verifiedLevel', 'businessAccountLinkUrl', 'statusMute', 'pictureUrl']
    const doc: any = { id: c.id }
    const extraData: any = {}
    
    for (const [key, value] of Object.entries(c)) {
      if (schemaFields.includes(key)) {
        doc[key] = value
      } else if (key !== 'id') {
        extraData[key] = value
      }
    }
    
    if (Object.keys(extraData).length > 0) {
      doc.data = extraData
    }
    return doc
  }

  const mapMessageDoc = (m: any, keyId?: string) => {
    const schemaFields = ['keyId', 'remoteJid', 'type', 'messageTimestamp', 'message', 'deleted']
    const doc: any = {}
    const extraData: any = {}
    
    // Set keyId
    if (keyId) {
      doc.keyId = keyId
    }
    
    for (const [key, value] of Object.entries(m)) {
      if (schemaFields.includes(key)) {
        doc[key] = value
      } else if (key !== 'keyId') {
        extraData[key] = value
      }
    }
    
    if (Object.keys(extraData).length > 0) {
      doc.data = extraData
    }
    return doc
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
      Logger.error?.(`postgresStore.schedule(${kind}) failed`, err)
    }
  }

  const flush = async (kind: 'chat' | 'contact' | 'msg') => {
    try {
      const batch = kind === 'chat' ? chatsBatch : kind === 'contact' ? contactsBatch : msgsBatch
      if (!batch.size) return
      const docs = Array.from(batch.values())
      const tableName = kind === 'msg' ? `${ns}_messages` : `${ns}_${kind === 'chat' ? 'chats' : 'contacts'}`
      const idKey = kind === 'msg' ? 'keyId' : 'id'
      
      // Debug: log first doc keys
      if (docs.length > 0 && kind === 'chat') {
        const keys = Object.keys(docs[0])
        Logger.debug?.(`flush(${kind}): doc keys = [${keys.join(', ')}]`)
      }
      
      await db.bulkUpsert(tableName, docs, idKey as any)
      batch.clear()
    } catch (err) {
      Logger.error?.(`postgresStore.flush(${kind}) failed`, err)
    }
  }

  async function load() {
    try {
      const rows = await db.findMany(`${ns}_chats`)
      for (const doc of rows) mem.chats.set(doc.id, doc)
    } catch (e) {
      Logger.warn?.('postgresStore.load failed', e)
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
      Logger.warn?.('postgresStore.getChat failed', err)
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
      Logger.warn?.('postgresStore.getContact failed', err)
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
      Logger.warn?.('postgresStore.getMessage failed', err)
      return null
    }
  }

  function bind(ev: BaileysEventEmitter) {
    ev.on('chats.upsert', (updates: Chat[]) => {
      try {
        for (const c of updates) {
          const mapped = mapChatDoc(c)
          const doc = { ...mem.chats.get(c.id), ...mapped }
          mem.chats.set(c.id, doc)
          chatsBatch.set(c.id, doc)
        }
        schedule('chat')
      } catch (err) {
        Logger.error?.('postgresStore.chats.upsert failed', err)
      }
    })

    ev.on('chats.update', (updates: any[]) => {
      try {
        for (const u of updates) {
          if (!u.id) continue
          const mapped = mapChatDoc(u as Chat)
          const doc = { ...mem.chats.get(u.id), ...mapped }
          mem.chats.set(u.id, doc)
          chatsBatch.set(u.id, doc)
        }
        schedule('chat')
      } catch (err) {
        Logger.error?.('postgresStore.chats.update failed', err)
      }
    })

    ev.on('contacts.upsert', (list: Contact[]) => {
      try {
        for (const c of list) {
          const doc = { ...mem.contacts.get(c.id), ...mapContactDoc(c) }
          mem.contacts.set(c.id, doc)
          contactsBatch.set(c.id, doc)
        }
        schedule('contact')
      } catch (err) {
        Logger.error?.('postgresStore.contacts.upsert failed', err)
      }
    })

    ev.on('contacts.update', (updates: Partial<Contact>[]) => {
      try {
        for (const u of updates) {
          if (!u.id) continue
          const mapped = mapContactDoc(u as Contact)
          const doc = { ...mem.contacts.get(u.id), ...mapped }
          mem.contacts.set(u.id, doc)
          contactsBatch.set(u.id, doc)
        }
        schedule('contact')
      } catch (err) {
        Logger.error?.('postgresStore.contacts.update failed', err)
      }
    })

    ev.on('messages.upsert', (arg: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType; requestId?: string }) => {
      try {
        const { messages, type } = arg
        for (const m of messages) {
          const keyId = m.key?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const remoteJid = m.key?.remoteJid || ''
          const messageTimestamp = m.messageTimestamp ? Number(m.messageTimestamp) : Date.now()
          const doc = { keyId, type, message: m, remoteJid, messageTimestamp }
          mem.messages.set(keyId, doc)
          msgsBatch.set(keyId, doc)
        }
        schedule('msg')
      } catch (err) {
        Logger.error?.('postgresStore.messages.upsert failed', err)
      }
    })

    ev.on('messages.update', (updates: WAMessageUpdate[]) => {
      try {
        for (const u of updates) {
          const keyId = u.key?.id
          if (!keyId) continue
          const curr = mem.messages.get(keyId) ?? { keyId, remoteJid: u.key?.remoteJid || '' }
          const mapped = mapMessageDoc(u, keyId)
          const doc = { ...curr, ...mapped }
          mem.messages.set(keyId, doc)
          msgsBatch.set(keyId, doc)
        }
        schedule('msg')
      } catch (err) {
        Logger.error?.('postgresStore.messages.update failed', err)
      }
    })

    ev.on('messages.delete', (d: { keys: WAMessageKey[] } | { jid: string; all: true }) => {
      try {
        if ('keys' in d) {
          for (const k of d.keys) {
            const keyId = k.id
            if (!keyId) continue
            const curr = mem.messages.get(keyId)
            const mapped = mapMessageDoc({ deleted: true }, keyId)
            const doc = { ...(curr ?? { keyId, remoteJid: k.remoteJid || '' }), ...mapped }
            mem.messages.set(keyId, doc)
            msgsBatch.set(keyId, doc)
          }
        } else if ('all' in d && d.all) {
          const target = d.jid
          for (const [id, val] of mem.messages) {
            if (val?.remoteJid === target) {
              const mapped = mapMessageDoc({ deleted: true }, id)
              const doc = { ...val, ...mapped }
              mem.messages.set(id, doc)
              msgsBatch.set(id, doc)
            }
          }
        }
        schedule('msg')
      } catch (err) {
        Logger.error?.('postgresStore.messages.delete failed', err)
      }
    })

    ;(ev as any).on('connection.update', (arg: Partial<ConnectionState>) => {
      try {
        if (arg?.connection === 'close') {
          Promise.all([flush('chat'), flush('contact'), flush('msg')]).catch(() => {})
        }
      } catch (err) {
        Logger.error?.('postgresStore.connection.update failed', err)
      }
    })
  }

  async function close() {
    try {
      await db.close()
    } catch {}
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
