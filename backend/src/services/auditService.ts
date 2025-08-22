// src/services/auditService.ts
import { getDatabase } from '../config/database';

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  tableName: string;
  recordId?: number;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface CreateAuditLogData {
  userId?: number;
  action: string;
  tableName: string;
  recordId?: number;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Log an activity to audit trail
   */
  static async logActivity(auditData: CreateAuditLogData): Promise<void> {
    try {
      const db = getDatabase();
      
      await db.request()
        .input('userId', auditData.userId || null)
        .input('action', auditData.action)
        .input('tableName', auditData.tableName)
        .input('recordId', auditData.recordId || null)
        .input('oldValues', auditData.oldValues || null)
        .input('newValues', auditData.newValues || null)
        .input('ipAddress', auditData.ipAddress || null)
        .input('userAgent', auditData.userAgent || null)
        .query(`
          INSERT INTO AuditLogs (USER_ID, ACTION, TABLE_NAME, RECORD_ID, OLD_VALUES, NEW_VALUES, IP_ADDRESS, USER_AGENT)
          VALUES (@userId, @action, @tableName, @recordId, @oldValues, @newValues, @ipAddress, @userAgent)
        `);
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw error - audit logging should not break main functionality
    }
  }

  /**
   * Get audit logs with pagination
   */
  static async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: number;
      action?: string;
      tableName?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{ logs: AuditLog[], total: number }> {
    const db = getDatabase();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any = { offset, limit };

    if (filters?.userId) {
      whereClause += ' AND al.USER_ID = @userId';
      params.userId = filters.userId;
    }
    if (filters?.action) {
      whereClause += ' AND al.ACTION = @action';
      params.action = filters.action;
    }
    if (filters?.tableName) {
      whereClause += ' AND al.TABLE_NAME = @tableName';
      params.tableName = filters.tableName;
    }
    if (filters?.dateFrom) {
      whereClause += ' AND al.TIMESTAMP >= @dateFrom';
      params.dateFrom = filters.dateFrom;
    }
    if (filters?.dateTo) {
      whereClause += ' AND al.TIMESTAMP <= @dateTo';
      params.dateTo = filters.dateTo;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM AuditLogs al ${whereClause}`;
    const countRequest = db.request();
    Object.keys(params).forEach(key => {
      if (key !== 'offset' && key !== 'limit') {
        countRequest.input(key, params[key]);
      }
    });
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // Get logs
    const logsQuery = `
      SELECT 
        al.ID, al.USER_ID, al.ACTION, al.TABLE_NAME, al.RECORD_ID,
        al.OLD_VALUES, al.NEW_VALUES, al.IP_ADDRESS, al.USER_AGENT, al.TIMESTAMP,
        au.USERNAME, au.EMAIL
      FROM AuditLogs al
      LEFT JOIN AdminUsers au ON al.USER_ID = au.ID
      ${whereClause}
      ORDER BY al.TIMESTAMP DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const logsRequest = db.request();
    Object.keys(params).forEach(key => {
      logsRequest.input(key, params[key]);
    });

    const result = await logsRequest.query(logsQuery);

    const logs = result.recordset.map((row: any): AuditLog & { username?: string; email?: string } => ({
      id: row.ID,
      userId: row.USER_ID,
      action: row.ACTION,
      tableName: row.TABLE_NAME,
      recordId: row.RECORD_ID,
      oldValues: row.OLD_VALUES,
      newValues: row.NEW_VALUES,
      ipAddress: row.IP_ADDRESS,
      userAgent: row.USER_AGENT,
      timestamp: row.TIMESTAMP,
      username: row.USERNAME,
      email: row.EMAIL
    }));

    return { logs, total };
  }
}