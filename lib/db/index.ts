/**
 * Database Connection Pool
 * Replaces Supabase client with a direct PostgreSQL connection using pg.
 * 
 * Connection is configured via DATABASE_URL environment variable.
 * Uses connection pooling for optimal performance in a Next.js environment.
 */
import { Pool, QueryResult, QueryResultRow } from 'pg';

// Singleton pool instance
let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error(
                'DATABASE_URL environment variable is not set. ' +
                'Expected format: postgresql://user:password@host:port/database'
            );
        }

        pool = new Pool({
            connectionString,
            max: 20, // Max connections in pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            // SSL config - disable for internal EasyPanel network
            ssl: process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false,
        });

        // Log connection errors
        pool.on('error', (err) => {
            console.error('[DB] Unexpected error on idle client:', err);
        });
    }
    return pool;
}

/**
 * Execute a parameterized SQL query.
 * ALWAYS use parameterized queries ($1, $2...) to prevent SQL injection.
 * 
 * @example
 * const result = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
 * const leads = result.rows;
 */
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const client = getPool();
    const start = Date.now();
    try {
        const result = await client.query<T>(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 100));
        }
        return result;
    } catch (error) {
        console.error('[DB] Query error:', { text: text.slice(0, 100), error });
        throw error;
    }
}

/**
 * Get a dedicated client from the pool for transaction support.
 * IMPORTANT: Always release the client after use!
 * 
 * @example
 * const client = await db.getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO ...');
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient() {
    return getPool().connect();
}

/**
 * Execute a transaction with automatic BEGIN/COMMIT/ROLLBACK.
 * 
 * @example
 * const result = await db.transaction(async (client) => {
 *   await client.query('INSERT INTO leads ...', [name, email]);
 *   await client.query('INSERT INTO generations ...', [leadId]);
 *   return { success: true };
 * });
 */
export async function transaction<T>(
    callback: (client: ReturnType<Pool['connect']> extends Promise<infer C> ? C : never) => Promise<T>
): Promise<T> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Helper: Query a single row or return null.
 */
export async function queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<T | null> {
    const result = await query<T>(text, params);
    return result.rows[0] || null;
}

/**
 * Helper: Insert and return the inserted row.
 */
export async function insertReturning<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<T> {
    const result = await query<T>(text, params);
    if (result.rows.length === 0) {
        throw new Error('Insert did not return a row');
    }
    return result.rows[0];
}

// Export a convenient db object
export const db = {
    query,
    queryOne,
    getClient,
    transaction,
    insertReturning,
};

export default db;
