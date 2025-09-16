# Task: AI Model Configuration and Management API

## Task Info
- **Task ID**: ai-model-001
- **Priority**: Critical
- **Estimated Hours**: 20
- **Module**: AI Model
- **Dependencies**: Admin authentication, Dialogue system
- **Business Logic Reference**: Multi-model Support, AI-driven Dialogues

## Description
Implement AI model configuration and management APIs that support multiple AI providers (OpenAI, Anthropic, Qwen, Baidu, Zhipu), model routing based on scenarios and user tiers, and health monitoring.

## Technical Requirements

### API Endpoints to Implement

#### 1. GET /admin/models
Get current AI model configuration.

**Response:**
```json
{
  "primary_model": {
    "id": "model-1",
    "provider": "openai",
    "model": "gpt-4",
    "api_endpoint": "https://api.openai.com/v1",
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 2000,
      "top_p": 0.9
    },
    "status": "active",
    "average_latency": 850
  },
  "backup_models": [...],
  "routing_rules": {
    "scenario_routing": {
      "normal_dialogue": "model-1",
      "character_roleplay": "model-2"
    },
    "user_tier_routing": {
      "free": "model-3",
      "paid": "model-1"
    }
  },
  "embedding_model": {
    "provider": "openai",
    "model": "text-embedding-ada-002",
    "dimension": 1536
  }
}
```

#### 2. PUT /admin/models
Update AI model configuration.

#### 3. POST /admin/models/test
Test AI model connection and performance.

**Request:**
```json
{
  "provider": "qwen",
  "model": "qwen-max",
  "api_endpoint": "https://dashscope.aliyuncs.com/api/v1",
  "api_key": "sk-...",
  "test_prompt": "你好，请介绍一下自己"
}
```

**Response:**
```json
{
  "success": true,
  "latency": 650,
  "response": "你好！我是通义千问...",
  "estimated_cost": 0.02
}
```

#### 4. POST /admin/books/ai-check
Check if AI knows a specific book.

**Request:**
```json
{
  "title": "百年孤独",
  "author": "加西亚·马尔克斯"
}
```

**Response:**
```json
{
  "ai_knows_book": true,
  "confidence": 95.5,
  "detected_content": {
    "chapters": ["第一章", "第二章", ...],
    "main_themes": ["孤独", "循环", "命运"],
    "characters": ["奥雷里亚诺", "乌尔苏拉", ...]
  },
  "recommendation": "use_ai_directly"
}
```

### Database Schema

```sql
-- ai_models table
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    parameters JSONB,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    monthly_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_provider (provider),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_primary (is_primary) WHERE is_primary = true
);

-- ai_model_routing table
CREATE TABLE ai_model_routing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routing_type VARCHAR(50) NOT NULL, -- 'scenario', 'user_tier', 'fallback'
    routing_key VARCHAR(100) NOT NULL,
    model_id UUID REFERENCES ai_models(id),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_routing_type_key (routing_type, routing_key),
    UNIQUE KEY unique_routing (routing_type, routing_key, priority)
);

-- ai_model_metrics table
CREATE TABLE ai_model_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES ai_models(id),
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens_input INTEGER DEFAULT 0,
    total_tokens_output INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    average_latency INTEGER, -- milliseconds
    p95_latency INTEGER,
    p99_latency INTEGER,

    PRIMARY KEY (model_id, date),
    INDEX idx_date (date)
);

-- ai_model_health table
CREATE TABLE ai_model_health (
    model_id UUID PRIMARY KEY REFERENCES ai_models(id),
    status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
    last_check TIMESTAMP NOT NULL,
    consecutive_failures INTEGER DEFAULT 0,
    error_message TEXT,
    average_latency INTEGER,
    success_rate DECIMAL(5,2),

    INDEX idx_status (status),
    INDEX idx_last_check (last_check)
);

-- ai_book_knowledge table
CREATE TABLE ai_book_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    model_id UUID REFERENCES ai_models(id),
    knows_book BOOLEAN NOT NULL,
    confidence DECIMAL(5,2),
    detected_content JSONB,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_title_author (title, author),
    INDEX idx_model_id (model_id),
    INDEX idx_test_date (test_date)
);
```

### Implementation Requirements

