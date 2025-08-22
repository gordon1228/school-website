// =====================================================
// DATABASE CONFIGURATION - TypeScript Files
// =====================================================

// backend/src/config/database.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  options?: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    enableArithAbort: boolean;
  };
  pool?: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

// SQL Server Configuration
const config: DatabaseConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'school_website',
  user: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.NODE_ENV === 'development',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Connection pool
let pool: sql.ConnectionPool | null = null;

// Initialize database connection
export const initializeDatabase = async (): Promise<sql.ConnectionPool> => {
  try {
    if (pool) {
      return pool;
    }

    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ Database connected successfully');
    console.log(`📊 Database: ${config.database} on ${config.server}:${config.port}`);
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Get database connection
export const getDatabase = (): sql.ConnectionPool => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔐 Database connection closed');
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const db = await initializeDatabase();
    const result = await db.request().query('SELECT 1 as test');
    return result.recordset.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

// Execute query with error handling
export const executeQuery = async (
  query: string,
  params?: { [key: string]: any }
): Promise<sql.IResult<any>> => {
  try {
    const db = getDatabase();
    const request = db.request();
    
    // Add parameters if provided
    if (params) {
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });
    }
    
    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
};

// Execute stored procedure
export const executeStoredProcedure = async (
  procedureName: string,
  params?: { [key: string]: any }
): Promise<sql.IResult<any>> => {
  try {
    const db = getDatabase();
    const request = db.request();
    
    // Add parameters if provided
    if (params) {
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });
    }
    
    const result = await request.execute(procedureName);
    return result;
  } catch (error) {
    console.error('Stored procedure execution failed:', error);
    throw error;
  }
};

// Database transaction helper
export class DatabaseTransaction {
  private transaction: sql.Transaction;
  
  constructor(pool: sql.ConnectionPool) {
    this.transaction = new sql.Transaction(pool);
  }
  
  async begin(): Promise<void> {
    await this.transaction.begin();
  }
  
  async commit(): Promise<void> {
    await this.transaction.commit();
  }
  
  async rollback(): Promise<void> {
    await this.transaction.rollback();
  }
  
  request(): sql.Request {
    return new sql.Request(this.transaction);
  }
}

// Create new transaction
export const createTransaction = (): DatabaseTransaction => {
  const db = getDatabase();
  return new DatabaseTransaction(db);
};

export default {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  testConnection,
  executeQuery,
  executeStoredProcedure,
  createTransaction,
};