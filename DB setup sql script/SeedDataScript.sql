-- =====================================================
-- 
-- *** Important Note ***
--
-- Run Each SQL Query 1 by 1
-- Dont Run all at once
--
-- =====================================================



-- =====================================================
-- SEED DATA - SCHOOL WEBSITE
-- =====================================================
-- Run this after creating the schema
-- Creates initial system data and sample records

USE school_website;

-- =====================================================
-- 1. SUPER ADMIN USER
-- =====================================================

-- Create the super admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' with bcrypt rounds=12
INSERT INTO AdminUsers (
    USERNAME, EMAIL, PASSWORD_HASH, FIRST_NAME, LAST_NAME, 
    IS_ACTIVE, INACTIVITY_LOCK_ENABLED, INACTIVITY_LOCK_DAYS, CREATED_BY
) VALUES (
    'superadmin', 
    'admin@school.edu', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGtrJrVGu', -- admin123
    'Super', 
    'Administrator',
    1, 0, 365, 1
);

-- Update permissions and roles to reference the super admin (ID 1)
UPDATE Permissions SET CREATED_BY = 1 WHERE CREATED_BY IS NULL;
UPDATE Roles SET CREATED_BY = 1 WHERE CREATED_BY IS NULL;


-- =====================================================
-- 2. DEFAULT SYSTEM ROLES
-- =====================================================

-- Note: We'll update CREATED_BY after creating the super admin
INSERT INTO Roles (ROLE_NAME, DESCRIPTION, IS_SYSTEM_ROLE, INACTIVITY_LOCK_ENABLED, INACTIVITY_LOCK_DAYS, CREATED_BY) VALUES
('Super Admin', 'Full system access - cannot be deleted', 1, 0, 365, 1),
('Administrator', 'Full content and user management', 1, 1, 90, 1),
('Editor', 'Can manage news, events, and gallery', 1, 1, 60, 1),
('Teacher', 'Can create news and manage events', 1, 1, 30, 1),
('Viewer', 'Read-only access to admin panel', 1, 1, 30, 1);

-- =====================================================
-- 3. DEFAULT SYSTEM PERMISSIONS
-- =====================================================

-- Insert system permissions (ID 1 will be the super admin)
INSERT INTO Permissions (PERMISSION_NAME, DESCRIPTION, MODULE, ACTION, IS_SYSTEM_PERMISSION, CREATED_BY) VALUES
-- User Management
('users.create', 'Create new users', 'users', 'create', 1, 1),
('users.read', 'View users', 'users', 'read', 1, 1),
('users.update', 'Update user information', 'users', 'update', 1, 1),
('users.delete', 'Delete users', 'users', 'delete', 1, 1),
('users.manage', 'Full user management access', 'users', 'manage', 1, 1),

-- Role Management
('roles.create', 'Create new roles', 'roles', 'create', 1, 1),
('roles.read', 'View roles', 'roles', 'read', 1, 1),
('roles.update', 'Update roles', 'roles', 'update', 1, 1),
('roles.delete', 'Delete roles', 'roles', 'delete', 1, 1),
('roles.manage', 'Full role management access', 'roles', 'manage', 1, 1),

-- News Management
('news.create', 'Create news articles', 'news', 'create', 1, 1),
('news.read', 'View news articles', 'news', 'read', 1, 1),
('news.update', 'Update news articles', 'news', 'update', 1, 1),
('news.delete', 'Delete news articles', 'news', 'delete', 1, 1),
('news.publish', 'Publish/unpublish news', 'news', 'publish', 1, 1),

-- Events Management
('events.create', 'Create events', 'events', 'create', 1, 1),
('events.read', 'View events', 'events', 'read', 1, 1),
('events.update', 'Update events', 'events', 'update', 1, 1),
('events.delete', 'Delete events', 'events', 'delete', 1, 1),
('events.publish', 'Publish/unpublish events', 'events', 'publish', 1, 1),
('events.manage_signups', 'Manage event signups', 'events', 'manage_signups', 1, 1),

-- Gallery Management
('gallery.create', 'Upload images', 'gallery', 'create', 1, 1),
('gallery.read', 'View gallery', 'gallery', 'read', 1, 1),
('gallery.update', 'Update gallery items', 'gallery', 'update', 1, 1),
('gallery.delete', 'Delete gallery items', 'gallery', 'delete', 1, 1),