1. **Multi-Provider AI Client**
   ```python
   class AIModelManager:
       def __init__(self):
           self.providers = {
               'openai': OpenAIProvider(),
               'anthropic': AnthropicProvider(),
               'qwen': QwenProvider(),
               'baidu': BaiduProvider(),
               'zhipu': ZhipuProvider()
           }
           self.routing_cache = {}

       async def get_model_for_scenario(self, scenario: str, user_tier: str) -> AIModel:
           """Get appropriate model based on scenario and user tier"""
           # Check scenario routing first
           model_id = await self.get_routing('scenario', scenario)

           # Check user tier routing if no scenario match
           if not model_id:
               model_id = await self.get_routing('user_tier', user_tier)

           # Fall back to primary model
           if not model_id:
               model = await get_primary_model()
           else:
               model = await get_model(model_id)

           # Check health and fall back if needed
           if not await self.is_healthy(model):
               model = await self.get_backup_model()

           return model

       async def complete(self, prompt: str, model: AIModel, **kwargs):
           """Complete a prompt using specified model"""
           provider = self.providers[model.provider]

           try:
               # Track request
               request_id = generate_request_id()
               await track_request_start(model.id, request_id)

               # Make API call
               start_time = time.time()
               response = await provider.complete(
                   prompt=prompt,
                   model=model.model,
                   api_key=decrypt(model.api_key_encrypted),
                   parameters={**model.parameters, **kwargs}
               )
               latency = int((time.time() - start_time) * 1000)

               # Track metrics
               await track_request_success(
                   model.id,
                   request_id,
                   latency,
                   response.input_tokens,
                   response.output_tokens,
                   response.cost
               )

               return response

           except Exception as e:
               await track_request_failure(model.id, request_id, str(e))
               raise
   ```

2. **Provider Implementations**
   ```python
   class OpenAIProvider:
       async def complete(self, prompt: str, model: str, api_key: str, parameters: dict):
           client = AsyncOpenAI(api_key=api_key)

           response = await client.chat.completions.create(
               model=model,
               messages=[{"role": "user", "content": prompt}],
               **parameters
           )

           return AIResponse(
               content=response.choices[0].message.content,
               input_tokens=response.usage.prompt_tokens,
               output_tokens=response.usage.completion_tokens,
               cost=calculate_openai_cost(model, response.usage)
           )

   class QwenProvider:
       async def complete(self, prompt: str, model: str, api_key: str, parameters: dict):
           headers = {
               'Authorization': f'Bearer {api_key}',
               'Content-Type': 'application/json'
           }

           data = {
               'model': model,
               'input': {'messages': [{'role': 'user', 'content': prompt}]},
               'parameters': parameters
           }

           async with aiohttp.ClientSession() as session:
               async with session.post(
                   'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                   headers=headers,
                   json=data
               ) as response:
                   result = await response.json()

           return AIResponse(
               content=result['output']['text'],
               input_tokens=result['usage']['input_tokens'],
               output_tokens=result['usage']['output_tokens'],
               cost=calculate_qwen_cost(model, result['usage'])
           )
   ```

3. **Model Health Monitoring**
   ```python
   class ModelHealthMonitor:
       async def check_model_health(self, model_id: str):
           """Perform health check on AI model"""
           model = await get_model(model_id)

           try:
               # Simple test prompt
               test_prompt = "Hello, please respond with OK"
               start_time = time.time()

               response = await ai_manager.complete(
                   prompt=test_prompt,
                   model=model,
                   max_tokens=10
               )

               latency = int((time.time() - start_time) * 1000)

               # Update health status
               await update_model_health({
                   'model_id': model_id,
                   'status': 'healthy',
                   'last_check': datetime.now(),
                   'average_latency': latency,
                   'consecutive_failures': 0
               })

               return True

           except Exception as e:
               # Increment failure count
               health = await get_model_health(model_id)
               failures = (health.consecutive_failures or 0) + 1

               status = 'degraded' if failures < 3 else 'down'

               await update_model_health({
                   'model_id': model_id,
                   'status': status,
                   'last_check': datetime.now(),
                   'consecutive_failures': failures,
                   'error_message': str(e)
               })

               return False

       async def monitor_all_models(self):
           """Monitor all active models"""
           models = await get_active_models()

           for model in models:
               await self.check_model_health(model.id)
   ```

4. **Book Knowledge Detection**
   ```python
   async def check_ai_book_knowledge(title: str, author: str, model_id: str = None):
       """Check if AI knows a specific book"""
       if not model_id:
           model = await get_primary_model()
       else:
           model = await get_model(model_id)

       prompt = f"""
       请判断你是否熟悉这本书：《{title}》，作者：{author}

       如果熟悉，请提供：
       1. 主要章节列表（至少5个）
       2. 核心主题（3-5个）
       3. 主要人物（如适用）
       4. 你对这本书的熟悉程度（1-100分）

       如果不熟悉，请直接说"不熟悉"。
       """

       response = await ai_manager.complete(prompt, model)

       # Parse response
       if "不熟悉" in response.content:
           return {
               'ai_knows_book': False,
               'confidence': 0,
               'recommendation': 'needs_vectorization'
           }

       # Extract information
       parsed = parse_book_knowledge(response.content)

       # Calculate confidence
       confidence = calculate_confidence(parsed)

       # Store result
       await store_book_knowledge({
           'title': title,
           'author': author,
           'model_id': model.id,
           'knows_book': confidence > 70,
           'confidence': confidence,
           'detected_content': parsed
       })

       return {
           'ai_knows_book': confidence > 70,
           'confidence': confidence,
           'detected_content': parsed,
           'recommendation': 'use_ai_directly' if confidence > 70 else 'needs_vectorization'
       }
   ```

## Acceptance Criteria

### Functional Requirements
- [ ] Multiple AI providers are supported
- [ ] Model routing works by scenario and user tier
- [ ] Fallback to backup models on failure
- [ ] AI book knowledge detection works
- [ ] Model testing endpoint functions correctly
- [ ] Configuration updates apply immediately

