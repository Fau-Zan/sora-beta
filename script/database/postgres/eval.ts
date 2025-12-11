import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});


export const query = async (sql: string, params?: any[]) => {
  try {
    const result = await pool.query(sql, params);
    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      command: result.command,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      detail: error.detail || '',
      code: error.code,
    };
  }
};

/**
 * Get WA Auth Session Data
 */
export const getWAAuthSession = async (sessionId: string) => {
  try {
    const result = await query(
      `SELECT 
        session_id,
        LENGTH(auth)::bigint as size_bytes,
        pg_size_pretty(LENGTH(auth)::bigint) as size,
        created_at,
        updated_at
      FROM wa_auth 
      WHERE session_id = $1`,
      [sessionId]
    );
    
    if (!result.success) return result;
    return {
      success: true,
      session: result.rows[0],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get all WA Auth Sessions
 */
export const getAllWAAuthSessions = async () => {
  try {
    const result = await query(
      `SELECT 
        session_id,
        LENGTH(auth)::bigint as size_bytes,
        pg_size_pretty(LENGTH(auth)::bigint) as size,
        created_at,
        updated_at,
        NOW() - updated_at as time_since_update
      FROM wa_auth 
      ORDER BY updated_at DESC`
    );
    
    if (!result.success) return result;
    return {
      success: true,
      sessions: result.rows,
      count: result.rowCount,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get WA Auth Stats
 */
export const getWAAuthStats = async () => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_sessions,
        SUM(LENGTH(auth))::bigint as total_size_bytes,
        pg_size_pretty(SUM(LENGTH(auth))::bigint) as total_size,
        ROUND(AVG(LENGTH(auth)))::bigint as avg_size_bytes,
        pg_size_pretty(ROUND(AVG(LENGTH(auth)))::bigint) as avg_size,
        MAX(LENGTH(auth))::bigint as max_size_bytes,
        pg_size_pretty(MAX(LENGTH(auth))::bigint) as max_size,
        MIN(LENGTH(auth))::bigint as min_size_bytes,
        pg_size_pretty(MIN(LENGTH(auth))::bigint) as min_size
      FROM wa_auth`
    );
    
    if (!result.success) return result;
    return {
      success: true,
      stats: result.rows[0],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get WA Messages
 */
export const getWAMessages = async (limit: number = 10, offset: number = 0) => {
  try {
    const result = await query(
      `SELECT * FROM wa_messages 
       ORDER BY timestamp DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    if (!result.success) return result;
    return {
      success: true,
      messages: result.rows,
      count: result.rowCount,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Search WA Messages by content
 */
export const searchWAMessages = async (searchTerm: string, limit: number = 10) => {
  try {
    const result = await query(
      `SELECT * FROM wa_messages 
       WHERE content ILIKE $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );
    
    if (!result.success) return result;
    return {
      success: true,
      messages: result.rows,
      count: result.rowCount,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get messages from specific JID
 */
export const getMessagesFromJID = async (jid: string, limit: number = 10) => {
  try {
    const result = await query(
      `SELECT * FROM wa_messages 
       WHERE from_jid = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [jid, limit]
    );
    
    if (!result.success) return result;
    return {
      success: true,
      messages: result.rows,
      count: result.rowCount,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get database stats
 */
export const getDatabaseStats = async () => {
  try {
    const result = await query(
      `SELECT 
        datname,
        pg_size_pretty(pg_database_size(datname)) as size
      FROM pg_database
      WHERE datname NOT IN ('template0', 'template1', 'postgres')
      ORDER BY pg_database_size(datname) DESC`
    );
    
    if (!result.success) return result;
    return {
      success: true,
      databases: result.rows,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get table sizes
 */
export const getTableSizes = async (schemaName: string = 'public') => {
  try {
    const result = await query(
      `SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = $1
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC`,
      [schemaName]
    );
    
    if (!result.success) return result;
    return {
      success: true,
      tables: result.rows,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get connection stats
 */
export const getConnectionStats = async () => {
  try {
    const result = await query(
      `SELECT 
        datname,
        COUNT(*) as connections,
        state
      FROM pg_stat_activity
      GROUP BY datname, state
      ORDER BY datname, state`
    );
    
    if (!result.success) return result;
    return {
      success: true,
      connections: result.rows,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Close pool
 */
export const closePool = async () => {
  await pool.end();
};

// Export all as default object too
export default {
  query,
  getWAAuthSession,
  getAllWAAuthSessions,
  getWAAuthStats,
  getWAMessages,
  searchWAMessages,
  getMessagesFromJID,
  getDatabaseStats,
  getTableSizes,
  getConnectionStats,
  closePool,
};
