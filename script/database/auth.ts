import * as baileys from '@whiskeysockets/baileys'
import type { AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys'
import { MongoBase } from '.'
import { Logger } from '../utils'

const { proto, BufferJSON, initAuthCreds } = baileys

type AuthDoc = { _id: string; auth: string }

const KEY_MAP: { [K in keyof SignalDataTypeMap]: string } = {
  'pre-key': 'preKeys',
  session: 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory',
}

export async function singleSessionMongo(sessionId: string, uri: string, dbName: string) {
  const db = await new MongoBase({ uri, dbName, serializeWrites: true }).connect()

  await db.ensureIndexes('wa_auth', [ { key: { _id: 1 }, options: { unique: true } } ])

  let creds: AuthenticationCreds
  let keys: Record<string, any>

  const loaded = await db.findOne<AuthDoc>('wa_auth', { _id: sessionId }).catch(() => null as any)
  if (loaded?.auth) {
    try {
      const parsed = JSON.parse(loaded.auth, BufferJSON.reviver)
      creds = parsed?.creds ?? initAuthCreds()
      keys = parsed?.keys ?? {}
    } catch {
      creds = initAuthCreds()
      keys = {}
    }
  } else {
    creds = initAuthCreds()
    keys = {}
  }

  const persist = async (payload: { creds: AuthenticationCreds; keys: any }) => {
    await db.upsertOne<AuthDoc>('wa_auth', { _id: sessionId } as any, { _id: sessionId, auth: JSON.stringify(payload, BufferJSON.replacer, 2) })
  }

  const saveState = async () => {
    try {
      const existing = await db.findOne<AuthDoc>('wa_auth', { _id: sessionId })
      let input = { creds, keys }
      if (existing?.auth) {
        try {
          const current = JSON.parse(existing.auth, BufferJSON.reviver)
          input = Object.assign({}, current, input)
        } catch {}
      }
      await persist(input)
    } catch (e) {
      Logger.error('singleSessionMongo: persist failed', e)
    }
  }

  return {
    state: {
      creds,
      keys: {
        get: (type: keyof SignalDataTypeMap, ids: string[]) => {
          const key = KEY_MAP[type]
          return ids.reduce((dict: any, id: string) => {
            let value = keys[key]?.[id]
            if (value) {
              if (type === 'app-state-sync-key') {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              dict[id] = value
            }
            return dict
          }, {})
        },
        set: async (data: Partial<Record<keyof SignalDataTypeMap, any>>) => {
          for (const raw in data) {
            const k = raw as keyof SignalDataTypeMap
            const mapped = KEY_MAP[k]
            keys[mapped] = keys[mapped] || {}
            Object.assign(keys[mapped], data[k])
          }
          await saveState()
        },
      },
    },
    saveState,
    close: async () => { await db.close() },
  }
}
