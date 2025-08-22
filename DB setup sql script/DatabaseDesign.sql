-- =====================================================
-- STEP 2: DATABASE DESIGN - ENTERPRISE SCHOOL WEBSITE
-- =====================================================
-- Database: SQL Server (can be adapted for PostgreSQL)
-- Features: RBAC, Audit Trails, Soft Deletes, Timestamps

-- Create database in SQL Server
CREATE DATABASE school_website;


-- =====================================================
-- 1. CORE USER MANAGEMENT & AUTHENTICATION
-- =====================================================

USE school_website;


-- Admin Users Table
CREATE TABLE AdminUsers (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    USERNAME NVARCHAR(50) NOT NULL UNIQUE,
    EMAIL NVARCHAR(100) NOT NULL UNIQUE,
    PASSWORD_HASH NVARCHAR(255) NOT NULL,
    FIRST_NAME NVARCHAR(50) NOT NULL,
    LAST_NAME NVARCHAR(50) NOT NULL,
    PHONE NVARCHAR(20),
    
    -- Security & Account Management
    IS_ACTIVE BIT DEFAULT 1,
    IS_LOCKED BIT DEFAULT 0,
    FAILED_LOGIN_ATTEMPTS INT DEFAULT 0,
    LOCKED_UNTIL_TS DATETIME2 NULL,
    LAST_LOGIN_TS DATETIME2 NULL,
    PASSWORD_RESET_TOKEN NVARCHAR(255) NULL,
    PASSWORD_RESET_EXPIRES DATETIME2 NULL,
    
    -- Inactivity Policy
    INACTIVITY_LOCK_ENABLED BIT DEFAULT 0,
    INACTIVITY_LOCK_DAYS INT DEFAULT 30,
    
    -- Audit Fields
    CREATED_BY INT NULL,
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    UPDATED_BY INT NULL,
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_AdminUsers_CreatedBy FOREIGN KEY (CREATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_AdminUsers_UpdatedBy FOREIGN KEY (UPDATED_BY) REFERENCES AdminUsers(ID)
);

-- =====================================================
-- 2. ROLE-BASED ACCESS CONTROL (RBAC)
-- =====================================================

-- Roles Table
CREATE TABLE Roles (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    ROLE_NAME NVARCHAR(50) NOT NULL UNIQUE,
    DESCRIPTION NVARCHAR(255),
    IS_SYSTEM_ROLE BIT DEFAULT 0, -- Prevents deletion of core roles
    IS_ACTIVE BIT DEFAULT 1,
    
    -- Inactivity Policy per Role
    INACTIVITY_LOCK_ENABLED BIT DEFAULT 0,
    INACTIVITY_LOCK_DAYS INT DEFAULT 30,
    
    -- Audit Fields
    CREATED_BY INT NOT NULL,
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    UPDATED_BY INT NULL,
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_Roles_CreatedBy FOREIGN KEY (CREATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_Roles_UpdatedBy FOREIGN KEY (UPDATED_BY) REFERENCES AdminUsers(ID)
);

-- Permissions Table
CREATE TABLE Permissions (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    PERMISSION_NAME NVARCHAR(50) NOT NULL UNIQUE,
    DESCRIPTION NVARCHAR(255),
    MODULE NVARCHAR(50) NOT NULL, -- 'news', 'events', 'gallery', 'users', 'roles'
    ACTION NVARCHAR(20) NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
    IS_SYSTEM_PERMISSION BIT DEFAULT 0,
    
    -- Audit Fields
    CREATED_BY INT NOT NULL,
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_Permissions_CreatedBy FOREIGN KEY (CREATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT UQ_Permissions_Module_Action UNIQUE (MODULE, ACTION)
);

-- User-Role Junction Table
CREATE TABLE UserRoles (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    USER_ID INT NOT NULL,
    ROLE_ID INT NOT NULL,
    IS_ACTIVE BIT DEFAULT 1,
    ASSIGNED_BY INT NOT NULL,
    ASSIGNED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_UserRoles_User FOREIGN KEY (USER_ID) REFERENCES AdminUsers(ID) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_Role FOREIGN KEY (ROLE_ID) REFERENCES Roles(ID) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_AssignedBy FOREIGN KEY (ASSIGNED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT UQ_UserRoles_User_Role UNIQUE (USER_ID, ROLE_ID)
);

-- Role-Permission Junction Table
CREATE TABLE RolePermissions (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    ROLE_ID INT NOT NULL,
    PERMISSION_ID INT NOT NULL,
    IS_GRANTED BIT DEFAULT 1,
    ASSIGNED_BY INT NOT NULL,
    ASSIGNED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_RolePermissions_Role FOREIGN KEY (ROLE_ID) REFERENCES Roles(ID) ON DELETE CASCADE,
    CONSTRAINT FK_RolePermissions_Permission FOREIGN KEY (PERMISSION_ID) REFERENCES Permissions(ID) ON DELETE CASCADE,
    CONSTRAINT FK_RolePermissions_AssignedBy FOREIGN KEY (ASSIGNED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT UQ_RolePermissions_Role_Permission UNIQUE (ROLE_ID, PERMISSION_ID)
);

-- =====================================================
-- 3. CONTENT MANAGEMENT
-- =====================================================

-- News Table
CREATE TABLE News (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    TITLE NVARCHAR(200) NOT NULL,
    SLUG NVARCHAR(200) NOT NULL UNIQUE, -- URL-friendly version
    CONTENT NTEXT NOT NULL,
    EXCERPT NVARCHAR(500), -- Short description for listings
    FEATURED_IMAGE NVARCHAR(255), -- Image path/URL
    
    -- Publishing
    IS_PUBLISHED BIT DEFAULT 0,
    IS_FEATURED BIT DEFAULT 0, -- Featured on homepage
    PUBLISHED_TS DATETIME2 NULL,
    
    -- SEO
    META_TITLE NVARCHAR(60),
    META_DESCRIPTION NVARCHAR(160),
    
    -- Multilingual Support
    LANGUAGE_CODE NVARCHAR(5) DEFAULT 'en', -- 'en', 'ms', etc.
    PARENT_NEWS_ID INT NULL, -- For translations
    
    -- Audit Fields
    CREATED_BY INT NOT NULL,
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    UPDATED_BY INT NULL,
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    IS_DELETED BIT DEFAULT 0,
    DELETED_BY INT NULL,
    DELETED_TS DATETIME2 NULL,
    
    CONSTRAINT FK_News_CreatedBy FOREIGN KEY (CREATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_News_UpdatedBy FOREIGN KEY (UPDATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_News_DeletedBy FOREIGN KEY (DELETED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_News_ParentNews FOREIGN KEY (PARENT_NEWS_ID) REFERENCES News(ID)
);

-- Events Table
CREATE TABLE Events (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    TITLE NVARCHAR(200) NOT NULL,
    SLUG NVARCHAR(200) NOT NULL UNIQUE,
    DESCRIPTION NTEXT NOT NULL,
    SHORT_DESCRIPTION NVARCHAR(500),
    FEATURED_IMAGE NVARCHAR(255),
    
    -- Event Details
    EVENT_START_TS DATETIME2 NOT NULL,
    EVENT_END_TS DATETIME2 NOT NULL,
    LOCATION NVARCHAR(200),
    MAX_PARTICIPANTS INT NULL, -- NULL = unlimited
    REGISTRATION_DEADLINE DATETIME2 NULL,
    
    -- Settings
    IS_PUBLISHED BIT DEFAULT 0,
    IS_REGISTRATION_OPEN BIT DEFAULT 1,
    REQUIRES_APPROVAL BIT DEFAULT 0, -- Manual approval for signups
    
    -- SEO & Multilingual
    META_TITLE NVARCHAR(60),
    META_DESCRIPTION NVARCHAR(160),
    LANGUAGE_CODE NVARCHAR(5) DEFAULT 'en',
    PARENT_EVENT_ID INT NULL,
    
    -- Audit Fields
    CREATED_BY INT NOT NULL,
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    UPDATED_BY INT NULL,
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    IS_DELETED BIT DEFAULT 0,
    DELETED_BY INT NULL,
    DELETED_TS DATETIME2 NULL,
    
    CONSTRAINT FK_Events_CreatedBy FOREIGN KEY (CREATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_Events_UpdatedBy FOREIGN KEY (UPDATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_Events_DeletedBy FOREIGN KEY (DELETED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_Events_ParentEvent FOREIGN KEY (PARENT_EVENT_ID) REFERENCES Events(ID)
);

-- Event Signups Table
CREATE TABLE EventSignups (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    EVENT_ID INT NOT NULL,
    
    -- Participant Information
    PARTICIPANT_TYPE NVARCHAR(20) NOT NULL CHECK (PARTICIPANT_TYPE IN ('student', 'parent', 'teacher', 'staff', 'other')),
    FIRST_NAME NVARCHAR(50) NOT NULL,
    LAST_NAME NVARCHAR(50) NOT NULL,
    EMAIL NVARCHAR(100) NOT NULL,
    PHONE NVARCHAR(20),
    
    -- Student-specific fields
    STUDENT_ID NVARCHAR(20) NULL, -- Only for students
    CLASS_GRADE NVARCHAR(20) NULL,
    
    -- Additional Information
    IDENTITY_NO NVARCHAR(20), -- IC/Passport for verification
    SPECIAL_REQUIREMENTS NVARCHAR(500), -- Dietary, accessibility, etc.
    EMERGENCY_CONTACT NVARCHAR(100),
    EMERGENCY_PHONE NVARCHAR(20),
    
    -- Status Management
    STATUS NVARCHAR(20) DEFAULT 'pending' CHECK (STATUS IN ('pending', 'confirmed', 'cancelled', 'waitlisted')),
    APPROVED_BY INT NULL,
    APPROVED_TS DATETIME2 NULL,
    
    -- Communication
    CONFIRMATION_EMAIL_SENT BIT DEFAULT 0,
    CONFIRMATION_EMAIL_TS DATETIME2 NULL,
    REMINDER_EMAIL_SENT BIT DEFAULT 0,
    
    -- Audit Fields
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_EventSignups_Event FOREIGN KEY (EVENT_ID) REFERENCES Events(ID) ON DELETE CASCADE,
    CONSTRAINT FK_EventSignups_ApprovedBy FOREIGN KEY (APPROVED_BY) REFERENCES AdminUsers(ID)
);

-- Gallery Table
CREATE TABLE Gallery (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    TITLE NVARCHAR(200) NOT NULL,
    DESCRIPTION NVARCHAR(1000),
    IMAGE_PATH NVARCHAR(255) NOT NULL,
    IMAGE_SIZE BIGINT, -- File size in bytes
    IMAGE_TYPE NVARCHAR(20), -- MIME type
    
    -- Organization
    CATEGORY NVARCHAR(50) DEFAULT 'general', -- 'events', 'achievements', 'facilities', etc.
    DISPLAY_ORDER INT DEFAULT 0,
    IS_FEATURED BIT DEFAULT 0,
    
    -- Multilingual
    LANGUAGE_CODE NVARCHAR(5) DEFAULT 'en',
    
    -- Audit Fields
    UPLOADED_BY INT NOT NULL,
    UPLOADED_TS DATETIME2 DEFAULT GETDATE(),
    IS_DELETED BIT DEFAULT 0,
    DELETED_BY INT NULL,
    DELETED_TS DATETIME2 NULL,
    
    CONSTRAINT FK_Gallery_UploadedBy FOREIGN KEY (UPLOADED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_Gallery_DeletedBy FOREIGN KEY (DELETED_BY) REFERENCES AdminUsers(ID)
);

-- =====================================================
-- 4. SYSTEM CONFIGURATION
-- =====================================================

-- Site Settings Table (Key-Value pairs for dynamic configuration)
CREATE TABLE SiteSettings (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    SETTING_KEY NVARCHAR(100) NOT NULL UNIQUE,
    SETTING_VALUE NVARCHAR(MAX),
    DESCRIPTION NVARCHAR(255),
    CATEGORY NVARCHAR(50) DEFAULT 'general', -- 'general', 'email', 'security', etc.
    IS_SYSTEM_SETTING BIT DEFAULT 0, -- Prevents deletion
    
    -- Audit Fields
    UPDATED_BY INT NOT NULL,
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_SiteSettings_UpdatedBy FOREIGN KEY (UPDATED_BY) REFERENCES AdminUsers(ID)
);

-- Content Pages Table (About, Contact, etc.)
CREATE TABLE ContentPages (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    PAGE_KEY NVARCHAR(50) NOT NULL, -- 'about', 'contact', 'privacy'
    TITLE NVARCHAR(200) NOT NULL,
    CONTENT NTEXT NOT NULL,
    META_TITLE NVARCHAR(60),
    META_DESCRIPTION NVARCHAR(160),
    
    -- Multilingual Support
    LANGUAGE_CODE NVARCHAR(5) DEFAULT 'en',
    PARENT_PAGE_ID INT NULL,
    
    -- Status
    IS_PUBLISHED BIT DEFAULT 1,
    
    -- Audit Fields
    UPDATED_BY INT NOT NULL,
    UPDATED_TS DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_ContentPages_UpdatedBy FOREIGN KEY (UPDATED_BY) REFERENCES AdminUsers(ID),
    CONSTRAINT FK_ContentPages_ParentPage FOREIGN KEY (PARENT_PAGE_ID) REFERENCES ContentPages(ID),
    CONSTRAINT UQ_ContentPages_Key_Language UNIQUE (PAGE_KEY, LANGUAGE_CODE)
);

-- =====================================================
-- 5. AUDIT & LOGGING
-- =====================================================

-- Audit Logs Table
CREATE TABLE AuditLogs (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    USER_ID INT NULL, -- NULL for system actions
    ACTION NVARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
    TABLE_NAME NVARCHAR(50) NOT NULL,
    RECORD_ID INT NULL,
    OLD_VALUES NVARCHAR(MAX) NULL, -- JSON format
    NEW_VALUES NVARCHAR(MAX) NULL, -- JSON format
    IP_ADDRESS NVARCHAR(45), -- Supports IPv6
    USER_AGENT NVARCHAR(500),
    TIMESTAMP DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_AuditLogs_User FOREIGN KEY (USER_ID) REFERENCES AdminUsers(ID)
);

-- User Sessions Table (for session management)
CREATE TABLE UserSessions (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    USER_ID INT NOT NULL,
    SESSION_ID NVARCHAR(255) NOT NULL UNIQUE,
    IP_ADDRESS NVARCHAR(45),
    USER_AGENT NVARCHAR(500),
    IS_ACTIVE BIT DEFAULT 1,
    LAST_ACTIVITY DATETIME2 DEFAULT GETDATE(),
    CREATED_TS DATETIME2 DEFAULT GETDATE(),
    EXPIRES_TS DATETIME2 NOT NULL,
    
    CONSTRAINT FK_UserSessions_User FOREIGN KEY (USER_ID) REFERENCES AdminUsers(ID) ON DELETE CASCADE
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- AdminUsers Indexes
CREATE INDEX IX_AdminUsers_Email ON AdminUsers(EMAIL);
CREATE INDEX IX_AdminUsers_Username ON AdminUsers(USERNAME);
CREATE INDEX IX_AdminUsers_IsActive ON AdminUsers(IS_ACTIVE);
CREATE INDEX IX_AdminUsers_LastLogin ON AdminUsers(LAST_LOGIN_TS);

-- News Indexes
CREATE INDEX IX_News_Published ON News(IS_PUBLISHED, PUBLISHED_TS DESC);
CREATE INDEX IX_News_Language ON News(LANGUAGE_CODE);
CREATE INDEX IX_News_Slug ON News(SLUG);
CREATE INDEX IX_News_IsDeleted ON News(IS_DELETED);

-- Events Indexes
CREATE INDEX IX_Events_Published ON Events(IS_PUBLISHED, EVENT_START_TS);
CREATE INDEX IX_Events_StartTime ON Events(EVENT_START_TS);
CREATE INDEX IX_Events_Registration ON Events(IS_REGISTRATION_OPEN, REGISTRATION_DEADLINE);
CREATE INDEX IX_Events_IsDeleted ON Events(IS_DELETED);

-- EventSignups Indexes
CREATE INDEX IX_EventSignups_Event ON EventSignups(EVENT_ID);
CREATE INDEX IX_EventSignups_Status ON EventSignups(STATUS);
CREATE INDEX IX_EventSignups_Email ON EventSignups(EMAIL);

-- Gallery Indexes
CREATE INDEX IX_Gallery_Category ON Gallery(CATEGORY, DISPLAY_ORDER);
CREATE INDEX IX_Gallery_IsDeleted ON Gallery(IS_DELETED);

-- Audit Logs Indexes
CREATE INDEX IX_AuditLogs_User ON AuditLogs(USER_ID, TIMESTAMP DESC);
CREATE INDEX IX_AuditLogs_Action ON AuditLogs(ACTION, TIMESTAMP DESC);
CREATE INDEX IX_AuditLogs_Table ON AuditLogs(TABLE_NAME, RECORD_ID);

-- UserSessions Indexes
CREATE INDEX IX_UserSessions_User ON UserSessions(USER_ID, IS_ACTIVE);
CREATE INDEX IX_UserSessions_Active ON UserSessions(IS_ACTIVE, LAST_ACTIVITY);
CREATE INDEX IX_UserSessions_Expires ON UserSessions(EXPIRES_TS);