#!/usr/bin/env node
'use strict'
const { Pool } = require('pg')

async function main() {
  const POSTGRES_URL = process.env.POSTGRES_URL || process.argv[2]
  if (!POSTGRES_URL) { console.error('provide POSTGRES_URL'); process.exit(2) }
  const pool = new Pool({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } })
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
    console.log('tables:')
    for (const r of res.rows) console.log('-', r.table_name)
  } catch (e) { console.error(e) } finally { await pool.end() }
}
main()
