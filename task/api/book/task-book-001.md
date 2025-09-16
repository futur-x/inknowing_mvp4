# Task: Book Discovery and Listing API

## Task Info
- **Task ID**: book-001
- **Priority**: High
- **Estimated Hours**: 12
- **Module**: Book Management
- **Dependencies**: Database setup, Authentication module
- **Business Logic Reference**: Book-driven Discovery (User Journey)

## Description
Implement the book discovery and listing APIs that enable users to browse, search, and filter available books. This includes popular books, category-based filtering, and pagination support.

## Technical Requirements

### API Endpoints to Implement

#### 1. GET /books
List all available books with filtering and pagination.

**Parameters:**
- `category`: Filter by book category (business, psychology, fiction, science, history, philosophy)
- `sort`: Sorting method (popular, newest, most_discussed)
- `page`: Page number (default: 1)
- `limit`: Items per page (max: 50, default: 20)

**Response:**
- Book list with pagination metadata
- Each book includes: id, title, author, cover, category, description, dialogue_count, rating

#### 2. GET /books/popular
Get popular books based on dialogue count.

**Parameters:**
- `period`: Time period (today, week, month, all)
- `limit`: Number of results (max: 20, default: 10)

**Response:**
- List of popular books sorted by dialogue count
- Includes trending indicators and engagement metrics

### Database Schema

```sql
-- books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    cover_url TEXT,
    category VARCHAR(50),
    description TEXT,
    dialogue_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    type VARCHAR(20) NOT NULL, -- 'ai_known' or 'vectorized'
    status VARCHAR(20) DEFAULT 'published', -- 'published', 'draft', 'review', 'offline'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_dialogue_count (dialogue_count),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- book_tags table
CREATE TABLE book_tags (
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (book_id, tag),
    INDEX idx_tag (tag)
);

-- book_statistics table (for tracking popularity)
CREATE TABLE book_statistics (
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    dialogue_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    average_rating DECIMAL(2,1),
    PRIMARY KEY (book_id, date),
    INDEX idx_date (date)
);
```

### Implementation Requirements

1. **Query Optimization**
   - Use database indexes for efficient filtering
   - Implement query result caching (Redis)
   - Cache popular books list (TTL: 5 minutes)

2. **Sorting Algorithms**
   - Popular: Sort by dialogue_count DESC
   - Newest: Sort by created_at DESC
   - Most Discussed: Sort by recent dialogue activity (last 7 days)

3. **Category Management**
   - Validate category against allowed values
   - Support multiple category filtering (future enhancement)
   - Category statistics tracking

4. **Response Optimization**
   - Implement field selection (sparse fieldsets)
   - Use pagination cursors for large datasets
   - Include total count in pagination metadata

## Acceptance Criteria

### Functional Requirements
- [ ] Books can be listed with pagination
- [ ] Category filtering works correctly
- [ ] Sorting options produce expected results
- [ ] Popular books API returns time-based results
- [ ] Empty results return proper response structure
- [ ] Invalid parameters return 400 with error details

### Performance Requirements
- [ ] List API responds within 200ms for 1000 books
- [ ] Popular books API uses caching effectively
- [ ] Database queries use indexes (EXPLAIN verified)
- [ ] Pagination doesn't cause N+1 queries

### Security Requirements
- [ ] SQL injection prevention in place
- [ ] Rate limiting applied (100 req/min)
- [ ] Input validation for all parameters
- [ ] No sensitive data exposed in responses

## Test Cases

### Unit Tests
```python
def test_list_books_with_pagination():
    """Test book listing with pagination"""
    response = client.get("/books?page=1&limit=10")
    assert response.status_code == 200
    assert len(response.json()["books"]) <= 10
    assert "pagination" in response.json()

def test_filter_by_category():
    """Test category filtering"""
    response = client.get("/books?category=business")
    assert response.status_code == 200
    books = response.json()["books"]
    assert all(book["category"] == "business" for book in books)

def test_sort_by_popularity():
    """Test sorting by dialogue count"""
    response = client.get("/books?sort=popular")
    assert response.status_code == 200
    books = response.json()["books"]
    counts = [book["dialogue_count"] for book in books]
    assert counts == sorted(counts, reverse=True)

def test_popular_books_period():
    """Test popular books with different periods"""
    for period in ["today", "week", "month", "all"]:
        response = client.get(f"/books/popular?period={period}")
        assert response.status_code == 200
        assert "books" in response.json()
```

### Integration Tests
```python
def test_book_discovery_flow():
    """Test complete book discovery user flow"""
    # 1. Get popular books
    popular = client.get("/books/popular?period=week")
    assert popular.status_code == 200

    # 2. Filter by category
    category = client.get("/books?category=psychology")
    assert category.status_code == 200

    # 3. Search within results (if search implemented)
    # This would integrate with search module

def test_pagination_consistency():
    """Test pagination returns consistent results"""
    page1 = client.get("/books?page=1&limit=10")
    page2 = client.get("/books?page=2&limit=10")

    ids1 = {book["id"] for book in page1.json()["books"]}
    ids2 = {book["id"] for book in page2.json()["books"]}

    assert len(ids1.intersection(ids2)) == 0  # No duplicates
```

### Performance Tests
```python
def test_response_time():
    """Test API response time requirements"""
    import time

    start = time.time()
    response = client.get("/books?limit=50")
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 0.2  # 200ms requirement

def test_cache_effectiveness():
    """Test caching for popular books"""
    # First request - cache miss
    response1 = client.get("/books/popular")

    # Second request - should be cached
    import time
    start = time.time()
    response2 = client.get("/books/popular")
    duration = time.time() - start

    assert duration < 0.05  # Should be very fast from cache
    assert response1.json() == response2.json()
```

## Implementation Notes

### Caching Strategy
```python
# Redis cache keys
POPULAR_BOOKS_KEY = "books:popular:{period}:{limit}"
BOOK_LIST_KEY = "books:list:{category}:{sort}:{page}:{limit}"

# Cache TTLs
POPULAR_BOOKS_TTL = 300  # 5 minutes
BOOK_LIST_TTL = 60  # 1 minute
```

### Query Optimization Example
```sql
-- Optimized query for popular books this week
SELECT
    b.*,
    COALESCE(SUM(bs.dialogue_count), 0) as week_dialogues
FROM books b
LEFT JOIN book_statistics bs ON b.id = bs.book_id
    AND bs.date >= CURRENT_DATE - INTERVAL '7 days'
WHERE b.status = 'published'
GROUP BY b.id
ORDER BY week_dialogues DESC
LIMIT 10;
```

## Dependencies
- PostgreSQL with UUID extension
- Redis for caching
- SQLAlchemy ORM
- Pydantic for validation

## Related Tasks
- search-001: Search functionality integration
- admin-002: Admin book management
- dialogue-001: Dialogue creation with books