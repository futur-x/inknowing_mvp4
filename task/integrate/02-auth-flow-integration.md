# 02 - Authentication Flow Integration Test
## 用户认证流程前后端集成测试

### 测试目标
确保用户注册、登录、登出流程的前后端完全对接成功

### 前置条件
- 测试模式启用（验证码固定为 123456）
- 清理测试用户数据
- JWT 配置正确

### 测试任务清单

#### Task 1: 用户注册流程
- [ ] 访问注册页面 `/auth/register`
- [ ] 填写手机号：13900000001
- [ ] 点击发送验证码，验证调用 `POST /v1/auth/send-code`
- [ ] 输入验证码 123456
- [ ] 填写密码和昵称
- [ ] 提交注册，验证调用 `POST /v1/auth/register`
- [ ] 验证返回 JWT tokens
- [ ] 验证 localStorage 存储 token 和 refreshToken
- [ ] 验证自动跳转到首页

#### Task 2: 用户登录流程
- [ ] 访问登录页面 `/auth/login`
- [ ] 输入手机号和密码
- [ ] 提交登录，验证调用 `POST /v1/auth/login`
- [ ] 验证返回的用户数据结构
- [ ] 验证前端状态更新（useAuthStore）
- [ ] 验证头部显示用户信息和配额

#### Task 3: Token 刷新机制
- [ ] 验证 token 过期前自动刷新
- [ ] 验证调用 `POST /v1/auth/refresh`
- [ ] 验证新 token 自动更新到 localStorage
- [ ] 验证 API 请求自动携带新 token

#### Task 4: 用户信息获取
- [ ] 登录后自动获取用户资料 `GET /v1/users/profile`
- [ ] 获取用户配额 `GET /v1/users/quota`
- [ ] 获取会员信息 `GET /v1/users/membership`
- [ ] 验证数据在前端正确展示

#### Task 5: 登出流程
- [ ] 点击用户菜单
- [ ] 选择登出选项
- [ ] 验证调用 `POST /v1/auth/logout`
- [ ] 验证清除 localStorage
- [ ] 验证前端状态重置
- [ ] 验证跳转到首页

### API 端点清单
```yaml
auth_endpoints:
  - POST /v1/auth/send-code
  - POST /v1/auth/register
  - POST /v1/auth/login
  - POST /v1/auth/refresh
  - POST /v1/auth/logout

user_endpoints:
  - GET /v1/users/profile
  - GET /v1/users/quota
  - GET /v1/users/membership
  - PATCH /v1/users/profile
```

### 请求/响应格式验证

#### 注册请求
```json
{
  "phone": "13900000001",
  "password": "Test123456",
  "code": "123456",
  "nickname": "TestUser"
}
```

#### 登录响应
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "phone": "13900000001",
    "nickname": "TestUser",
    "membership": "free",
    "points": 0
  }
}
```

### 前端状态验证
- [ ] useAuthStore.isAuthenticated = true
- [ ] useAuthStore.user 包含正确用户信息
- [ ] useAuthStore.token 不为空
- [ ] API 请求头包含 Authorization: Bearer {token}

### 错误场景测试
- [ ] 手机号已注册
- [ ] 验证码错误
- [ ] 密码不符合规则
- [ ] 登录密码错误
- [ ] Token 过期处理
- [ ] 网络错误处理

### 测试数据
```json
{
  "test_users": [
    {
      "phone": "13900000001",
      "password": "Test123456",
      "nickname": "TestUser1"
    },
    {
      "phone": "13900000002",
      "password": "Test123456",
      "nickname": "TestUser2"
    }
  ],
  "test_verification_code": "123456"
}
```