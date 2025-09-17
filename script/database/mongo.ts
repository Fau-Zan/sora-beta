import { MongoClient, Db, Collection, ClientSession, AnyBulkWriteOperation, Document, IndexSpecification } from 'mongodb'
import { Logger, globalQueue} from '../utils'

export type MongoBaseOpts = {
  uri: string
  dbName: string
  serializeWrites?: boolean
  retries?: number
  backoffMs?: number
}

export class MongoBase {
  private client: MongoClient
  private db!: Db
  private isConnected = false
  private opts: Required<Pick<MongoBaseOpts, 'serializeWrites' | 'retries' | 'backoffMs'>>

  constructor(private cfg: MongoBaseOpts) {
    this.client = new MongoClient(cfg.uri)
    this.opts = {
      serializeWrites: cfg.serializeWrites ?? true,
      retries: cfg.retries ?? 3,
      backoffMs: cfg.backoffMs ?? 150,
    }
  }

  async connect() {
    if (this.isConnected) return this
    await this.client.connect()
    this.db = this.client.db(this.cfg.dbName)
    this.isConnected = true
    return this
  }

  col<T extends Document = Document>(name: string): Collection<T> {
    if (!this.isConnected) throw new Error('MongoBase not connected. Call connect() first.')
    return this.db.collection<T>(name)
  }

  async ensureIndexes(name: string, indexes: Array<{ key: IndexSpecification; options?: any }>) {
    const col = this.col(name)
    await Promise.all(indexes.map((i) => col.createIndex(i.key as any, i.options)))
  }

  private async withRetry<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let attempt = 0
    const run = async (): Promise<T> => {
      try {
        return await fn()
      } catch (err: any) {
        const retriable =
          !!err &&
          (err.code === 112 || err.code === 11600 || err.code === 251 || err.code === 89 ||
            err.message?.includes('E11000') === false)
        if (attempt >= this.opts.retries || !retriable) throw err
        attempt++
        const delay = this.opts.backoffMs * attempt
        await new Promise((r) => setTimeout(r, delay))
        return run()
      }
    }

    if (!this.opts.serializeWrites) return run()
    return globalQueue.add_and_wait(`mongo:${key}`, run) as Promise<T>
  }

  async upsertOne<T extends Document>(name: string, filter: Partial<T>, update: Partial<T>, upsert = true) {
    const col = this.col<T>(name)
    return this.withRetry(name, async () => col.updateOne(filter as any, { $set: update }, { upsert }))
  }

  async bulkUpsert<T extends Document>(name: string, docs: T[], key: keyof T) {
    if (!docs.length) return { ok: 1, n: 0 }
    const col = this.col<T>(name)
    const ops: AnyBulkWriteOperation<T>[] = docs.map((d) => ({
      updateOne: { filter: { [key]: (d as any)[key] } as any, update: { $set: d }, upsert: true },
    }))
    return this.withRetry(name, async () => col.bulkWrite(ops, { ordered: false }))
  }

  async findOne<T extends Document>(name: string, query: Partial<T>, projection?: any): Promise<import('mongodb').WithId<T> | null> {
    const col = this.col<T>(name)
    return col.findOne(query as any, projection ? { projection } : undefined)
  }

  async findMany<T extends Document>(
    name: string,
    query: Partial<T> = {},
    opts?: { projection?: any; sort?: any; limit?: number },
  ): Promise<import('mongodb').WithId<T>[]> {
    const col = this.col<T>(name)
    let cursor = col.find(query as any, opts?.projection ? { projection: opts.projection } : undefined)
    if (opts?.sort) cursor = cursor.sort(opts.sort)
    if (opts?.limit) cursor = cursor.limit(opts.limit)
    return cursor.toArray()
  }

  async deleteMany<T extends Document>(name: string, query: Partial<T>) {
    const col = this.col<T>(name)
    return this.withRetry(name, async () => col.deleteMany(query as any))
  }

  async withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = this.client.startSession()
    try {
      let result!: T
      await session.withTransaction(async () => {
        result = await fn(session)
      })
      return result
    } finally {
      await session.endSession()
    }
  }

  async close() {
    try {
      await this.client.close()
    } catch {}
    this.isConnected = false
  }
}
