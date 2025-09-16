# Task: Admin Authentication and Dashboard API

## Task Info
- **Task ID**: admin-001
- **Priority**: Critical
- **Estimated Hours**: 12
- **Module**: Admin
- **Dependencies**: Authentication system, Database setup
- **Business Logic Reference**: Admin Management Dashboard

## Description
Implement admin authentication system and dashboard APIs that provide real-time statistics, system health monitoring, and administrative overview of the platform.

## Technical Requirements

### API Endpoints to Implement

#### 1. POST /admin/login
Admin authentication endpoint.

**Request Body:**
```json
{
  "username": "admin",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "admin": {
    "id": "admin-uuid",
    "username": "admin",
    "role": "super_admin",
    "permissions": ["books.manage", "users.manage", "models.configure"]
  }
}
```

#### 2. GET /admin/dashboard
Get comprehensive dashboard statistics.

**Response:**
```json
{
  "real_time": {
    "online_users": 156,
    "active_dialogues": 42,
    "api_health": {
      "openai": {"status": "healthy", "latency": 120},
      "qwen": {"status": "healthy", "latency": 85}
    }
  },
  "today": {
    "new_users": 23,
    "total_dialogues": 567,
    "new_books": 5,
    "api_cost": 125.50,
    "revenue": 890.00
  },
  "trending": {
    "top_books": [
      {"book_id": "uuid", "title": "红楼梦", "dialogue_count": 89}
    ],
    "top_questions": [
      {"question": "如何提高领导力", "count": 45}
    ]
  }
}
```

### Database Schema

```sql
-- admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'super_admin', 'admin', 'moderator'
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- admin_permissions table
CREATE TABLE admin_permissions (
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES admins(id),
    
    PRIMARY KEY (admin_id, permission),
    INDEX idx_permission (permission)
);

-- admin_audit_logs table
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_admin_id (admin_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- dashboard_metrics table (for caching)
CREATE TABLE dashboard_metrics (
    metric_key VARCHAR(100) PRIMARY KEY,
    metric_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ttl INTEGER DEFAULT 300, -- seconds

    INDEX idx_updated_at (updated_at)
);
```

### Implementation Requirements

1. **Authentication & Authorization**
   ```python
   class AdminAuth:
       def authenticate(username: str, password: str) -> dict:
           # Verify credentials
           admin = get_admin_by_username(username)
           if not verify_password(password, admin.password_hash):
               raise AuthenticationError()

           # Generate JWT with admin claims
           token = generate_admin_jwt(admin)
           
           # Log admin login
           log_admin_action(admin.id, "login")
           
           return token

       def check_permission(admin_id: str, permission: str) -> bool:
           # Check role-based permissions
           role_permissions = get_role_permissions(admin.role)
           custom_permissions = get_admin_permissions(admin_id)
           
           return permission in (role_permissions + custom_permissions)
   ```

2. **Dashboard Data Aggregation**
   ```python
   class DashboardService:
       async def get_real_time_stats():
           # Get from Redis for real-time data
           online_users = redis.get("stats:online_users")
           active_dialogues = redis.get("stats:active_dialogues")
           
           # Check API health
           api_health = await check_all_api_health()
           
           return {
               "online_users": online_users,
               "active_dialogues": active_dialogues,
               "api_health": api_health
           }

       async def get_daily_stats():
           # Aggregate from database
           today = date.today()
           
           stats = await db.fetch_one("""
               SELECT
                   COUNT(DISTINCT u.id) FILTER (WHERE u.created_at::date = $1) as new_users,
                   COUNT(d.id) FILTER (WHERE d.created_at::date = $1) as total_dialogues,
                   COUNT(b.id) FILTER (WHERE b.created_at::date = $1) as new_books,
                   SUM(c.amount) FILTER (WHERE c.date = $1) as api_cost,
                   SUM(p.amount) FILTER (WHERE p.created_at::date = $1) as revenue
               FROM users u
               CROSS JOIN dialogues d
               CROSS JOIN books b
               CROSS JOIN api_costs c
               CROSS JOIN payments p
               WHERE date = $1
           """, today)
           
           return stats
   ```

3. **Role-Based Access Control**
   ```python
   ROLE_PERMISSIONS = {
       'super_admin': ['*'],  # All permissions
       'admin': [
           'books.manage',
           'users.view',
           'users.update',
           'dialogues.view',
           'statistics.view'
       ],
       'moderator': [
           'books.review',
           'users.view',
           'dialogues.view'
       ]
   }
   ```

