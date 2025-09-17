import DB from 'pouchdb'
import pouchdb_find from 'pouchdb-find'
import * as pouchdb_upsert from 'pouchdb-upsert'
import { Logger } from '../utils'
DB.plugin(pouchdb_find)
DB.plugin(pouchdb_upsert)

export class Database extends DB {
  constructor(
    public name: string = 'zan',
    public config: PouchDB.Configuration.DatabaseConfiguration = {
      auto_compaction: true,
    }
  ) {
    super(name, config)
  }

  public async queryItemSelector<T extends object>(
    selector: PouchDB.Find.Selector
  ): Promise<PouchDB.Find.FindResponse<T>> {
    return (await this.find({ selector })) as PouchDB.Find.FindResponse<T>
  }

  public async findOne<T>(id: string): Promise<PouchDB.Core.Document<T> | null> {
    try {
      const doc = await this.get<T>(id)
      return doc as unknown as PouchDB.Core.Document<T>
    } catch (err: any) {
      if (err?.status === 404) return null
      throw err
    }
  }
  public async putWithRev<T>(
    doc: PouchDB.Core.Document<T> & Partial<PouchDB.Core.RevisionIdMeta>,
    ensureRev = false
  ): Promise<PouchDB.Core.Response> {
    if (!doc._id) {
      Logger.error('Missing _id property. Include a unique _id to insert.')
      throw new Error('Missing _id')
    }

    if (ensureRev && !doc._rev) {
      const existing = await this.findOne<any>(doc._id)
      if (existing?._rev) doc._rev = existing._rev
    }

    return this.put(doc)
  }

  public async saveOrUpdateDocument<T extends object>(
    doc: PouchDB.Core.Document<T> & Partial<PouchDB.Core.RevisionIdMeta>
  ): Promise<PouchDB.Core.Response> {
    const existing = await this.findOne<any>(doc._id)
    const merged = existing ? Object.assign({}, existing, doc) : doc
    return this.putWithRev(merged, !!existing)
  }

  public async update<T extends Record<string, any>>(
    id: string,
    patch: T,
    retries = 3,
    delayMs = 150
  ): Promise<boolean> {
    for (let i = 0; i <= retries; i++) {
      try {
        const existing = await this.findOne<Record<string, any>>(id)
        const next = Object.assign({}, existing ?? { _id: id }, patch)
        await this.putWithRev(next, !!existing)
        return true
      } catch (err: any) {
        const last = i === retries
        if (last || err?.status !== 409) {
          if (last) Logger.error(`Update failed for ${id}:`, err)
          if (last) throw err
        }
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
      }
    }
    return false
  }

  public async removeDocument<T>(doc: Partial<T> & PouchDB.Core.IdMeta & PouchDB.Core.RevisionIdMeta) {
    return this.remove(doc)
  }
  
  public async reset(): Promise<Database> {
    await this.destroy()
    return new Database(this.name, (this as any).__opts)
  }
}
