#!/usr/bin/env node
'use strict'
const { Pool } = require('pg')

async function main() {
  const argv = process.argv.slice(2)
  const sessionId = argv[0] || 'zan'
  let POSTGRES_URL = process.env.POSTGRES_URL
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--postgres-url') POSTGRES_URL = argv[++i]
  }
  if (!POSTGRES_URL) {
    console.error('POSTGRES_URL required via env or --postgres-url')
    process.exit(2)
  }
  const pool = new Pool({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } })
  try {
    const res = await pool.query('SELECT session_id, auth, created_at, updated_at FROM wa_auth WHERE session_id = $1 LIMIT 1', [sessionId])
    if (!res.rows.length) {
      console.log('no row for', sessionId)
      return
    }
    const row = res.rows[0]
    console.log('session_id:', row.session_id)
    console.log('created_at:', row.created_at)
    console.log('updated_at:', row.updated_at)
    try {
      const parsed = JSON.parse(row.auth)
      console.log('creds keys:', Object.keys(parsed.creds || {}))
      console.log('creds.registered:', parsed.creds?.registered)
      console.log('keys types:', Object.keys(parsed.keys || {}))
      // print short dump of creds
      console.log('creds (short):', JSON.stringify({ user: parsed.creds?.me, registered: parsed.creds?.registered }, null, 2))
    } catch (e) {
      console.error('failed parse auth JSON:', e)
      console.log(row.auth)
    }
  } catch (e) {
    console.error('query error', e)
  } finally {
    await pool.end()
  }
}

main()