-- Content Management
('content.read', 'View content pages', 'content', 'read', 1, 1),
('content.update', 'Update content pages', 'content', 'update', 1, 1),

-- System Settings
('settings.read', 'View system settings', 'settings', 'read', 1, 1),
('settings.update', 'Update system settings', 'settings', 'update', 1, 1),

-- Audit & Reports
('audit.read', 'View audit logs', 'audit', 'read', 1, 1),
('reports.view', 'View reports and analytics', 'reports', 'view', 1, 1);


-- =====================================================
-- 4. ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Super Admin gets ALL permissions
INSERT INTO RolePermissions (ROLE_ID, PERMISSION_ID, ASSIGNED_BY)
SELECT 1, ID, 1 FROM Permissions;

-- Administrator gets most permissions (exclude some super admin only features)
INSERT INTO RolePermissions (ROLE_ID, PERMISSION_ID, ASSIGNED_BY)
SELECT 2, p.ID, 1 
FROM Permissions p 
WHERE p.PERMISSION_NAME NOT IN ('users.delete', 'roles.delete', 'settings.update');

-- Editor gets content management permissions
INSERT INTO RolePermissions (ROLE_ID, PERMISSION_ID, ASSIGNED_BY)
SELECT 3, p.ID, 1 
FROM Permissions p 
WHERE p.MODULE IN ('news', 'events', 'gallery', 'content') 
   AND p.ACTION != 'delete';

-- Teacher gets limited content permissions
INSERT INTO RolePermissions (ROLE_ID, PERMISSION_ID, ASSIGNED_BY)
SELECT 4, p.ID, 1 
FROM Permissions p 
WHERE (p.MODULE = 'news' AND p.ACTION IN ('create', 'read', 'update'))
   OR (p.MODULE = 'events' AND p.ACTION IN ('create', 'read', 'update', 'manage_signups'))
   OR (p.MODULE = 'gallery' AND p.ACTION = 'read');

-- Viewer gets read-only permissions
INSERT INTO RolePermissions (ROLE_ID, PERMISSION_ID, ASSIGNED_BY)
SELECT 5, p.ID, 1 
FROM Permissions p 
WHERE p.ACTION = 'read';

-- =====================================================
-- 5. ASSIGN SUPER ADMIN ROLE
-- =====================================================

INSERT INTO UserRoles (USER_ID, ROLE_ID, ASSIGNED_BY) VALUES (1, 1, 1);

-- =====================================================
-- 6. DEFAULT SITE SETTINGS
-- =====================================================

INSERT INTO SiteSettings (SETTING_KEY, SETTING_VALUE, DESCRIPTION, CATEGORY, IS_SYSTEM_SETTING, UPDATED_BY) VALUES
-- General Site Settings
('site.name', 'School Website', 'Website name', 'general', 1, 1),
('site.description', 'Welcome to our school website', 'Site description for SEO', 'general', 1, 1),
('site.logo', '/uploads/logo.png', 'Site logo path', 'general', 0, 1),
('site.favicon', '/favicon.ico', 'Favicon path', 'general', 0, 1),
('site.default_language', 'en', 'Default website language', 'general', 1, 1),
('site.supported_languages', 'en,ms', 'Supported languages (comma separated)', 'general', 0, 1),

-- Contact Information
('contact.email', 'info@school.edu', 'Main contact email', 'contact', 0, 1),
('contact.phone', '+60 3-1234 5678', 'Main phone number', 'contact', 0, 1),
('contact.address', '123 Education Street, Kuala Lumpur, Malaysia', 'School address', 'contact', 0, 1),

-- Email Configuration
('email.from_name', 'School Website', 'From name for system emails', 'email', 0, 1),
('email.from_email', 'noreply@school.edu', 'From email for system emails', 'email', 0, 1),
('email.smtp_host', 'smtp.gmail.com', 'SMTP server host', 'email', 0, 1),
('email.smtp_port', '587', 'SMTP server port', 'email', 0, 1),

-- Security Settings
('security.session_timeout', '86400', 'Session timeout in seconds (24 hours)', 'security', 1, 1),
('security.max_login_attempts', '5', 'Maximum login attempts before lockout', 'security', 1, 1),
('security.lockout_duration', '3600', 'Lockout duration in seconds (1 hour)', 'security', 1, 1),
('security.inactivity_check_enabled', 'true', 'Enable inactivity checking', 'security', 1, 1),

