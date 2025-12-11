#!/usr/bin/env node

/**
 * Script untuk test koneksi PostgreSQL AWS RDS
 * Jalankan dengan: node test-postgres-connection.js
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const POSTGRES_URL = process.env.POSTGRES_URL

if (!POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL tidak ditemukan di .env')
  process.exit(1)
}

console.log('🔍 Testing PostgreSQL connection...')
console.log(`📍 Connection string: ${POSTGRES_URL.replace(/:[^:]*@/, ':***@')}`)

// For AWS RDS with self-signed certificates in development
const poolConfig = { 
  connectionString: POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
}

const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('❌ Pool error:', err)
  process.exit(1)
})

pool.on('connect', () => {
  console.log('✅ Connected to pool')
})

;(async () => {
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version')
    console.log('\n✅ Connection successful!')
    console.log('📊 Server info:')
    console.log(`   Time: ${result.rows[0].current_time}`)
    console.log(`   Version: ${result.rows[0].pg_version}`)

    // Cek tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log('\n📋 Existing tables:')
    if (tables.rows.length === 0) {
      console.log('   (none - akan dibuat otomatis saat aplikasi startup)')
    } else {
      tables.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`)
      })
    }

    console.log('\n🚀 Ready to run the application!')
  } catch (err) {
    console.error('❌ Query error:', err.message)
  } finally {
    client.release()
    await pool.end()
    process.exit(0)
  }
})()
