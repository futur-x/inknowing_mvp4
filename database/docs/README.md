# InKnowing Database Implementation

## Quick Start

### Prerequisites
- PostgreSQL 13+
- Redis 6+
- ChromaDB
- Bash shell

### Setup Instructions

1. **Clone and navigate to database directory**:
```bash
cd /path/to/inknowing_mvp_ver4/database
```

2. **Set environment variables**:
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=yourpassword
export DB_NAME=inknowing_db
```

3. **Run setup script**:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh development
```

This will:
- Create the database
- Run all migrations
- Load seed data (for development)
- Verify the setup

## Directory Structure

```
database/
├── migrations/          # SQL migration files (001-008)
│   ├── 001_init_database.sql
│   ├── 002_user_tables.sql
│   ├── 003_book_tables.sql
│   ├── 004_dialogue_tables.sql
│   ├── 005_upload_tables.sql
│   ├── 006_payment_tables.sql
│   ├── 007_indexes_optimization.sql
│   └── 008_backup_procedures.sql
├── seeds/              # Test data for development
│   ├── 01_users.sql
│   ├── 02_books.sql
│   └── 03_dialogues.sql
├── scripts/            # Utility scripts
│   ├── setup.sh       # Database initialization
│   └── backup.sh      # Backup procedures
├── config/            # Configuration files
│   ├── database.yml   # PostgreSQL configuration
│   ├── redis.yml      # Redis cache configuration
│   └── chromadb.yml   # Vector database configuration
└── docs/              # Documentation
    ├── README.md      # This file
    └── schema.md      # Detailed schema documentation
```

## Migration Files Overview

| Migration | Description | Key Features |
|-----------|-------------|--------------|
| 001 | Database initialization | Extensions, schemas, types, common functions |
| 002 | User authentication | Users, profiles, tokens, quotas, login history |
| 003 | Book management | Books, characters, tags, ratings, collections |
| 004 | Dialogue system | Sessions, messages, contexts, templates |
| 005 | Upload processing | Upload jobs, processing steps, vector chunks |
| 006 | Payment system | Plans, subscriptions, transactions, invoices |
| 007 | Performance optimization | Indexes, materialized views, query tuning |
| 008 | Backup procedures | Audit logs, backup history, maintenance |

## Key Features

### Business Logic Implementation
- **User Journey**: Anonymous → Registered → Free → Paid
- **Membership Tiers**: Free (20/day), Basic (200/mo), Premium (500/mo), Super (1000/mo)
- **Book Types**: AI-known vs User-uploaded vectorized
- **Dialogue Types**: Book discussions and character roleplay

### Technical Features
- **Partitioning**: Monthly partitions for high-volume tables
- **Full-text Search**: GIN indexes for book/author search
- **Vector Storage**: Integration with ChromaDB for embeddings
- **Real-time Support**: WebSocket connection tracking
- **Audit Trail**: Complete audit logging for compliance

### Performance Optimizations
- Strategic indexing for common queries
- Materialized views for aggregations
- Connection pooling with PgBouncer
- Redis caching for session/user data

### Security Measures
- Bcrypt password hashing
- Row-level security (RLS)
- SSL/TLS required connections
- Role-based access control

## Common Operations

### Check Database Status
```sql
-- Check schema creation
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('auth', 'content', 'dialogue', 'upload', 'payment', 'admin', 'audit');

-- Check table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema IN ('auth', 'content', 'dialogue', 'upload', 'payment');

-- Check user quota
SELECT u.username, uq.* FROM auth.users u
JOIN auth.user_quotas uq ON u.id = uq.user_id;
```

### Backup Database
```bash
./scripts/backup.sh full
```

### Connect to Database
```bash
psql -h localhost -U postgres -d inknowing_db
```

### View Migration Status
```sql
SELECT * FROM public.schema_migrations ORDER BY version;
```

## Testing

### Run Test Queries
```sql
-- Test user authentication
SELECT auth.verify_password('Test123!', password_hash)
FROM auth.users WHERE username = 'testuser1';

-- Test book search
SELECT * FROM content.books
WHERE to_tsvector('simple', title || ' ' || author) @@ plainto_tsquery('simple', '三体');

-- Test dialogue creation
INSERT INTO dialogue.dialogue_sessions (user_id, book_id, type, title)
VALUES (
    (SELECT id FROM auth.users WHERE username = 'testuser1'),
    (SELECT id FROM content.books LIMIT 1),
    'book',
    'Test Dialogue'
);
```

## Environment Configuration

### Development
```yaml
Database: inknowing_db
Host: localhost:5432
User: postgres
```

### Production Recommendations
- Use connection pooling (PgBouncer)
- Enable SSL/TLS
- Configure read replicas
- Set up automated backups
- Monitor with pg_stat_statements

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check PostgreSQL version (requires 13+)
   - Verify extensions are available
   - Check user permissions

2. **Connection Issues**
   - Verify PostgreSQL is running
   - Check firewall/network settings
   - Confirm credentials

3. **Performance Problems**
   - Run ANALYZE on tables
   - Check slow query log
   - Review index usage

## Maintenance

### Daily Tasks
- Monitor slow queries
- Check backup completion
- Review error logs

### Weekly Tasks
- Update table statistics
- Clean expired sessions
- Archive old audit logs

### Monthly Tasks
- Create new partitions
- Review index usage
- Optimize queries

## Support

For issues or questions:
- Review `/database/docs/schema.md` for detailed documentation
- Check migration files for implementation details
- Contact the development team

## License

Proprietary - InKnowing AI Platform

---

*Generated: 2024-01-09*
*Version: 1.0.0*