-- File Upload Settings
('upload.max_file_size', '5242880', 'Maximum file size in bytes (5MB)', 'upload', 0, 1),
('upload.allowed_types', 'image/jpeg,image/png,image/gif,application/pdf', 'Allowed file types', 'upload', 0, 1),
('upload.gallery_path', '/uploads/gallery/', 'Gallery upload path', 'upload', 0, 1),
('upload.news_path', '/uploads/news/', 'News images upload path', 'upload', 0, 1);

-- =====================================================
-- 7. DEFAULT CONTENT PAGES
-- =====================================================

INSERT INTO ContentPages (PAGE_KEY, TITLE, CONTENT, META_TITLE, META_DESCRIPTION, LANGUAGE_CODE, IS_PUBLISHED, UPDATED_BY) VALUES
-- About Page (English)
('about', 'About Our School', 
'<h2>Welcome to Our School</h2>
<p>We are committed to providing excellent education and nurturing young minds for the future. Our school has been serving the community for over 50 years.</p>
<h3>Our Mission</h3>
<p>To provide quality education that develops students intellectually, emotionally, and socially.</p>
<h3>Our Vision</h3>
<p>To be a leading educational institution that prepares students for success in the 21st century.</p>', 
'About Our School - Excellence in Education', 
'Learn about our school''s history, mission, and commitment to educational excellence.', 
'en', 1, 1),

-- Contact Page (English)
('contact', 'Contact Us', 
'<h2>Get In Touch</h2>
<p>We would love to hear from you. Contact us for admissions, inquiries, or any questions.</p>
<h3>Office Hours</h3>
<p>Monday - Friday: 8:00 AM - 5:00 PM<br>Saturday: 8:00 AM - 12:00 PM<br>Sunday: Closed</p>',
'Contact Us - Get In Touch', 
'Contact our school for admissions, inquiries, and general information.', 
'en', 1, 1),

-- Privacy Policy (English)
('privacy', 'Privacy Policy', 
'<h2>Privacy Policy</h2>
<p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>
<h3>Information We Collect</h3>
<p>We collect information you provide directly to us, such as when you contact us or register for events.</p>',
'Privacy Policy', 
'Our privacy policy explains how we handle and protect your personal information.', 
'en', 1, 1);

-- =====================================================
-- 8. SAMPLE DATA (Optional)
-- =====================================================

-- Sample News Article
INSERT INTO News (TITLE, SLUG, CONTENT, EXCERPT, IS_PUBLISHED, IS_FEATURED, PUBLISHED_TS, META_TITLE, META_DESCRIPTION, CREATED_BY) VALUES
('Welcome to the New School Year', 'welcome-new-school-year', 
'<p>We are excited to welcome all students back for another amazing school year! This year brings new opportunities, challenges, and exciting learning experiences.</p>
<p>Our dedicated teachers and staff have been working hard to prepare engaging curriculum and activities for all our students.</p>
<h3>New Features This Year:</h3>
<ul>
<li>Updated science laboratories</li>
<li>New library resources</li>
<li>Enhanced sports facilities</li>
<li>Digital learning platforms</li>
</ul>
<p>We look forward to a successful and enriching academic year ahead!</p>', 
'Welcome back message for the new school year with updates on facilities and programs.', 
1, 1, GETDATE(), 
'Welcome to New School Year - School Updates', 
'Welcome back to school! Discover new facilities and programs for the upcoming academic year.', 
1),

('Annual Sports Day Registration Open', 'annual-sports-day-registration', 
'<p>Registration is now open for our Annual Sports Day! This exciting event will showcase our students'' athletic talents and promote healthy competition.</p>
<p><strong>Event Date:</strong> March 15, 2024<br>
<strong>Time:</strong> 8:00 AM - 5:00 PM<br>
<strong>Venue:</strong> School Sports Complex</p>
<p>Students can participate in various categories including track and field, team sports, and fun activities.</p>', 
'Annual Sports Day registration is now open. Join us for a day of athletic competition and fun!', 
1, 0, GETDATE(), 
'Annual Sports Day Registration - Join the Fun', 
'Register now for our Annual Sports Day featuring track and field, team sports, and activities.', 
1);

