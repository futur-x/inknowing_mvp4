# Task: System Monitoring and Statistics API

## Task Info
- **Task ID**: monitoring-001
- **Priority**: High
- **Estimated Hours**: 16
- **Module**: Monitoring
- **Dependencies**: admin-001, All other modules for metrics collection
- **Business Logic Reference**: Platform Analytics and Health Monitoring

## Description
Implement comprehensive monitoring and statistics APIs that track system health, usage patterns, cost analytics, and provide alerts for critical issues. This includes real-time metrics, historical analysis, and predictive insights.

## Technical Requirements

### API Endpoints to Implement

#### 1. GET /admin/statistics/costs
Get detailed cost statistics and projections.

**Parameters:**
- `period`: Time period (today, week, month, year)
- `group_by`: Grouping (model, feature, user_tier)

**Response:**
```json
{
  "period": "month",
  "total_cost": 12567.89,
  "breakdown": [
    {
      "category": "openai_gpt4",
      "cost": 8234.56,
      "percentage": 65.5,
      "count": 45678
    },
    {
      "category": "embeddings",
      "cost": 2345.67,
      "percentage": 18.6,
      "count": 123456
    }
  ],
  "trend": [
    {"date": "2024-01-01", "cost": 398.45},
    {"date": "2024-01-02", "cost": 412.67}
  ],
  "projection": {
    "estimated_monthly": 13500.00,
    "budget_status": "on_track",
    "days_until_budget_limit": 15
  }
}
```

#### 2. GET /admin/statistics/dialogues
Get dialogue usage statistics.

**Parameters:**
- `period`: Time period
- `group_by`: Grouping (book, user, model, type)

**Response:**
```json
{
  "period": "month",
  "total_dialogues": 45678,
  "unique_users": 3456,
  "breakdown": [
    {
      "category": "红楼梦",
      "count": 5678,
      "average_messages": 12,
      "average_duration": 890
    }
  ],
  "satisfaction": {
    "average_rating": 4.5,
    "feedback_count": 234
  }
}
```

#### 3. GET /admin/monitoring/alerts
Get system alerts and warnings.

**Parameters:**
- `severity`: Filter by severity (info, warning, error, critical)
- `status`: Filter by status (active, resolved, all)

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert-uuid",
      "severity": "warning",
      "type": "high_cost",
      "message": "Daily API cost exceeded 80% of budget",
      "details": {
        "current_cost": 456.78,
        "budget": 500.00,
        "percentage": 91.4
      },
      "status": "active",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

### Database Schema

```sql
-- metrics_aggregation table
CREATE TABLE metrics_aggregation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    time_bucket TIMESTAMP NOT NULL,
    dimensions JSONB,
    value DECIMAL(20,4),
    count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_type_key_time (metric_type, metric_key, time_bucket),
    INDEX idx_dimensions ((dimensions->>'user_tier')),
    UNIQUE KEY unique_metric (metric_type, metric_key, time_bucket, dimensions)
);

-- cost_tracking table
CREATE TABLE cost_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service VARCHAR(50) NOT NULL, -- 'openai', 'qwen', 'storage', etc
    operation VARCHAR(100) NOT NULL,
    cost DECIMAL(10,4) NOT NULL,
    tokens_input INTEGER,
    tokens_output INTEGER,
    user_id UUID REFERENCES users(id),
    user_tier VARCHAR(20),
    session_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_service (service),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id)
);

-- system_alerts table
CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    status VARCHAR(20) DEFAULT 'active',
    threshold_value DECIMAL(20,4),
    actual_value DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES admins(id),
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES admins(id),

    INDEX idx_severity_status (severity, status),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
);

-- alert_rules table
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    condition JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL,
    threshold DECIMAL(20,4),
    time_window INTEGER, -- seconds
    notification_channels JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_type (type),
    INDEX idx_is_active (is_active)
);

-- performance_metrics table
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time INTEGER, -- milliseconds
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_endpoint_method (endpoint, method),
    INDEX idx_created_at (created_at),
    INDEX idx_response_time (response_time)
);
```

### Implementation Requirements