### Performance Requirements
- [ ] Model selection completes within 50ms
- [ ] Health checks run every minute
- [ ] Fallback triggers within 2 seconds
- [ ] Routing rules are cached effectively

### Reliability Requirements
- [ ] API keys are encrypted at rest
- [ ] Failed models auto-recover when healthy
- [ ] Metrics are accurately tracked
- [ ] Cost calculations are precise

## Test Cases

### Unit Tests
```python
def test_model_configuration():
    """Test AI model configuration"""
    token = get_admin_token()

    response = client.get("/admin/models",
        headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    config = response.json()
    assert "primary_model" in config
    assert "routing_rules" in config

def test_model_routing():
    """Test model routing logic"""
    # Set up routing rules
    set_routing_rule("scenario", "character_roleplay", "model-2")
    set_routing_rule("user_tier", "free", "model-3")

    # Test scenario routing
    model = get_model_for_scenario("character_roleplay", "paid")
    assert model.id == "model-2"

    # Test user tier routing
    model = get_model_for_scenario("normal", "free")
    assert model.id == "model-3"

def test_ai_book_knowledge():
    """Test AI book knowledge detection"""
    token = get_admin_token()

    response = client.post("/admin/books/ai-check",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "1984",
            "author": "George Orwell"
        })

    assert response.status_code == 200
    result = response.json()
    assert result["ai_knows_book"] == True
    assert result["confidence"] > 90
    assert "Winston Smith" in str(result["detected_content"]["characters"])
```

### Integration Tests
```python
async def test_multi_provider_support():
    """Test multiple AI providers work correctly"""
    providers = ["openai", "qwen", "anthropic"]

    for provider in providers:
        model = create_test_model(provider=provider)

        response = await ai_manager.complete(
            prompt="Hello",
            model=model
        )

        assert response.content is not None
        assert response.input_tokens > 0

async def test_model_fallback():
    """Test fallback to backup model on failure"""
    # Create primary model that will fail
    primary = create_test_model(is_primary=True)
    mock_model_failure(primary.id)

    # Create backup model
    backup = create_test_model(is_primary=False)

    # Attempt to use primary
    model = await ai_manager.get_model_for_scenario("normal", "paid")

    # Should fallback to backup
    assert model.id == backup.id

async def test_health_monitoring():
    """Test model health monitoring"""
    model = create_test_model()

    # Run health check
    monitor = ModelHealthMonitor()
    result = await monitor.check_model_health(model.id)

    assert result == True

    # Check health status updated
    health = await get_model_health(model.id)
    assert health.status == "healthy"
    assert health.average_latency > 0
```

### Performance Tests
```python
def test_concurrent_model_requests():
    """Test handling concurrent requests to different models"""
    models = [create_test_model() for _ in range(3)]

    async def make_request(model):
        return await ai_manager.complete("Test", model)

    tasks = [make_request(m) for m in models for _ in range(10)]
    results = await asyncio.gather(*tasks)

    assert all(r.content for r in results)

def test_routing_cache_performance():
    """Test routing cache improves performance"""
    # First call - no cache
    start = time.time()
    model1 = get_model_for_scenario("normal", "paid")
    first_duration = time.time() - start

    # Second call - should use cache
    start = time.time()
    model2 = get_model_for_scenario("normal", "paid")
    cached_duration = time.time() - start

    assert model1.id == model2.id
    assert cached_duration < first_duration / 2
```

## Implementation Notes

### Cost Calculation
```python
# Cost per 1K tokens (in USD)
COST_MATRIX = {
    'openai': {
        'gpt-4': {'input': 0.03, 'output': 0.06},
        'gpt-3.5-turbo': {'input': 0.001, 'output': 0.002}
    },
    'anthropic': {
        'claude-3-opus': {'input': 0.015, 'output': 0.075},
        'claude-3-sonnet': {'input': 0.003, 'output': 0.015}
    },
    'qwen': {
        'qwen-max': {'input': 0.02, 'output': 0.06},
        'qwen-plus': {'input': 0.004, 'output': 0.012}
    }
}

def calculate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    rates = COST_MATRIX[provider][model]
    input_cost = (input_tokens / 1000) * rates['input']
    output_cost = (output_tokens / 1000) * rates['output']
    return round(input_cost + output_cost, 4)
```

### Encryption
```python
from cryptography.fernet import Fernet

def encrypt_api_key(api_key: str) -> str:
    """Encrypt API key for storage"""
    cipher = Fernet(config.ENCRYPTION_KEY)
    return cipher.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt API key for use"""
    cipher = Fernet(config.ENCRYPTION_KEY)
    return cipher.decrypt(encrypted_key.encode()).decode()
```

## Dependencies
- Multiple AI provider SDKs
- Cryptography for key encryption
- Redis for routing cache
- APScheduler for health monitoring
- aiohttp for async HTTP calls

## Related Tasks
- dialogue-001: Integration with dialogue system
- admin-001: Admin authentication for configuration
- monitoring-001: Cost and performance monitoring