-- Sample Events
INSERT INTO Events (TITLE, SLUG, DESCRIPTION, SHORT_DESCRIPTION, EVENT_START_TS, EVENT_END_TS, LOCATION, MAX_PARTICIPANTS, REGISTRATION_DEADLINE, IS_PUBLISHED, IS_REGISTRATION_OPEN, CREATED_BY) VALUES
('Parent-Teacher Conference', 'parent-teacher-conference-2024', 
'<p>Join us for our quarterly Parent-Teacher Conference where you can meet with your child''s teachers to discuss academic progress, achievements, and areas for improvement.</p>
<p><strong>What to Expect:</strong></p>
<ul>
<li>Individual meetings with teachers</li>
<li>Academic progress reports</li>
<li>Personalized feedback and recommendations</li>
<li>Q&A sessions</li>
</ul>
<p>Please bring your child''s report card and any questions you may have.</p>', 
'Quarterly meeting between parents and teachers to discuss student progress and development.', 
DATEADD(day, 30, GETDATE()), 
DATEADD(day, 30, DATEADD(hour, 8, GETDATE())), 
'School Conference Hall', 
200, 
DATEADD(day, 25, GETDATE()), 
1, 1, 1),

('Science Fair 2024', 'science-fair-2024', 
'<p>Our annual Science Fair is back! Students will showcase their innovative projects and scientific discoveries.</p>
<p><strong>Categories:</strong></p>
<ul>
<li>Physics & Engineering</li>
<li>Biology & Life Sciences</li>
<li>Chemistry</li>
<li>Environmental Science</li>
<li>Computer Science & Technology</li>
</ul>
<p>Prizes will be awarded for the most innovative, well-researched, and presented projects.</p>', 
'Annual Science Fair featuring student projects across multiple scientific disciplines with prizes.', 
DATEADD(day, 45, GETDATE()), 
DATEADD(day, 45, DATEADD(hour, 6, GETDATE())), 
'School Auditorium', 
NULL, 
DATEADD(day, 40, GETDATE()), 
1, 1, 1),

('Cultural Night Performance', 'cultural-night-2024', 
'<p>Celebrate diversity and culture at our annual Cultural Night! Students, teachers, and families will showcase traditional performances, music, and art from various cultures.</p>
<p><strong>Performances Include:</strong></p>
<ul>
<li>Traditional dances</li>
<li>Musical performances</li>
<li>Poetry and storytelling</li>
<li>Art exhibitions</li>
<li>Cultural food stalls</li>
</ul>
<p>This is a wonderful opportunity to learn about different cultures and celebrate our diversity.</p>', 
'Annual cultural celebration featuring performances, art, and food from diverse cultures.', 
DATEADD(day, 60, GETDATE()), 
DATEADD(day, 60, DATEADD(hour, 4, GETDATE())), 
'School Multipurpose Hall', 
500, 
DATEADD(day, 55, GETDATE()), 
1, 1, 1);

-- Sample Gallery Items
INSERT INTO Gallery (TITLE, DESCRIPTION, IMAGE_PATH, CATEGORY, DISPLAY_ORDER, IS_FEATURED, UPLOADED_BY) VALUES
('New Science Laboratory', 'Our state-of-the-art science laboratory equipped with modern equipment and safety features.', '/uploads/gallery/science-lab-1.jpg', 'facilities', 1, 1, 1),
('Students in Action', 'Students engaged in hands-on learning activities during chemistry class.', '/uploads/gallery/students-chemistry.jpg', 'academics', 2, 1, 1),
('Sports Day Winners', 'Celebrating our champions from the Annual Sports Day 2023.', '/uploads/gallery/sports-day-winners.jpg', 'events', 3, 1, 1),
('Library Reading Corner', 'Our cozy reading corner in the newly renovated library space.', '/uploads/gallery/library-corner.jpg', 'facilities', 4, 0, 1),
('Art Exhibition', 'Student artwork displayed during our annual art exhibition.', '/uploads/gallery/art-exhibition.jpg', 'achievements', 5, 0, 1);

-- =====================================================
-- 9. SAMPLE EVENT SIGNUPS (for testing)
-- =====================================================