1. **Metrics Collection Service**
   ```python
   class MetricsCollector:
       def __init__(self):
           self.buffer = []
           self.flush_interval = 10  # seconds

       async def track_cost(self, service: str, operation: str, cost: float, **kwargs):
           """Track API costs"""
           await db.execute("""
               INSERT INTO cost_tracking
               (service, operation, cost, tokens_input, tokens_output,
                user_id, user_tier, session_id, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           """, service, operation, cost, kwargs.get('tokens_input'),
               kwargs.get('tokens_output'), kwargs.get('user_id'),
               kwargs.get('user_tier'), kwargs.get('session_id'),
               json.dumps(kwargs.get('metadata')))

           # Check cost alerts
           await self.check_cost_alerts(cost)

       async def track_dialogue(self, session_id: str, book_id: str, **kwargs):
           """Track dialogue metrics"""
           metric = {
               'type': 'dialogue',
               'session_id': session_id,
               'book_id': book_id,
               'user_id': kwargs.get('user_id'),
               'message_count': kwargs.get('message_count'),
               'duration': kwargs.get('duration'),
               'timestamp': datetime.now()
           }

           self.buffer.append(metric)

           if len(self.buffer) >= 100:
               await self.flush_metrics()

       async def flush_metrics(self):
           """Batch write metrics to database"""
           if not self.buffer:
               return

           metrics = self.buffer
           self.buffer = []

           # Aggregate metrics
           aggregated = self.aggregate_metrics(metrics)

           # Batch insert
           await db.execute_many("""
               INSERT INTO metrics_aggregation
               (metric_type, metric_key, time_bucket, dimensions, value, count)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (metric_type, metric_key, time_bucket, dimensions)
               DO UPDATE SET
                   value = metrics_aggregation.value + EXCLUDED.value,
                   count = metrics_aggregation.count + EXCLUDED.count
           """, aggregated)
   ```

2. **Alert Management System**
   ```python
   class AlertManager:
       async def check_alert_rules(self):
           """Check all active alert rules"""
           rules = await get_active_alert_rules()

           for rule in rules:
               if await self.evaluate_rule(rule):
                   await self.trigger_alert(rule)

       async def evaluate_rule(self, rule: AlertRule) -> bool:
           """Evaluate if alert rule is triggered"""
           if rule.type == 'cost_threshold':
               current_cost = await self.get_current_cost(rule.time_window)
               return current_cost > rule.threshold

           elif rule.type == 'error_rate':
               error_rate = await self.get_error_rate(rule.time_window)
               return error_rate > rule.threshold

           elif rule.type == 'response_time':
               avg_response = await self.get_avg_response_time(rule.time_window)
               return avg_response > rule.threshold

           elif rule.type == 'api_failure':
               failure_count = await self.get_api_failures(rule.time_window)
               return failure_count > rule.threshold

           return False

       async def trigger_alert(self, rule: AlertRule):
           """Create alert and send notifications"""
           # Check if similar alert already exists
           existing = await get_active_alert(rule.type, rule.name)
           if existing:
               return

           # Create alert
           alert = await create_alert({
               'severity': rule.severity,
               'type': rule.type,
               'message': self.format_alert_message(rule),
               'details': rule.condition,
               'threshold_value': rule.threshold,
               'actual_value': await self.get_actual_value(rule)
           })

           # Send notifications
           await self.send_notifications(alert, rule.notification_channels)

       async def send_notifications(self, alert: Alert, channels: list):
           """Send alert notifications"""
           for channel in channels:
               if channel['type'] == 'email':
                   await send_email_alert(alert, channel['recipients'])
               elif channel['type'] == 'webhook':
                   await send_webhook_alert(alert, channel['url'])
               elif channel['type'] == 'sms':
                   await send_sms_alert(alert, channel['numbers'])
   ```

