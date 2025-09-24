-- Create admins table if not exists
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'moderator',
    status TEXT NOT NULL DEFAULT 'active',
    permissions TEXT DEFAULT '[]',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    login_count INTEGER DEFAULT 0,
    failed_login_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}'
);

-- Delete existing admin if exists
DELETE FROM admins WHERE username = 'admin';

-- Insert default admin with bcrypt hashed password
-- Password: admin123
-- Hash generated using bcrypt with cost factor 12
INSERT INTO admins (
    id,
    username,
    email,
    password_hash,
    role,
    status,
    permissions,
    created_at,
    updated_at
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin',
    'admin@inknowing.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewpuTpMs.2B5VJoi',  -- admin123
    'super_admin',
    'active',
    '["*"]',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);