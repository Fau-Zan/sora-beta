import { Pool, QueryResult, PoolClient } from 'pg'
import { Logger, globalQueue } from '../utils'

export type PostgresBaseOpts = {
  connectionString: string
  serializeWrites?: boolean
  retries?: number
  backoffMs?: number
}

export class PostgresBase {
  private pool: Pool
  private isConnected = false
  private opts: Required<Pick<PostgresBaseOpts, 'serializeWrites' | 'retries' | 'backoffMs'>>

  constructor(private cfg: PostgresBaseOpts) {
    this.pool = new Pool({ 
      connectionString: cfg.connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    })
    this.opts = {
      serializeWrites: cfg.serializeWrites ?? true,
      retries: cfg.retries ?? 3,
      backoffMs: cfg.backoffMs ?? 150,
    }
  }

  async connect() {
    if (this.isConnected) return this
    const client = await this.pool.connect()
    client.release()
    this.isConnected = true
    return this
  }

  async query(sql: string, values?: any[]): Promise<QueryResult> {
    return this.pool.query(sql, values)
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async ensureTable(name: string, schema: string) {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${name} (
        ${schema}
      )
    `)
  }

  async ensureIndexes(tableName: string, indexes: Array<{ columns: string[]; unique?: boolean }>) {
    for (const idx of indexes) {
      const indexName = `idx_${tableName}_${idx.columns.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '_')).join('_')}`
      const unique = idx.unique ? 'UNIQUE ' : ''
      const columnStr = idx.columns.map(col => `"${col}"`).join(', ')
      await this.pool.query(`
        CREATE ${unique}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnStr})
      `)
    }
  }

  private quoteColumn(col: string): string {
    if (col.includes('"')) return col
    if (/[A-Z]/.test(col)) return `"${col}"`
    return col
  }

  private async withRetry<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let attempt = 0
    const run = async (): Promise<T> => {
      try {
        return await fn()
      } catch (err: any) {
        const retriable = err?.code && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === '40P01')
        if (attempt >= this.opts.retries || !retriable) throw err
        attempt++
        const delay = this.opts.backoffMs * attempt
        await new Promise((r) => setTimeout(r, delay))
        return run()
      }
    }

    if (!this.opts.serializeWrites) return run()
    return globalQueue.add_and_wait(`postgres:${key}`, run) as Promise<T>
  }

  async upsertOne<T extends Record<string, any>>(
    tableName: string,
    identifierKey: keyof T,
    data: T
  ): Promise<any> {
    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const quotedColumns = columns.map(col => this.quoteColumn(col))
    const updateSet = columns.map((col, i) => `${this.quoteColumn(col)} = $${i + 1}`).join(', ')
    const quotedIdKey = this.quoteColumn(identifierKey as string)

    const sql = `
      INSERT INTO ${tableName} (${quotedColumns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${quotedIdKey}) DO UPDATE SET ${updateSet}
      RETURNING *
    `

    return this.withRetry(tableName, async () => this.pool.query(sql, values))
  }

  async bulkUpsert<T extends Record<string, any>>(tableName: string, docs: T[], identifierKey: keyof T): Promise<any> {
    if (!docs.length) return { rowCount: 0 }

    return this.transaction(async (client) => {
      let totalRows = 0
      for (const doc of docs) {
        const columns = Object.keys(doc)
        const values = Object.values(doc)
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
        const quotedColumns = columns.map(col => this.quoteColumn(col))
        const updateSet = columns.map((col, i) => `${this.quoteColumn(col)} = $${i + 1}`).join(', ')
        const quotedIdKey = this.quoteColumn(identifierKey as string)

        const sql = `
          INSERT INTO ${tableName} (${quotedColumns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${quotedIdKey}) DO UPDATE SET ${updateSet}
        `

        const result = await client.query(sql, values)
        totalRows += result.rowCount || 0
      }
      return { rowCount: totalRows }
    })
  }

  async findOne<T extends Record<string, any>>(tableName: string, where: Partial<T>): Promise<T | null> {
    const columns = Object.keys(where)
    const values = Object.values(where)
    const whereClause = columns.map((col, i) => `${this.quoteColumn(col)} = $${i + 1}`).join(' AND ')

    const sql = `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`
    const result = await this.pool.query(sql, values)
    return result.rows[0] || null
  }

  async findMany<T extends Record<string, any>>(
    tableName: string,
    where?: Partial<T>,
    opts?: { limit?: number; offset?: number; orderBy?: string }
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${tableName}`
    const values: any[] = []
    let paramIndex = 1

    if (where && Object.keys(where).length > 0) {
      const whereColumns = Object.keys(where)
      const whereValues = Object.values(where)
      const whereClause = whereColumns.map((col) => `${this.quoteColumn(col)} = $${paramIndex++}`).join(' AND ')
      sql += ` WHERE ${whereClause}`
      values.push(...whereValues)
    }

    if (opts?.orderBy) {
      sql += ` ORDER BY ${opts.orderBy}`
    }

    if (opts?.limit) {
      sql += ` LIMIT $${paramIndex++}`
      values.push(opts.limit)
    }

    if (opts?.offset) {
      sql += ` OFFSET $${paramIndex++}`
      values.push(opts.offset)
    }

    const result = await this.pool.query(sql, values)
    return result.rows as T[]
  }

  async deleteMany<T extends Record<string, any>>(tableName: string, where: Partial<T>): Promise<QueryResult> {
    const columns = Object.keys(where)
    const values = Object.values(where)
    const whereClause = columns.map((col, i) => `${this.quoteColumn(col)} = $${i + 1}`).join(' AND ')

    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`
    return this.withRetry(tableName, async () => this.pool.query(sql, values))
  }

  async close() {
    await this.pool.end()
    this.isConnected = false
  }
}