3. **Statistics Aggregation**
   ```python
   class StatisticsService:
       async def get_cost_statistics(self, period: str, group_by: str):
           """Get cost statistics with breakdown"""
           start_date, end_date = get_period_dates(period)

           # Get total cost
           total_cost = await db.fetch_one("""
               SELECT SUM(cost) as total
               FROM cost_tracking
               WHERE created_at BETWEEN $1 AND $2
           """, start_date, end_date)

           # Get breakdown by category
           if group_by == 'model':
               breakdown = await db.fetch_all("""
                   SELECT
                       service || '_' || operation as category,
                       SUM(cost) as cost,
                       COUNT(*) as count
                   FROM cost_tracking
                   WHERE created_at BETWEEN $1 AND $2
                   GROUP BY service, operation
                   ORDER BY cost DESC
               """, start_date, end_date)

           elif group_by == 'user_tier':
               breakdown = await db.fetch_all("""
                   SELECT
                       user_tier as category,
                       SUM(cost) as cost,
                       COUNT(*) as count
                   FROM cost_tracking
                   WHERE created_at BETWEEN $1 AND $2
                   GROUP BY user_tier
                   ORDER BY cost DESC
               """, start_date, end_date)

           # Calculate percentages
           for item in breakdown:
               item['percentage'] = round(item['cost'] / total_cost['total'] * 100, 1)

           # Get trend data
           trend = await self.get_cost_trend(start_date, end_date)

           # Calculate projection
           projection = await self.calculate_cost_projection(total_cost['total'], period)

           return {
               'period': period,
               'total_cost': total_cost['total'],
               'breakdown': breakdown,
               'trend': trend,
               'projection': projection
           }

       async def calculate_cost_projection(self, current_cost: float, period: str):
           """Calculate cost projection"""
           days_in_period = get_days_in_period(period)
           days_elapsed = get_days_elapsed_in_period(period)

           daily_average = current_cost / days_elapsed
           estimated_total = daily_average * days_in_period

           budget = await get_budget_for_period(period)

           if budget:
               days_until_limit = (budget - current_cost) / daily_average
               budget_status = 'under_budget' if estimated_total < budget * 0.8 else \
                              'on_track' if estimated_total < budget else 'over_budget'
           else:
               days_until_limit = None
               budget_status = 'no_budget'

           return {
               'estimated_monthly': estimated_total,
               'budget_status': budget_status,
               'days_until_budget_limit': days_until_limit
           }
   ```

4. **Performance Monitoring**
   ```python
   class PerformanceMonitor:
       async def track_request(self, request: Request, response: Response, duration: float):
           """Track API request performance"""
           await db.execute("""
               INSERT INTO performance_metrics
               (endpoint, method, status_code, response_time, user_id, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
           """, request.url.path, request.method, response.status_code,
               int(duration * 1000), request.state.user_id,
               request.client.host, request.headers.get('User-Agent'))

           # Check performance alerts
           if duration > 2.0:  # Slow request
               await create_performance_alert(request.url.path, duration)

       async def get_performance_summary(self, period: str):
           """Get performance statistics"""
           start_date, end_date = get_period_dates(period)

           return await db.fetch_one("""
               SELECT
                   COUNT(*) as total_requests,
                   AVG(response_time) as avg_response_time,
                   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time) as p50,
                   PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95,
                   PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99,
                   COUNT(*) FILTER (WHERE status_code >= 500) as errors,
                   COUNT(*) FILTER (WHERE response_time > 2000) as slow_requests
               FROM performance_metrics
               WHERE created_at BETWEEN $1 AND $2
           """, start_date, end_date)
   ```

## Acceptance Criteria

### Functional Requirements
- [ ] Cost tracking is accurate to 4 decimal places
- [ ] Statistics are aggregated correctly
- [ ] Alerts trigger based on rules
- [ ] Historical data is preserved
- [ ] Projections are calculated accurately
- [ ] Performance metrics are collected

### Performance Requirements
- [ ] Statistics API responds within 1 second
- [ ] Metrics collection doesn't impact main APIs
- [ ] Alert checks run every minute
- [ ] Aggregations use indexes efficiently

### Reliability Requirements
- [ ] Metrics buffer prevents data loss
- [ ] Alert deduplication works
- [ ] Cost calculations match provider bills
- [ ] Performance data is sampled appropriately

## Test Cases

### Unit Tests
```python
def test_cost_tracking():
    """Test cost tracking accuracy"""
    # Track a cost
    await metrics_collector.track_cost(
        service="openai",
        operation="gpt-4",
        cost=0.0456,
        tokens_input=234,
        tokens_output=567
    )

    # Verify stored correctly
    costs = await get_costs_for_period("today")
    assert costs[0]['cost'] == Decimal('0.0456')

def test_alert_rule_evaluation():
    """Test alert rule evaluation"""
    # Create rule
    rule = create_alert_rule(
        type="cost_threshold",
        threshold=100.0,
        time_window=3600  # 1 hour
    )

    # Add costs exceeding threshold
    for _ in range(10):
        await track_cost("openai", "gpt-4", 15.0)

    # Evaluate rule
    manager = AlertManager()
    triggered = await manager.evaluate_rule(rule)
    assert triggered == True

def test_statistics_aggregation():
    """Test statistics aggregation"""
    # Add sample data
    for i in range(100):
        await track_dialogue(
            session_id=f"session-{i}",
            book_id="book-1",
            message_count=random.randint(5, 20)
        )

    # Get statistics
    stats = await get_dialogue_statistics("today", "book")
    assert stats['total_dialogues'] == 100
    assert len(stats['breakdown']) > 0
```

