# InKnowing Database Schema Documentation

## Overview

The InKnowing database is designed to support an AI-powered book dialogue platform, enabling users to have conversations with books and book characters. The database architecture follows a modular schema design with clear separation of concerns.

## Database Architecture

### Technology Stack
- **Primary Database**: PostgreSQL 13+
- **Cache Layer**: Redis
- **Vector Database**: ChromaDB
- **Connection Pooling**: PgBouncer

### Schema Organization

The database is organized into 7 logical schemas:

1. **auth** - Authentication and user management
2. **content** - Books, characters, and related content
3. **dialogue** - Chat sessions and messages
4. **upload** - User upload processing pipeline
5. **payment** - Billing and subscriptions
6. **admin** - Administrative functions
7. **audit** - Audit logs and compliance

## Core Business Logic

### User Journey Flow
```
Anonymous → Registration → Free User → Dialogue Interaction → Quota Limit → Upgrade → Paid Member
```

### Membership Tiers
- **Free**: 20 requests/day
- **Basic**: 200 requests/month ($19/month)
- **Premium**: 500 requests/month ($39/month)
- **Super**: 1000 requests/month ($99/month)

### Book Types
- **AI-Known**: Books that AI models can directly discuss
- **Vectorized**: User-uploaded books processed into embeddings

## Schema Details

### Auth Schema

#### users
Primary user authentication table supporting phone and WeChat login.

Key fields:
- `id` (UUID): Primary key
- `phone`: Chinese phone number (unique)
- `wechat_openid`: WeChat OpenID (unique)
- `membership`: Current membership tier
- `status`: Account status (active/suspended/deleted)

#### user_quotas
Tracks dialogue quotas based on membership.

Key fields:
- `quota_total`: Total quota for period
- `quota_used`: Used quota in current period
- `quota_reset_at`: When quota resets (daily for free, monthly for paid)

#### tokens
JWT refresh tokens and session management.

#### login_history
Partitioned table tracking login attempts (monthly partitions).

### Content Schema

#### books
Main books table for both AI-known and vectorized books.

Key fields:
- `type`: 'ai_known' or 'vectorized'
- `status`: draft → processing → published → offline
- `ai_known`: Boolean flag for AI detection
- `vector_count`: Number of vector chunks
- `dialogue_count`: Total dialogues with this book

#### characters
Book characters available for dialogue.

Key fields:
- `personality_prompt`: System prompt for character AI
- `dialogue_style`: JSON configuration for response style
- `key_memories`: Important character context

#### book_tags
Categorization and search optimization.

### Dialogue Schema

#### dialogue_sessions
Main dialogue sessions with books/characters.

Key fields:
- `type`: 'book' or 'character'
- `context_window`: Token limit for context
- `total_tokens_used`: Cumulative token usage
- `ws_connection_id`: WebSocket support

#### dialogue_messages
Partitioned table for messages (monthly partitions).

Key fields:
- `role`: user/assistant/system
- `reference_type`: Links to book content
- `tokens_used`: Per-message token count

#### dialogue_contexts
Stores conversation context for resuming sessions.

### Upload Schema

#### upload_jobs
Tracks user book upload processing.

Processing pipeline:
1. Text extraction
2. AI detection
3. Vectorization
4. Indexing

#### processing_steps
Individual processing step tracking.

#### vector_chunks
Document chunks for ChromaDB storage.

### Payment Schema

#### membership_plans
Available subscription tiers.

#### user_subscriptions
Active user subscriptions.

#### transactions
All payment records with audit trail.

### Admin Schema

#### backup_history
Database backup tracking.

### Audit Schema

#### audit_logs
Partitioned table for compliance and auditing (monthly partitions).

## Indexing Strategy

### Primary Indexes
- All UUID primary keys (B-tree)
- Foreign key relationships

### Performance Indexes
- Full-text search (GIN) on book titles/authors
- Composite indexes for common queries
- Partial indexes for filtered queries

