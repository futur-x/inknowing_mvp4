-- ================================
-- RBAC Permission System Tables
-- Generated: 2025-09-23
-- Purpose: Create complete RBAC permission system
-- ================================

-- 1. 角色表
CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_role_id UUID REFERENCES auth.roles(id) ON DELETE SET NULL,
    is_system BOOLEAN DEFAULT FALSE, -- 系统预设角色不可删除
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.admin_users(id)
);

-- 2. 权限表
CREATE TABLE IF NOT EXISTS auth.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- 例如: user.view, user.create
    module VARCHAR(50) NOT NULL, -- 模块: user, book, dialogue, stats
    action VARCHAR(50) NOT NULL, -- 操作: view, create, edit, delete, export
    resource VARCHAR(100), -- 资源标识
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 角色权限关联表
CREATE TABLE IF NOT EXISTS auth.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.admin_users(id),
    UNIQUE(role_id, permission_id)
);

-- 4. 改造admin_users表，添加更多字段
ALTER TABLE auth.admin_users
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS real_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar TEXT,
    ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES auth.roles(id),
    ADD COLUMN IF NOT EXISTS extra_permissions JSONB DEFAULT '[]', -- 额外权限
    ADD COLUMN IF NOT EXISTS denied_permissions JSONB DEFAULT '[]', -- 禁用权限
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS login_ip VARCHAR(45),
    ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.admin_users(id);

