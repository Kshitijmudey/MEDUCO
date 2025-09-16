const { Pool } = require('pg');
const path = require('path');

class PostgresDatabase {
    constructor() {
        this.pool = null;
        this.isConnected = false;

        // PostgreSQL connection configuration
        this.config = {
            user: process.env.POSTGRES_USER || 'postgres',
            host: process.env.POSTGRES_HOST || 'localhost',
            database: process.env.POSTGRES_DB || 'meduco',
            password: process.env.POSTGRES_PASSWORD || 'password',
            port: parseInt(process.env.POSTGRES_PORT) || 5432,
            max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
            idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT) || 2000,
            ssl: process.env.POSTGRES_SSL === 'true' ? {
                rejectUnauthorized: false
            } : false
        };
    }

    async connect() {
        if (this.isConnected && this.pool) {
            return this.pool;
        }

        try {
            this.pool = new Pool(this.config);

            // Test connection
            const client = await this.pool.connect();
            client.release();

            this.isConnected = true;
            console.log('Connected to PostgreSQL database successfully');

            // Handle connection errors
            this.pool.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
                this.isConnected = false;
            });

            return this.pool;
        } catch (error) {
            console.error('Error connecting to PostgreSQL database:', error.message);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('PostgreSQL database connection closed');
        }
    }

    // Helper method to run queries with automatic client handling
    async query(text, params = []) {
        if (!this.isConnected || !this.pool) {
            throw new Error('Database not connected');
        }

        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    // Helper method to run queries and return only the first row
    async get(text, params = []) {
        const result = await this.query(text, params);
        return result.rows[0] || null;
    }

    // Helper method to get all rows
    async all(text, params = []) {
        const result = await this.query(text, params);
        return result.rows;
    }

    // Helper method for INSERT/UPDATE/DELETE operations
    async run(text, params = []) {
        const result = await this.query(text, params);
        return {
            id: result.rows[0]?.id || null,
            changes: result.rowCount,
            rows: result.rows
        };
    }

    // Helper method for transactions
    async transaction(operations) {
        if (!this.isConnected || !this.pool) {
            throw new Error('Database not connected');
        }

        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const results = [];
            for (const operation of operations) {
                const result = await operation(client);
                results.push(result);
            }

            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Execute multiple queries in a transaction
    async transactionQueries(queries) {
        return this.transaction(async (client) => {
            const results = [];
            for (const { text, params } of queries) {
                const result = await client.query(text, params);
                results.push({
                    id: result.rows[0]?.id || null,
                    changes: result.rowCount,
                    rows: result.rows
                });
            }
            return results;
        });
    }

    // Get database connection info
    getConnectionInfo() {
        return {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            isConnected: this.isConnected,
            ssl: !!this.config.ssl
        };
    }

    // Check if database connection is healthy
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as current_time, version() as version');
            return {
                status: 'healthy',
                timestamp: result.rows[0].current_time,
                version: result.rows[0].version,
                connected: this.isConnected
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connected: false
            };
        }
    }

    // Get database statistics
    async getStats() {
        try {
            const stats = await this.query(`
                SELECT
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples
                FROM pg_stat_user_tables
                ORDER BY schemaname, tablename
            `);

            const connections = await this.query(`
                SELECT
                    count(*) as total_connections,
                    count(*) filter (where state = 'active') as active_connections,
                    count(*) filter (where state = 'idle') as idle_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            `);

            return {
                tables: stats.rows,
                connections: connections.rows[0]
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            return null;
        }
    }

    // Migrate from SQLite-style queries to PostgreSQL
    convertSQLiteQuery(query, params = []) {
        // Convert SQLite AUTOINCREMENT to SERIAL
        query = query.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

        // Convert SQLite DATETIME to TIMESTAMP
        query = query.replace(/DATETIME/gi, 'TIMESTAMP WITH TIME ZONE');

        // Convert SQLite BOOLEAN values
        query = query.replace(/\b1\b/g, 'TRUE');
        query = query.replace(/\b0\b/g, 'FALSE');

        // Convert parameter placeholders from ? to $1, $2, etc.
        let paramIndex = 1;
        query = query.replace(/\?/g, () => `$${paramIndex++}`);

        return { query, params };
    }

    // Legacy compatibility methods for SQLite-style usage
    async legacyGet(sql, params = []) {
        const { query, params: pgParams } = this.convertSQLiteQuery(sql, params);
        return this.get(query, pgParams);
    }

    async legacyAll(sql, params = []) {
        const { query, params: pgParams } = this.convertSQLiteQuery(sql, params);
        return this.all(query, pgParams);
    }

    async legacyRun(sql, params = []) {
        const { query, params: pgParams } = this.convertSQLiteQuery(sql, params);
        const result = await this.query(query, pgParams);

        // Return SQLite-compatible result
        return {
            lastID: result.rows[0]?.id || null,
            changes: result.rowCount
        };
    }
}

// Create singleton instance
const database = new PostgresDatabase();

module.exports = database;
