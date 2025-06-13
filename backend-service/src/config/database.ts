import { Pool, PoolConfig } from 'pg';
import { logger } from '../shared/utils/logger';

export interface DatabaseConfig extends PoolConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class Database {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dzinza_genealogy',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool(this.config);

      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();

      logger.info('PostgreSQL connected successfully', {
        service: 'database',
        database: this.config.database,
        host: this.config.host,
        port: this.config.port,
        timestamp: result.rows[0]?.current_time
      });

      // Handle pool events
      this.pool.on('error', (err) => {
        logger.error('PostgreSQL pool error:', err, { service: 'database' });
      });

      this.pool.on('connect', () => {
        logger.debug('New PostgreSQL client connected', { service: 'database' });
      });

      this.pool.on('remove', () => {
        logger.debug('PostgreSQL client removed', { service: 'database' });
      });

    } catch (error) {
      logger.error('Failed to connect to PostgreSQL:', error, { service: 'database' });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        logger.info('PostgreSQL connection pool closed', { service: 'database' });
      }
    } catch (error) {
      logger.error('Error closing PostgreSQL connection pool:', error, { service: 'database' });
      throw error;
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Query executed', {
        service: 'database',
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query failed', {
        service: 'database',
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        error: error
      });
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const client = await this.pool.connect();
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

  async healthCheck(): Promise<{ status: string; latency: number; timestamp: Date }> {
    const start = Date.now();
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as version');
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
        timestamp: result.rows[0].current_time
      };
    } catch (error) {
      const latency = Date.now() - start;
      logger.error('Database health check failed:', error, { service: 'database' });
      throw {
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Create and export singleton instance
export const database = new Database();
export default database;
