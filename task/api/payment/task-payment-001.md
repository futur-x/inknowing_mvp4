# Task: Payment Integration and Membership Upgrade API

## Task Info
- **Task ID**: payment-001
- **Priority**: Critical
- **Estimated Hours**: 24
- **Module**: Payment
- **Dependencies**: user-001, Authentication
- **Business Logic Reference**: Free User → Paid Member State Transition

## Description
Implement complete payment integration with WeChat Pay and Alipay for membership upgrades. Handle payment callbacks, order management, and membership activation upon successful payment.

## Technical Requirements

### API Endpoints to Implement

#### 1. POST /users/membership/upgrade (Enhanced)
Initiate membership upgrade with payment.

**Request Body:**
```json
{
  "plan": "premium",
  "duration": 3,
  "payment_method": "wechat"
}
```

**Response:**
```json
{
  "order_id": "ORD-20240120-123456",
  "amount": 299.00,
  "currency": "CNY",
  "payment_url": "weixin://wxpay/...",
  "qr_code": "data:image/png;base64,...",
  "expires_at": "2024-01-20T10:30:00Z"
}
```

#### 2. POST /payment/callback/wechat
WeChat payment webhook endpoint.

**Request (XML):**
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <appid><![CDATA[wx2421b1c4370ec43b]]></appid>
  <mch_id><![CDATA[10000100]]></mch_id>
  <nonce_str><![CDATA[5d2b6c2a8db53831f7eda20af46e531c]]></nonce_str>
  <sign><![CDATA[B552ED6B279343CB493C5DD0D78AB241]]></sign>
  <result_code><![CDATA[SUCCESS]]></result_code>
  <openid><![CDATA[oUpF8uMEb4qRXf22hE3X68TekukE]]></openid>
  <transaction_id><![CDATA[1004400740201409030005092168]]></transaction_id>
  <out_trade_no><![CDATA[ORD-20240120-123456]]></out_trade_no>
  <total_fee>29900</total_fee>
</xml>
```

#### 3. POST /payment/callback/alipay
Alipay payment webhook endpoint.

**Request (form-urlencoded):**
```
trade_no=2024012022001419121000123456&
out_trade_no=ORD-20240120-123456&
trade_status=TRADE_SUCCESS&
total_amount=299.00&
sign=...
```

#### 4. GET /payment/orders/{orderId}
Get payment order status.

**Response:**
```json
{
  "order_id": "ORD-20240120-123456",
  "user_id": "user-uuid",
  "type": "membership",
  "plan": "premium",
  "duration": 3,
  "amount": 299.00,
  "status": "completed",
  "payment_method": "wechat",
  "transaction_id": "wx_transaction_123",
  "created_at": "2024-01-20T10:00:00Z",
  "completed_at": "2024-01-20T10:05:00Z"
}
```

### Database Schema

```sql
-- payment_orders table
CREATE TABLE payment_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) NOT NULL, -- 'membership', 'points'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    payment_url TEXT,
    qr_code TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Membership specific
    membership_plan VARCHAR(20),
    membership_duration INTEGER,

    -- Payment provider data
    provider_order_id VARCHAR(100),
    provider_transaction_id VARCHAR(100),
    provider_response JSONB,

    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
);

-- payment_transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) REFERENCES payment_orders(order_id),
    type VARCHAR(20) NOT NULL, -- 'payment', 'refund'
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_transaction_id VARCHAR(100),
    provider_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_order_id (order_id),
    INDEX idx_provider_transaction_id (provider_transaction_id)
);

-- membership_history table
CREATE TABLE membership_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    old_type VARCHAR(20),
    new_type VARCHAR(20),
    order_id VARCHAR(50) REFERENCES payment_orders(order_id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_dates (start_date, end_date)
);