### Integration Tests
```python
def test_end_to_end_monitoring():
    """Test complete monitoring flow"""
    # 1. Generate activity
    user = create_test_user(membership="premium")
    session = start_dialogue(user.id, "book-1")

    for _ in range(10):
        send_message(session.id, "Test message")

    # 2. Check metrics collected
    await metrics_collector.flush_metrics()

    metrics = await get_metrics("dialogue", "today")
    assert metrics['count'] > 0

    # 3. Check costs tracked
    costs = await get_cost_statistics("today", "model")
    assert costs['total_cost'] > 0

    # 4. Check alerts
    alerts = await get_active_alerts()
    # Should have cost alert if threshold exceeded

def test_performance_monitoring():
    """Test API performance monitoring"""
    # Make slow request
    with mock_slow_response(3.0):
        response = client.get("/books")

    # Check performance metric recorded
    metrics = await get_performance_metrics("today")
    assert metrics['slow_requests'] > 0
    assert metrics['p99'] > 3000  # milliseconds

    # Check alert created
    alerts = await get_alerts(type="performance")
    assert len(alerts) > 0
```

### Performance Tests
```python
def test_metrics_collection_overhead():
    """Test metrics collection doesn't slow down APIs"""
    # Baseline without metrics
    start = time.time()
    for _ in range(100):
        client.get("/books")
    baseline = time.time() - start

    # With metrics enabled
    enable_metrics_collection()
    start = time.time()
    for _ in range(100):
        client.get("/books")
    with_metrics = time.time() - start

    # Overhead should be minimal
    overhead = (with_metrics - baseline) / baseline
    assert overhead < 0.05  # Less than 5% overhead

def test_statistics_query_performance():
    """Test statistics queries are optimized"""
    # Add large amount of data
    for _ in range(10000):
        await track_cost("openai", "gpt-4", random.random())

    # Query should still be fast
    start = time.time()
    stats = await get_cost_statistics("month", "model")
    duration = time.time() - start

    assert duration < 1.0  # Should complete within 1 second
```

## Implementation Notes

### Alert Rule Examples
```python
DEFAULT_ALERT_RULES = [
    {
        'name': 'high_daily_cost',
        'type': 'cost_threshold',
        'condition': {'period': 'day', 'service': 'all'},
        'threshold': 500.0,
        'severity': 'warning'
    },
    {
        'name': 'api_error_rate',
        'type': 'error_rate',
        'condition': {'status_codes': [500, 502, 503]},
        'threshold': 0.05,  # 5% error rate
        'time_window': 300,  # 5 minutes
        'severity': 'critical'
    },
    {
        'name': 'slow_response',
        'type': 'response_time',
        'condition': {'percentile': 'p95'},
        'threshold': 2000,  # 2 seconds
        'time_window': 600,  # 10 minutes
        'severity': 'warning'
    }
]
```

### Metrics Aggregation Strategy
```python
# Time-series aggregation buckets
AGGREGATION_BUCKETS = {
    'minute': 60,
    'hour': 3600,
    'day': 86400,
    'week': 604800,
    'month': 2592000
}

def get_time_bucket(timestamp: datetime, bucket_size: str) -> datetime:
    """Round timestamp to bucket"""
    seconds = AGGREGATION_BUCKETS[bucket_size]
    epoch = timestamp.timestamp()
    bucket = (epoch // seconds) * seconds
    return datetime.fromtimestamp(bucket)
```

## Dependencies
- TimescaleDB for time-series data
- Redis for metrics buffering
- APScheduler for periodic checks
- Grafana for visualization (optional)
- SMTP/SMS services for alerts

## Related Tasks
- admin-001: Dashboard integration
- ai-model-001: Cost tracking from AI usage
- payment-001: Revenue tracking