-- 5. 操作审计日志表
CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.admin_users(id),
    action VARCHAR(100) NOT NULL, -- 操作类型
    module VARCHAR(50) NOT NULL, -- 模块
    resource_type VARCHAR(50), -- 资源类型
    resource_id VARCHAR(255), -- 资源ID
    old_value JSONB, -- 原值
    new_value JSONB, -- 新值
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'success', -- success, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 权限策略表（高级功能：数据级权限）
CREATE TABLE IF NOT EXISTS auth.permission_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES auth.roles(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 资源类型: user, book, dialogue
    policy_type VARCHAR(20) NOT NULL, -- all, own, department, custom
    conditions JSONB, -- 自定义条件
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. IP白名单表
CREATE TABLE IF NOT EXISTS auth.ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    ip_range_start INET,
    ip_range_end INET,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 8. 登录会话表
CREATE TABLE IF NOT EXISTS auth.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.admin_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_roles_parent ON auth.roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_active ON auth.roles(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON auth.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON auth.permissions(code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON auth.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON auth.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON auth.admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON auth.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON auth.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON auth.audit_logs(action, module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON auth.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_policies_role ON auth.permission_policies(role_id);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_admin ON auth.ip_whitelist(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON auth.admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON auth.admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON auth.admin_sessions(expires_at);

-- 插入系统预设角色
INSERT INTO auth.roles (name, display_name, description, is_system) VALUES
    ('super_admin', '超级管理员', '拥有系统所有权限', TRUE),
    ('admin', '管理员', '拥有大部分管理权限', TRUE),
    ('operator', '运营人员', '负责内容运营和用户管理', TRUE),
    ('support', '客服人员', '负责用户支持和问题处理', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 插入基础权限
INSERT INTO auth.permissions (code, module, action, description) VALUES
    -- 用户模块
    ('user.view', 'user', 'view', '查看用户列表和详情'),
    ('user.create', 'user', 'create', '创建用户'),
    ('user.edit', 'user', 'edit', '编辑用户信息'),
    ('user.delete', 'user', 'delete', '删除用户'),
    ('user.export', 'user', 'export', '导出用户数据'),

    -- 书籍模块
    ('book.view', 'book', 'view', '查看书籍列表和详情'),
    ('book.create', 'book', 'create', '上传新书籍'),
    ('book.edit', 'book', 'edit', '编辑书籍信息'),
    ('book.delete', 'book', 'delete', '删除书籍'),
    ('book.approve', 'book', 'approve', '审核书籍'),

    -- 对话模块
    ('dialogue.view', 'dialogue', 'view', '查看对话记录'),
    ('dialogue.export', 'dialogue', 'export', '导出对话数据'),
    ('dialogue.delete', 'dialogue', 'delete', '删除对话记录'),

    -- 统计模块
    ('stats.view', 'stats', 'view', '查看统计数据'),
    ('stats.export', 'stats', 'export', '导出统计报表'),

    -- 管理员模块
    ('admin.view', 'admin', 'view', '查看管理员列表'),
    ('admin.create', 'admin', 'create', '创建管理员账户'),
    ('admin.edit', 'admin', 'edit', '编辑管理员信息'),
    ('admin.delete', 'admin', 'delete', '删除管理员账户'),
    ('admin.role', 'admin', 'role', '管理角色权限'),

    -- 系统模块
    ('system.config', 'system', 'config', '系统配置管理'),
    ('system.audit', 'system', 'audit', '查看审计日志'),
    ('system.backup', 'system', 'backup', '系统备份'),
    ('system.monitor', 'system', 'monitor', '系统监控')
ON CONFLICT (code) DO NOTHING;

-- 为超级管理员角色分配所有权限
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为管理员角色分配权限（除了系统级权限）
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE r.name = 'admin'
    AND p.module != 'system'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为运营人员分配权限
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE r.name = 'operator'
    AND p.code IN (
        'user.view', 'user.edit',
        'book.view', 'book.create', 'book.edit', 'book.approve',
        'dialogue.view', 'dialogue.export',
        'stats.view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为客服人员分配权限
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE r.name = 'support'
    AND p.code IN (
        'user.view',
        'book.view',
        'dialogue.view',
        'stats.view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 创建触发器：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON auth.roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permission_policies_updated_at
    BEFORE UPDATE ON auth.permission_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：检查用户权限
CREATE OR REPLACE FUNCTION auth.check_admin_permission(
    p_admin_id UUID,
    p_permission_code VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- 检查是否被明确禁用
    SELECT NOT (denied_permissions @> to_jsonb(p_permission_code))
    INTO v_has_permission
    FROM auth.admin_users
    WHERE id = p_admin_id;

    IF NOT v_has_permission THEN
        RETURN FALSE;
    END IF;

    -- 检查角色权限或额外权限
    SELECT EXISTS (
        SELECT 1
        FROM auth.admin_users au
        LEFT JOIN auth.role_permissions rp ON rp.role_id = au.role_id
        LEFT JOIN auth.permissions p ON p.id = rp.permission_id
        WHERE au.id = p_admin_id
            AND (
                p.code = p_permission_code
                OR au.extra_permissions @> to_jsonb(p_permission_code)
            )
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- 创建视图：管理员权限视图
CREATE OR REPLACE VIEW auth.admin_permissions_view AS
SELECT
    au.id as admin_id,
    au.username,
    r.name as role_name,
    r.display_name as role_display_name,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'code', p.code,
                'module', p.module,
                'action', p.action,
                'description', p.description
            )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::jsonb
    ) as permissions
FROM auth.admin_users au
LEFT JOIN auth.roles r ON r.id = au.role_id
LEFT JOIN auth.role_permissions rp ON rp.role_id = r.id
LEFT JOIN auth.permissions p ON p.id = rp.permission_id
GROUP BY au.id, au.username, r.name, r.display_name;

COMMENT ON TABLE auth.roles IS 'RBAC角色表';
COMMENT ON TABLE auth.permissions IS '权限定义表';
COMMENT ON TABLE auth.role_permissions IS '角色权限关联表';
COMMENT ON TABLE auth.audit_logs IS '操作审计日志表';
COMMENT ON TABLE auth.permission_policies IS '权限策略表（数据级权限）';
COMMENT ON TABLE auth.ip_whitelist IS 'IP白名单表';
COMMENT ON TABLE auth.admin_sessions IS '管理员会话表';