4. **Audit Logging**
   ```python
   def log_admin_action(admin_id: str, action: str, **kwargs):
       """Log all admin actions for audit trail"""
       await db.execute("""
           INSERT INTO admin_audit_logs 
           (admin_id, action, resource_type, resource_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)
       """, admin_id, action, kwargs.get('resource_type'),
           kwargs.get('resource_id'), json.dumps(kwargs.get('details')),
           kwargs.get('ip_address'))
   ```

## Acceptance Criteria

### Functional Requirements
- [ ] Admin login with username/password works
- [ ] JWT tokens are properly generated and validated
- [ ] Dashboard shows real-time statistics
- [ ] Role-based permissions are enforced
- [ ] All admin actions are logged
- [ ] Invalid credentials return 401

### Security Requirements
- [ ] Passwords are hashed with bcrypt
- [ ] JWT tokens expire after 1 hour
- [ ] Failed login attempts are rate-limited
- [ ] Admin sessions are tracked
- [ ] IP whitelisting support (optional)
- [ ] Two-factor authentication ready

### Performance Requirements
- [ ] Dashboard loads within 500ms
- [ ] Real-time stats update every 5 seconds
- [ ] Metrics are cached appropriately
- [ ] Database queries are optimized

## Test Cases

### Unit Tests
```python
def test_admin_login_success():
    """Test successful admin login"""
    response = client.post("/admin/login", json={
        "username": "admin",
        "password": "correct_password"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["admin"]["role"] == "super_admin"

def test_admin_login_failure():
    """Test failed admin login"""
    response = client.post("/admin/login", json={
        "username": "admin",
        "password": "wrong_password"
    })
    
    assert response.status_code == 401
    assert "error" in response.json()

def test_dashboard_requires_auth():
    """Test dashboard requires authentication"""
    response = client.get("/admin/dashboard")
    assert response.status_code == 401

def test_dashboard_with_auth():
    """Test dashboard with valid auth"""
    token = get_admin_token()
    response = client.get("/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 200
    data = response.json()
    assert "real_time" in data
    assert "today" in data
    assert "trending" in data
```

### Integration Tests
```python
def test_role_based_access():
    """Test different admin roles have correct permissions"""
    # Super admin can access everything
    super_token = login_as_role("super_admin")
    response = client.get("/admin/users",
        headers={"Authorization": f"Bearer {super_token}"})
    assert response.status_code == 200
    
    # Moderator has limited access
    mod_token = login_as_role("moderator")
    response = client.delete("/admin/users/123",
        headers={"Authorization": f"Bearer {mod_token}"})
    assert response.status_code == 403

def test_audit_logging():
    """Test admin actions are logged"""
    token = get_admin_token()
    admin_id = decode_token(token)["admin_id"]
    
    # Perform admin action
    client.post("/admin/books",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "New Book"})
    
    # Check audit log
    logs = db.query(
        "SELECT * FROM admin_audit_logs WHERE admin_id = $1",
        admin_id
    )
    assert len(logs) > 0
    assert logs[0]["action"] == "create_book"
```

### Performance Tests
```python
def test_dashboard_performance():
    """Test dashboard loading performance"""
    token = get_admin_token()
    
    import time
    start = time.time()
    response = client.get("/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"})
    duration = time.time() - start
    
    assert response.status_code == 200
    assert duration < 0.5  # 500ms requirement

def test_concurrent_admin_sessions():
    """Test system handles multiple admin sessions"""
    tokens = [login_admin(f"admin_{i}") for i in range(10)]
    
    tasks = []
    for token in tokens:
        task = async_get_dashboard(token)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    assert all(r.status_code == 200 for r in results)
```

## Implementation Notes

### JWT Token Structure
```python
# Admin JWT payload
{
    "sub": "admin-uuid",
    "username": "admin",
    "role": "super_admin",
    "permissions": ["*"],
    "exp": 1234567890,
    "iat": 1234567890
}
```

### Caching Strategy
```python
# Cache dashboard metrics
DASHBOARD_CACHE_KEY = "admin:dashboard:{metric}"
CACHE_TTL = {
    "real_time": 5,      # 5 seconds
    "today": 60,         # 1 minute
    "trending": 300      # 5 minutes
}
```

### API Health Check
```python
async def check_api_health(provider: str) -> dict:
    """Check health of external API"""
    try:
        start = time.time()
        response = await test_api_call(provider)
        latency = (time.time() - start) * 1000  # ms
        
        return {
            "status": "healthy" if response.ok else "degraded",
            "latency": latency
        }
    except Exception:
        return {"status": "down", "latency": None}
```

## Dependencies
- JWT library (PyJWT)
- Bcrypt for password hashing
- Redis for real-time metrics
- WebSocket for real-time updates
- Rate limiting middleware

## Related Tasks
- auth-001: Base authentication system
- monitoring-001: System monitoring integration
- admin-002: Admin user management