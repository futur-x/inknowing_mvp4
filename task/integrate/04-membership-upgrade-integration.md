# 04 - Membership Upgrade Integration Test
## 会员升级流程前后端集成测试

### 测试目标
验证免费用户升级到付费会员的完整流程前后端对接

### 前置条件
- 使用免费账号登录
- 模拟支付接口可用
- 会员权益配置正确

### 测试任务清单

#### Task 1: 会员页面展示
- [ ] 访问 `/membership` 页面
- [ ] 验证调用 `GET /v1/users/membership`
- [ ] 验证当前会员状态显示（FREE）
- [ ] 验证调用 `GET /v1/membership/plans` 获取套餐列表
- [ ] 验证套餐价格和权益正确展示

#### Task 2: 选择升级套餐
- [ ] 选择 Basic/Premium/Super 套餐
- [ ] 选择付费周期（月付/年付）
- [ ] 验证价格计算正确
- [ ] 点击"立即升级"按钮
- [ ] 验证调用 `POST /v1/users/membership/upgrade`

#### Task 3: 支付流程
- [ ] 验证创建支付订单
- [ ] 选择支付方式（微信/支付宝）
- [ ] 验证调用 `POST /v1/payment/create-order`
- [ ] 模拟支付成功回调
- [ ] 验证调用 `POST /v1/payment/callback/wechat`

#### Task 4: 会员激活验证
- [ ] 支付成功后验证会员状态更新
- [ ] 验证调用 `GET /v1/users/membership` 返回新状态
- [ ] 验证配额更新（从20/天到200/月）
- [ ] 验证新功能解锁（如上传书籍）

#### Task 5: 权益生效测试
- [ ] 验证上传入口显示（Premium以上）
- [ ] 验证对话配额增加
- [ ] 验证角色对话功能解锁
- [ ] 验证优先响应标识

### API 端点清单
```yaml
membership_endpoints:
  - GET /v1/membership/plans
  - POST /v1/users/membership/upgrade
  - GET /v1/users/membership

payment_endpoints:
  - POST /v1/payment/create-order
  - GET /v1/payment/order/{orderId}
  - POST /v1/payment/callback/wechat
  - POST /v1/payment/callback/alipay
```

### 升级请求格式
```json
{
  "plan": "premium",
  "duration": 1,
  "payment_method": "wechat"
}
```

### 支付订单响应
```json
{
  "order_id": "ORD-2025011700001",
  "user_id": "user-uuid",
  "type": "membership",
  "plan": "premium",
  "amount": 59.9,
  "currency": "CNY",
  "status": "pending",
  "payment_url": "https://payment.gateway/pay/xxx",
  "expires_at": "2025-01-17T10:30:00Z"
}
```

### 会员套餐对比
```yaml
free:
  daily_quota: 20
  features: ["书籍对话"]

basic:
  monthly_quota: 200
  price_monthly: 29.9
  features: ["书籍对话", "角色对话", "历史保存"]

premium:
  monthly_quota: 500
  price_monthly: 59.9
  features: ["所有Basic功能", "上传3本书", "优先响应"]

super:
  monthly_quota: 1000
  price_monthly: 99.9
  features: ["所有Premium功能", "上传10本书", "自定义AI模型"]
```

### 前端状态更新验证
- [ ] useAuthStore.user.membership 更新
- [ ] 头部配额显示更新
- [ ] 功能入口权限更新
- [ ] 会员标识显示

### 错误场景测试
- [ ] 支付失败处理
- [ ] 订单超时处理
- [ ] 重复升级拦截
- [ ] 降级提示（不支持）

### 测试数据
```json
{
  "test_plans": ["basic", "premium", "super"],
  "test_durations": [1, 3, 12],
  "test_payment_methods": ["wechat", "alipay"],
  "mock_payment_callback": {
    "transaction_id": "PAY-2025011700001",
    "order_id": "ORD-2025011700001",
    "status": "success",
    "paid_amount": 59.9
  }
}
```