INSERT INTO EventSignups (EVENT_ID, PARTICIPANT_TYPE, FIRST_NAME, LAST_NAME, EMAIL, PHONE, STUDENT_ID, CLASS_GRADE, IDENTITY_NO, STATUS, CONFIRMATION_EMAIL_SENT) VALUES
(1, 'parent', 'John', 'Smith', 'john.smith@email.com', '+60123456789', NULL, NULL, '123456789012', 'confirmed', 1),
(1, 'parent', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '+60123456790', NULL, NULL, '123456789013', 'pending', 0),
(2, 'student', 'Emily', 'Wong', 'emily.wong@student.school.edu', '+60123456791', 'STU2024001', 'Grade 10', '123456789014', 'confirmed', 1),
(2, 'student', 'David', 'Lee', 'david.lee@student.school.edu', '+60123456792', 'STU2024002', 'Grade 11', '123456789015', 'confirmed', 1),
(3, 'teacher', 'Maria', 'Garcia', 'maria.garcia@school.edu', '+60123456793', NULL, NULL, '123456789016', 'confirmed', 1);

-- =====================================================
-- 10. AUDIT LOG SAMPLE (System initialization)
-- =====================================================

INSERT INTO AuditLogs (USER_ID, ACTION, TABLE_NAME, RECORD_ID, NEW_VALUES, IP_ADDRESS, USER_AGENT) VALUES
(1, 'CREATE', 'AdminUsers', 1, '{"username":"superadmin","email":"admin@school.edu","role":"Super Admin"}', '127.0.0.1', 'System-Initial-Setup'),
(1, 'CREATE', 'Roles', 1, '{"role_name":"Super Admin","description":"Full system access"}', '127.0.0.1', 'System-Initial-Setup'),
(1, 'CREATE', 'News', 1, '{"title":"Welcome to the New School Year","status":"published"}', '127.0.0.1', 'System-Initial-Setup');

-- =====================================================
-- 11. TRIGGERS FOR AUTO-AUDIT (Optional)
-- =====================================================

