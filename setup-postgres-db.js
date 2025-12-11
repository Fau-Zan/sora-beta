#!/usr/bin/env node

/**
 * Script untuk membuat database violetdb di AWS RDS
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const POSTGRES_URL = process.env.POSTGRES_URL

if (!POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL tidak ditemukan di .env')
  process.exit(1)
}

// Connect to default postgres database
const connString = POSTGRES_URL.replace('/violetdb', '/postgres')

console.log('🔧 Creating database "violetdb"...')
console.log(`📍 Connection to: ${connString.replace(/:[^:]*@/, ':***@')}`)

const poolConfig = { 
  connectionString: connString,
  ssl: {
    rejectUnauthorized: false
  }
}

const pool = new Pool(poolConfig)

;(async () => {
  const client = await pool.connect()
  try {
    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'violetdb'"
    )

    if (checkDb.rows.length > 0) {
      console.log('✅ Database "violetdb" already exists')
    } else {
      console.log('Creating database...')
      await client.query('CREATE DATABASE violetdb ENCODING "UTF8"')
      console.log('✅ Database "violetdb" created successfully')
    }

    // Test connection to new database
    const testPool = new Pool({
      connectionString: POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })

    const testClient = await testPool.connect()
    const result = await testClient.query('SELECT NOW() as current_time, version() as pg_version')
    
    console.log('\n✅ Connection to "violetdb" successful!')
    console.log('📊 Server info:')
    console.log(`   Time: ${result.rows[0].current_time}`)
    console.log(`   Version: ${result.rows[0].pg_version}`)
    
    testClient.release()
    await testPool.end()
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
})()
