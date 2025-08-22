// =====================================================
// database/README.md - Setup Instructions
// =====================================================

/*
# Database Setup Instructions

## Prerequisites
- SQL Server 2019 or later (Express edition is sufficient for development)
- SQL Server Management Studio (SSMS) or Azure Data Studio

## Setup Steps

### 1. Create Database
```sql
CREATE DATABASE school_website;
```

### 2. Run Schema Script
- Execute `schema.sql` to create all tables, indexes, and constraints
- This will create the complete database structure

### 3. Run Seed Data Script  
- Execute `seed-data.sql` to populate initial data
- Creates default roles, permissions, and super admin user

### 4. Update Environment Variables
Update your `.env` file with database connection details:
```env
DB_SERVER=localhost
DB_DATABASE=school_website  
DB_USERNAME=sa
DB_PASSWORD=your_password
DB_PORT=1433
DB_ENCRYPT=true
```

### 5. Test Connection
Run your application and check the console for:
- "✅ Database connected successfully"
- "📊 Database: school_website on localhost:1433"

## Default Admin Credentials
- Username: `superadmin`
- Password: `admin123`
- **IMPORTANT**: Change this password immediately after first login!

## Database Features
- ✅ Role-based access control (RBAC)
- ✅ Audit logging for all actions  
- ✅ Soft deletes for data safety
- ✅ Inactivity user locking
- ✅ Session management
- ✅ Multilingual content support
- ✅ SEO-friendly URLs and metadata
- ✅ File upload tracking
- ✅ Event registration system

## Maintenance Tasks
Run these procedures regularly:
```sql
-- Clean expired sessions (daily)
EXEC SP_CleanupExpiredSessions;

-- Check for inactive users (daily)  
EXEC SP_CheckInactiveUsers;
```

## Backup Strategy
- Set up automated backups for production
- Test restore procedures regularly
- Keep transaction log backups for point-in-time recovery

## Performance Tips
- All necessary indexes are created by the schema
- Use the provided views for complex queries
- Monitor query performance with SQL Server Profiler
- Consider partitioning large tables (AuditLogs, UserSessions) in production

## PostgreSQL Alternative
To use PostgreSQL instead:
1. Install `pg` instead of `mssql`
2. Convert SQL Server syntax to PostgreSQL
3. Update connection configuration
4. Modify data types (NVARCHAR → VARCHAR, etc.)
*/