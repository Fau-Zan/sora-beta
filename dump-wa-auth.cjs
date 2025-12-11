#!/usr/bin/env node
'use strict'
const { Pool } = require('pg')

async function main() {
  const POSTGRES_URL = process.env.POSTGRES_URL || process.argv[2]
  if (!POSTGRES_URL) { console.error('provide POSTGRES_URL'); process.exit(2) }
  const pool = new Pool({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } })
  try {
    const res = await pool.query('SELECT session_id, auth, created_at, updated_at FROM wa_auth ORDER BY created_at DESC')
    if (!res.rows.length) return console.log('no rows')
    for (const r of res.rows) {
      console.log('---')
      console.log('session_id:', r.session_id)
      console.log('created_at:', r.created_at)
      console.log('updated_at:', r.updated_at)
      try { const parsed = JSON.parse(r.auth); console.log('registered:', !!parsed.creds?.me); } catch(e) { console.log('auth parse failed') }
    }
  } catch (e) { console.error('query err', e) } finally { await pool.end() }
}

main()