-- payment_configs table
CREATE TABLE payment_configs (
    provider VARCHAR(20) PRIMARY KEY,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Implementation Requirements

1. **Payment Service Integration**
   ```python
   class PaymentService:
       def __init__(self):
           self.wechat = WeChatPayClient(
               app_id=config.WECHAT_APP_ID,
               mch_id=config.WECHAT_MCH_ID,
               api_key=config.WECHAT_API_KEY
           )
           self.alipay = AlipayClient(
               app_id=config.ALIPAY_APP_ID,
               private_key=config.ALIPAY_PRIVATE_KEY,
               alipay_public_key=config.ALIPAY_PUBLIC_KEY
           )

       async def create_payment_order(self, user_id: str, plan: str, duration: int, method: str):
           # Calculate amount
           amount = self.calculate_amount(plan, duration)

           # Create order
           order_id = self.generate_order_id()
           order = await create_order({
               'order_id': order_id,
               'user_id': user_id,
               'type': 'membership',
               'amount': amount,
               'membership_plan': plan,
               'membership_duration': duration,
               'payment_method': method,
               'expires_at': datetime.now() + timedelta(minutes=30)
           })

           # Create payment with provider
           if method == 'wechat':
               payment_data = await self.create_wechat_payment(order)
           elif method == 'alipay':
               payment_data = await self.create_alipay_payment(order)

           # Update order with payment data
           await update_order(order_id, payment_data)

           return order

       async def create_wechat_payment(self, order):
           """Create WeChat payment"""
           result = await self.wechat.unified_order({
               'body': f'InKnowing {order.membership_plan} Membership',
               'out_trade_no': order.order_id,
               'total_fee': int(order.amount * 100),  # Convert to cents
               'spbill_create_ip': get_client_ip(),
               'notify_url': f'{config.API_BASE_URL}/payment/callback/wechat',
               'trade_type': 'NATIVE',  # QR code payment
               'product_id': order.membership_plan
           })

           return {
               'payment_url': result['code_url'],
               'qr_code': generate_qr_code(result['code_url']),
               'provider_order_id': result['prepay_id']
           }
   ```

2. **Payment Callback Processing**
   ```python
   class PaymentCallbackService:
       async def process_wechat_callback(self, xml_data: str):
           """Process WeChat payment callback"""
           # Parse and verify signature
           data = parse_wechat_xml(xml_data)
           if not verify_wechat_signature(data):
               return {'return_code': 'FAIL', 'return_msg': 'Invalid signature'}

           # Process payment
           if data['result_code'] == 'SUCCESS':
               await self.complete_payment(
                   order_id=data['out_trade_no'],
                   transaction_id=data['transaction_id'],
                   amount=int(data['total_fee']) / 100,
                   provider='wechat'
               )

           return {'return_code': 'SUCCESS'}

       async def process_alipay_callback(self, form_data: dict):
           """Process Alipay payment callback"""
           # Verify signature
           if not verify_alipay_signature(form_data):
               return 'fail'

           # Process payment
           if form_data['trade_status'] in ['TRADE_SUCCESS', 'TRADE_FINISHED']:
               await self.complete_payment(
                   order_id=form_data['out_trade_no'],
                   transaction_id=form_data['trade_no'],
                   amount=float(form_data['total_amount']),
                   provider='alipay'
               )

           return 'success'

       async def complete_payment(self, order_id: str, transaction_id: str, amount: float, provider: str):
           """Complete payment and activate membership"""
           async with db.transaction():
               # Update order status
               order = await get_order(order_id)
               if order.status != 'pending':
                   return  # Already processed

               await update_order_status(order_id, 'completed', transaction_id)

               # Record transaction
               await create_transaction({
                   'order_id': order_id,
                   'type': 'payment',
                   'amount': amount,
                   'status': 'success',
                   'provider': provider,
                   'provider_transaction_id': transaction_id
               })

               # Activate membership
               await activate_membership(
                   user_id=order.user_id,
                   plan=order.membership_plan,
                   duration=order.membership_duration
               )

               # Send notification
               await notify_payment_success(order.user_id, order)
   ```

3. **Membership Activation**
   ```python
   async def activate_membership(user_id: str, plan: str, duration: int):
       """Activate user membership after payment"""
       user = await get_user(user_id)

       # Calculate dates
       start_date = date.today()
       if user.membership_expires_at and user.membership_expires_at > start_date:
           # Extend existing membership
           start_date = user.membership_expires_at

       end_date = start_date + timedelta(days=duration * 30)

       # Update user membership
       await update_user(user_id, {
           'membership': plan,
           'membership_expires_at': end_date
       })

       # Record history
       await create_membership_history({
           'user_id': user_id,
           'old_type': user.membership,
           'new_type': plan,
           'start_date': start_date,
           'end_date': end_date
       })

       # Update quotas
       await reset_user_quotas(user_id, plan)
   ```

4. **Security and Validation**
   ```python
   def verify_wechat_signature(data: dict) -> bool:
       """Verify WeChat payment signature"""
       sign = data.pop('sign')
       string_to_sign = '&'.join([
           f'{k}={v}' for k, v in sorted(data.items())
           if v and k != 'sign'
       ])
       string_to_sign += f'&key={config.WECHAT_API_KEY}'
       calculated_sign = hashlib.md5(string_to_sign.encode()).hexdigest().upper()
       return calculated_sign == sign

   def verify_alipay_signature(data: dict) -> bool:
       """Verify Alipay payment signature"""
       from Crypto.PublicKey import RSA
       from Crypto.Signature import PKCS1_v1_5
       from Crypto.Hash import SHA256

       sign = data.pop('sign')
       sign_type = data.pop('sign_type')

       # Create sign string
       string_to_sign = '&'.join([
           f'{k}={v}' for k, v in sorted(data.items())
       ])

       # Verify with public key
       key = RSA.import_key(config.ALIPAY_PUBLIC_KEY)
       verifier = PKCS1_v1_5.new(key)
       hash_obj = SHA256.new(string_to_sign.encode())

       return verifier.verify(hash_obj, base64.b64decode(sign))
   ```

## Acceptance Criteria

### Functional Requirements
- [ ] Payment orders are created successfully
- [ ] WeChat payment integration works
- [ ] Alipay payment integration works
- [ ] Payment callbacks are processed correctly
- [ ] Membership is activated after payment
- [ ] Order status tracking works
- [ ] Expired orders are handled

### Security Requirements
- [ ] Payment signatures are verified
- [ ] Callbacks are idempotent
- [ ] Sensitive data is encrypted
- [ ] Rate limiting on callbacks
- [ ] Transaction logging complete
- [ ] Refund process secure

### Reliability Requirements
- [ ] Payment retries on failure
- [ ] Transaction atomicity ensured
- [ ] Duplicate payments prevented
- [ ] Callback replay protection
- [ ] Order expiry cleanup

## Test Cases

### Unit Tests
```python
def test_create_payment_order():
    """Test payment order creation"""
    user_id = create_test_user()

    response = client.post("/users/membership/upgrade",
        headers=get_auth_header(user_id),
        json={
            "plan": "premium",
            "duration": 3,
            "payment_method": "wechat"
        })

    assert response.status_code == 200
    data = response.json()
    assert "order_id" in data
    assert data["amount"] == 299.00
    assert "qr_code" in data

def test_wechat_callback_success():
    """Test WeChat payment callback"""
    order = create_test_order(status="pending")

    xml_data = f"""
    <xml>
        <return_code><![CDATA[SUCCESS]]></return_code>
        <result_code><![CDATA[SUCCESS]]></result_code>
        <out_trade_no><![CDATA[{order.order_id}]]></out_trade_no>
        <transaction_id><![CDATA[wx123456]]></transaction_id>
        <total_fee>29900</total_fee>
        <sign><![CDATA[{calculate_sign()}]]></sign>
    </xml>
    """

    response = client.post("/payment/callback/wechat",
        content=xml_data,
        headers={"Content-Type": "text/xml"})

    assert response.status_code == 200

    # Check order completed
    order = get_order(order.order_id)
    assert order.status == "completed"

def test_membership_activation():
    """Test membership activation after payment"""
    user = create_test_user(membership="free")
    order = create_payment_order(user.id, "premium", 3)

    # Simulate successful payment
    complete_payment(order.order_id)

    # Check membership activated
    user = get_user(user.id)
    assert user.membership == "premium"
    assert user.membership_expires_at > date.today()
```

### Integration Tests
```python
def test_complete_payment_flow():
    """Test complete payment flow"""
    # 1. User initiates upgrade
    user = create_test_user(membership="free")
    upgrade_response = client.post("/users/membership/upgrade",
        headers=get_auth_header(user.id),
        json={
            "plan": "super",
            "duration": 6,
            "payment_method": "alipay"
        })

    order_id = upgrade_response.json()["order_id"]

    # 2. Simulate payment completion
    callback_response = client.post("/payment/callback/alipay",
        data={
            "out_trade_no": order_id,
            "trade_no": "alipay_123456",
            "trade_status": "TRADE_SUCCESS",
            "total_amount": "599.00",
            "sign": calculate_alipay_sign()
        })

    assert callback_response.text == "success"

    # 3. Check membership updated
    membership = client.get("/users/membership",
        headers=get_auth_header(user.id))

    assert membership.json()["type"] == "super"
    assert membership.json()["quota_total"] == 1000

def test_duplicate_callback_handling():
    """Test duplicate callback is handled correctly"""
    order = create_test_order()

    # First callback
    process_callback(order.order_id)

    # Duplicate callback
    process_callback(order.order_id)

    # Should only have one transaction
    transactions = get_transactions(order.order_id)
    assert len(transactions) == 1
```

### Security Tests
```python
def test_invalid_signature_rejected():
    """Test callbacks with invalid signatures are rejected"""
    response = client.post("/payment/callback/wechat",
        content="<xml><sign>invalid</sign></xml>",
        headers={"Content-Type": "text/xml"})

    assert response.status_code == 200
    assert "FAIL" in response.text

def test_expired_order_cleanup():
    """Test expired orders are cleaned up"""
    # Create expired order
    order = create_test_order(
        expires_at=datetime.now() - timedelta(hours=1)
    )

    # Run cleanup job
    cleanup_expired_orders()

    # Check order status
    order = get_order(order.order_id)
    assert order.status == "expired"
```

## Implementation Notes

### Pricing Configuration
```python
MEMBERSHIP_PRICING = {
    'basic': {
        1: 99,    # 1 month
        3: 269,   # 3 months
        6: 499,   # 6 months
        12: 899   # 12 months
    },
    'premium': {
        1: 149,
        3: 399,
        6: 699,
        12: 1299
    },
    'super': {
        1: 299,
        3: 799,
        6: 1499,
        12: 2699
    }
}
```

### Order ID Generation
```python
def generate_order_id() -> str:
    """Generate unique order ID"""
    date_str = datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=6))
    return f"ORD-{date_str}-{random_str}"
```

### QR Code Generation
```python
import qrcode
import base64
from io import BytesIO

def generate_qr_code(url: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')

    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
```

## Dependencies
- WeChat Pay SDK
- Alipay SDK
- QR code generator (qrcode)
- Cryptography library for signature verification
- Redis for order caching
- Celery for async processing

## Related Tasks
- user-002: Membership management
- monitoring-002: Payment monitoring
- admin-003: Payment statistics dashboard