-- Trigger for AdminUsers audit logging
CREATE TRIGGER TR_AdminUsers_Audit
ON AdminUsers
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Action NVARCHAR(10);
    DECLARE @UserId INT;
    
    -- Determine action type
    IF EXISTS(SELECT * FROM inserted) AND EXISTS(SELECT * FROM deleted)
        SET @Action = 'UPDATE';
    ELSE IF EXISTS(SELECT * FROM inserted)
        SET @Action = 'CREATE';
    ELSE
        SET @Action = 'DELETE';
    
    -- Get user ID from context (you'll need to set this in your application)
    -- For now, we'll use a default system user
    SET @UserId = 1;
    
    -- Insert audit records for each affected row
    IF @Action = 'CREATE'
    BEGIN
        INSERT INTO AuditLogs (USER_ID, ACTION, TABLE_NAME, RECORD_ID, NEW_VALUES, IP_ADDRESS)
        SELECT @UserId, @Action, 'AdminUsers', i.ID, 
               '{"username":"' + i.USERNAME + '","email":"' + i.EMAIL + '","active":"' + CAST(i.IS_ACTIVE AS NVARCHAR(1)) + '"}',
               '127.0.0.1'
        FROM inserted i;
    END
    ELSE IF @Action = 'UPDATE'
    BEGIN
        INSERT INTO AuditLogs (USER_ID, ACTION, TABLE_NAME, RECORD_ID, OLD_VALUES, NEW_VALUES, IP_ADDRESS)
        SELECT @UserId, @Action, 'AdminUsers', i.ID,
               '{"username":"' + d.USERNAME + '","email":"' + d.EMAIL + '","active":"' + CAST(d.IS_ACTIVE AS NVARCHAR(1)) + '"}',
               '{"username":"' + i.USERNAME + '","email":"' + i.EMAIL + '","active":"' + CAST(i.IS_ACTIVE AS NVARCHAR(1)) + '"}',
               '127.0.0.1'
        FROM inserted i
        INNER JOIN deleted d ON i.ID = d.ID;
    END
    ELSE IF @Action = 'DELETE'
    BEGIN
        INSERT INTO AuditLogs (USER_ID, ACTION, TABLE_NAME, RECORD_ID, OLD_VALUES, IP_ADDRESS)
        SELECT @UserId, @Action, 'AdminUsers', d.ID,
               '{"username":"' + d.USERNAME + '","email":"' + d.EMAIL + '","active":"' + CAST(d.IS_ACTIVE AS NVARCHAR(1)) + '"}',
               '127.0.0.1'
        FROM deleted d;
    END
END;

-- =====================================================
-- 12. USEFUL VIEWS FOR REPORTING
-- =====================================================

-- User Permissions View (flattened for easy querying)
CREATE VIEW VW_UserPermissions AS
SELECT 
    u.ID as USER_ID,
    u.USERNAME,
    u.EMAIL,
    r.ROLE_NAME,
    p.PERMISSION_NAME,
    p.MODULE,
    p.ACTION,
    p.DESCRIPTION as PERMISSION_DESCRIPTION
FROM AdminUsers u
INNER JOIN UserRoles ur ON u.ID = ur.USER_ID AND ur.IS_ACTIVE = 1
INNER JOIN Roles r ON ur.ROLE_ID = r.ID AND r.IS_ACTIVE = 1
INNER JOIN RolePermissions rp ON r.ID = rp.ROLE_ID AND rp.IS_GRANTED = 1
INNER JOIN Permissions p ON rp.PERMISSION_ID = p.ID
WHERE u.IS_ACTIVE = 1;

-- Active Events View
CREATE VIEW VW_ActiveEvents AS
SELECT 
    e.ID,
    e.TITLE,
    e.SLUG,
    e.SHORT_DESCRIPTION,
    e.EVENT_START_TS,
    e.EVENT_END_TS,
    e.LOCATION,
    e.MAX_PARTICIPANTS,
    e.REGISTRATION_DEADLINE,
    e.IS_REGISTRATION_OPEN,
    COUNT(es.ID) as CURRENT_SIGNUPS,
    CASE 
        WHEN e.MAX_PARTICIPANTS IS NULL THEN 'Unlimited'
        WHEN COUNT(es.ID) >= e.MAX_PARTICIPANTS THEN 'Full'
        ELSE CAST((e.MAX_PARTICIPANTS - COUNT(es.ID)) AS NVARCHAR(10)) + ' spots left'
    END as AVAILABILITY_STATUS
FROM Events e
LEFT JOIN EventSignups es ON e.ID = es.EVENT_ID AND es.STATUS IN ('confirmed', 'pending')
WHERE e.IS_PUBLISHED = 1 
  AND e.IS_DELETED = 0
  AND e.EVENT_START_TS > GETDATE()
GROUP BY e.ID, e.TITLE, e.SLUG, e.SHORT_DESCRIPTION, e.EVENT_START_TS, 
         e.EVENT_END_TS, e.LOCATION, e.MAX_PARTICIPANTS, e.REGISTRATION_DEADLINE, e.IS_REGISTRATION_OPEN;

-- Published News View
CREATE VIEW VW_PublishedNews AS
SELECT 
    n.ID,
    n.TITLE,
    n.SLUG,
    n.EXCERPT,
    n.FEATURED_IMAGE,
    n.IS_FEATURED,
    n.PUBLISHED_TS,
    n.LANGUAGE_CODE,
    u.FIRST_NAME + ' ' + u.LAST_NAME as AUTHOR_NAME
FROM News n
INNER JOIN AdminUsers u ON n.CREATED_BY = u.ID
WHERE n.IS_PUBLISHED = 1 
  AND n.IS_DELETED = 0
  AND n.PUBLISHED_TS <= GETDATE();

-- =====================================================
-- 13. SECURITY PROCEDURES
-- =====================================================

-- Procedure to clean up expired sessions
CREATE PROCEDURE SP_CleanupExpiredSessions
AS
BEGIN
    DELETE FROM UserSessions 
    WHERE EXPIRES_TS < GETDATE() OR IS_ACTIVE = 0;
    
    SELECT @@ROWCOUNT as SESSIONS_CLEANED;
END;

-- Procedure to check for inactive users
CREATE PROCEDURE SP_CheckInactiveUsers
AS
BEGIN
    DECLARE @current_time DATETIME2 = GETDATE();
    
    -- Lock users who have exceeded inactivity period
    UPDATE AdminUsers 
    SET IS_LOCKED = 1,
        LOCKED_UNTIL_TS = DATEADD(HOUR, 1, @current_time)
    WHERE IS_ACTIVE = 1 
      AND IS_LOCKED = 0
      AND INACTIVITY_LOCK_ENABLED = 1
      AND DATEDIFF(DAY, LAST_LOGIN_TS, @current_time) > INACTIVITY_LOCK_DAYS;
    
    SELECT @@ROWCOUNT as USERS_LOCKED_FOR_INACTIVITY;
END;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