### Materialized Views
- `mv_popular_books`: Pre-calculated popular books
- `mv_user_statistics`: Aggregated user metrics

## Data Partitioning

### Partitioned Tables
1. **dialogue_messages**: Monthly range partitioning
2. **login_history**: Monthly range partitioning
3. **audit_logs**: Monthly range partitioning

Benefits:
- Improved query performance
- Easier data archival
- Reduced vacuum overhead

## Performance Optimizations

### Query Optimization
- Strategic indexes on high-frequency queries
- Materialized views for complex aggregations
- Partitioning for large tables

### Connection Pooling
- PgBouncer in transaction mode
- 100 max connections
- 25 default pool size

### Caching Strategy
- Session data: 30-minute TTL
- User data: 5-minute TTL
- Book data: 1-hour TTL
- Dialogue context: 2-hour TTL

## Security Measures

### Data Protection
- Bcrypt password hashing (cost factor 12)
- Row-level security on sensitive tables
- SSL/TLS required for connections

### Access Control
- Three database roles:
  - `inknowing_app`: Application access
  - `inknowing_readonly`: Read-only access
  - `inknowing_admin`: Administrative access

### Compliance
- GDPR-compliant soft deletes
- Audit trail for all changes
- Data retention policies

## Backup and Recovery

### Backup Strategy
- Daily full backups
- Hourly incremental backups
- 30-day retention policy
- Optional S3 storage

### Recovery Procedures
- Point-in-time recovery support
- Automated backup verification
- < 1 hour RTO (Recovery Time Objective)

## Monitoring and Maintenance

### Health Checks
- Database size monitoring
- Connection count tracking
- Long-running query detection
- Table bloat monitoring

### Automated Maintenance
- Daily statistics updates
- Expired token cleanup
- Inactive session closure
- Subscription expiry checks

## Migration Strategy

### Version Control
- Sequential migration files (001-008)
- Rollback scripts included
- Schema version tracking

### Deployment Process
1. Run migrations in order
2. Verify schema integrity
3. Load seed data (non-production)
4. Update application configuration

## Development Guidelines

### Naming Conventions
- Tables: snake_case, plural
- Columns: snake_case
- Indexes: idx_tablename_columns
- Constraints: tablename_constraint_type

### Best Practices
- Always use UUIDs for primary keys
- Include created_at/updated_at timestamps
- Implement soft deletes where appropriate
- Add comments to complex logic

## Common Queries

### User Authentication
```sql
SELECT u.*, uq.quota_used, uq.quota_total
FROM auth.users u
LEFT JOIN auth.user_quotas uq ON u.id = uq.user_id
WHERE u.phone = '13800138000' AND u.status = 'active';
```

### Popular Books
```sql
SELECT * FROM content.mv_popular_books
WHERE popularity_score > 80
ORDER BY popularity_score DESC
LIMIT 10;
```

### Active Dialogues
```sql
SELECT ds.*, COUNT(dm.id) as message_count
FROM dialogue.dialogue_sessions ds
LEFT JOIN dialogue.dialogue_messages dm ON ds.id = dm.session_id
WHERE ds.user_id = :user_id AND ds.status = 'active'
GROUP BY ds.id
ORDER BY ds.last_message_at DESC;
```

## Troubleshooting

### Common Issues

1. **Slow Queries**
   - Check pg_stat_statements
   - Run EXPLAIN ANALYZE
   - Verify index usage

2. **Connection Exhaustion**
   - Check PgBouncer stats
   - Review connection pooling settings
   - Identify connection leaks

3. **High Disk Usage**
   - Check table bloat
   - Run VACUUM FULL if needed
   - Archive old partitions

## Contact and Support

For database-related issues or questions:
- Technical documentation: This document
- Migration guides: See migrations/*.sql
- Support: Contact the database team

---

*Last Updated: 2024-01-09*
*Version: 1.0.0*