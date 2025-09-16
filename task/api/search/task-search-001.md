# Task: Question-Driven Book Discovery Search API

## Task Info
- **Task ID**: search-001
- **Priority**: Critical
- **Estimated Hours**: 16
- **Module**: Search
- **Dependencies**: book-001, AI Model integration
- **Business Logic Reference**: Question-Driven Discovery (Core Feature)

## Description
Implement the intelligent search API that enables users to discover books by asking questions. This is the core discovery mechanism that matches user questions with relevant books using AI and vector search.

## Technical Requirements

### API Endpoints to Implement

#### 1. GET /search
Search books by question or query with intelligent matching.

**Parameters:**
- `q`: Search query or question (required, max 200 chars)
- `type`: Search type (question, title, author) - default: question
- `page`: Page number (default: 1)
- `limit`: Results per page (max: 50, default: 10)

**Response:**
```json
{
  "query": "如何提高领导力？",
  "type": "question",
  "results": [
    {
      "book": {
        "id": "uuid",
        "title": "从优秀到卓越",
        "author": "Jim Collins",
        "category": "business"
      },
      "relevance_score": 95.5,
      "matched_chapters": [
        {
          "chapter_number": 3,
          "chapter_title": "第五级领导力",
          "preview": "第五级领导者具有双重特质..."
        }
      ]
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

#### 2. GET /search/books
Direct book title search.

**Parameters:**
- `title`: Book title to search
- `exact`: Boolean for exact match (default: false)

**Response:**
- List of books matching the title
- Fuzzy matching if exact=false

### Database Schema

```sql
-- search_queries table (for analytics)
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    query_text TEXT NOT NULL,
    query_type VARCHAR(20) NOT NULL,
    result_count INTEGER,
    clicked_book_id UUID REFERENCES books(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_query_type (query_type),
    INDEX idx_created_at (created_at)
);

-- book_embeddings table (for vector search)
CREATE TABLE book_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    content_type VARCHAR(20), -- 'summary', 'chapter', 'paragraph'
    content_text TEXT,
    embedding vector(1536), -- Using pgvector
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_book_id (book_id),
    INDEX idx_content_type (content_type)
);

-- Create vector index for similarity search
CREATE INDEX book_embeddings_vector_idx
ON book_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- question_book_mappings table (pre-computed matches)
CREATE TABLE question_book_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_pattern TEXT NOT NULL,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5,2),
    matched_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_book_id (book_id),
    INDEX idx_relevance_score (relevance_score DESC)
);
```

### Implementation Requirements

1. **Question Understanding**
   - Parse user question intent using NLP
   - Extract key concepts and topics
   - Convert question to embedding vector
   - Support Chinese and English queries

2. **Search Strategies**
   ```python
   class SearchStrategy:
       async def question_search(query: str):
           # 1. Generate query embedding
           embedding = await generate_embedding(query)

           # 2. Vector similarity search
           vector_results = await vector_search(embedding, limit=50)

           # 3. AI-enhanced ranking
           ranked_results = await ai_rank_results(query, vector_results)

           # 4. Add matched content preview
           return add_content_previews(ranked_results)

       async def title_search(title: str, exact: bool):
           if exact:
               return exact_title_match(title)
           else:
               return fuzzy_title_search(title)

       async def author_search(author: str):
           return search_by_author(author)
   ```

3. **Relevance Scoring**
   - Vector similarity score (0-100)
   - Keyword match bonus
   - Category relevance weighting
   - Popularity factor
   - Recency boost for new books

4. **Performance Optimization**
   - Cache frequent queries (TTL: 1 hour)
   - Pre-compute embeddings for books
   - Use approximate nearest neighbor search
   - Implement search result pagination

## Acceptance Criteria

### Functional Requirements
- [ ] Question search returns relevant books
- [ ] Relevance scores are meaningful (0-100)
- [ ] Matched content previews are accurate
- [ ] Title search supports fuzzy matching
- [ ] Empty queries return 400 error
- [ ] Search results are paginated

### Performance Requirements
- [ ] Search responds within 500ms
- [ ] Vector search uses indexes effectively
- [ ] Cache hit rate > 30% for common queries
- [ ] Supports 100 concurrent searches

### Quality Requirements
- [ ] Top 3 results are highly relevant
- [ ] Chinese questions work correctly
- [ ] No duplicate results in response
- [ ] Search analytics are tracked

## Test Cases

### Unit Tests
```python
def test_question_search():
    """Test question-based book discovery"""
    response = client.get("/search?q=如何提高领导力&type=question")

    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "question"
    assert len(data["results"]) > 0
    assert data["results"][0]["relevance_score"] > 0

def test_title_search_fuzzy():
    """Test fuzzy title matching"""
    response = client.get("/search/books?title=红楼&exact=false")

    assert response.status_code == 200
    books = response.json()["books"]
    assert any("红楼梦" in book["title"] for book in books)

def test_search_pagination():
    """Test search result pagination"""
    page1 = client.get("/search?q=人生哲学&page=1&limit=5")
    page2 = client.get("/search?q=人生哲学&page=2&limit=5")

    assert page1.json()["page"] == 1
    assert page2.json()["page"] == 2
    assert page1.json()["results"] != page2.json()["results"]

def test_empty_query_validation():
    """Test empty query returns error"""
    response = client.get("/search?q=")
    assert response.status_code == 400
    assert "error" in response.json()
```

### Integration Tests
```python
def test_question_to_dialogue_flow():
    """Test complete question to dialogue flow"""
    # 1. User asks question
    search = client.get("/search?q=如何处理职场压力")
    assert search.status_code == 200

    # 2. Select book from results
    book_id = search.json()["results"][0]["book"]["id"]

    # 3. Start dialogue with book
    dialogue = client.post("/dialogues/book/start", json={
        "book_id": book_id,
        "initial_question": "如何处理职场压力"
    })
    assert dialogue.status_code == 201

def test_search_with_ai_ranking():
    """Test AI-enhanced result ranking"""
    response = client.get("/search?q=爱情与婚姻的关系")

    results = response.json()["results"]
    # Verify relevance scores are descending
    scores = [r["relevance_score"] for r in results]
    assert scores == sorted(scores, reverse=True)

    # Verify matched content is relevant
    for result in results[:3]:
        assert "matched_chapters" in result
        assert len(result["matched_chapters"]) > 0
```

### Performance Tests
```python
def test_search_response_time():
    """Test search API response time"""
    import time

    queries = [
        "如何提高工作效率",
        "人工智能的未来",
        "投资理财入门",
        "心理健康管理"
    ]

    for query in queries:
        start = time.time()
        response = client.get(f"/search?q={query}")
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 0.5  # 500ms requirement

def test_concurrent_searches():
    """Test system handles concurrent searches"""
    import asyncio

    async def search(query):
        return await async_client.get(f"/search?q={query}")

    queries = [f"query_{i}" for i in range(100)]
    tasks = [search(q) for q in queries]

    results = await asyncio.gather(*tasks)
    assert all(r.status_code == 200 for r in results)
```

## Implementation Notes

### Embedding Generation
```python
async def generate_embedding(text: str) -> List[float]:
    """Generate embedding vector for text"""
    response = await openai_client.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response.data[0].embedding
```

### Vector Search Implementation
```python
async def vector_search(embedding: List[float], limit: int = 10):
    """Perform vector similarity search"""
    query = """
        SELECT
            be.book_id,
            be.chapter_number,
            be.content_text,
            be.embedding <=> $1 as distance
        FROM book_embeddings be
        JOIN books b ON be.book_id = b.id
        WHERE b.status = 'published'
        ORDER BY distance
        LIMIT $2
    """
    return await db.fetch(query, embedding, limit)
```

### Caching Strategy
```python
# Cache keys
SEARCH_CACHE_KEY = "search:question:{query_hash}:{page}:{limit}"
TITLE_SEARCH_KEY = "search:title:{title}:{exact}"

# Generate cache key for question
def get_search_cache_key(query: str, page: int, limit: int) -> str:
    query_hash = hashlib.md5(query.encode()).hexdigest()
    return SEARCH_CACHE_KEY.format(
        query_hash=query_hash,
        page=page,
        limit=limit
    )
```

### AI Ranking Enhancement
```python
async def ai_rank_results(query: str, results: List[dict]) -> List[dict]:
    """Use AI to re-rank search results"""
    prompt = f"""
    User Question: {query}

    Rank these books by relevance to the question:
    {json.dumps(results, ensure_ascii=False)}

    Consider:
    1. Content relevance
    2. Practical applicability
    3. Depth of coverage
    """

    response = await ai_client.complete(prompt)
    return parse_ranking_response(response, results)
```

## Dependencies
- PostgreSQL with pgvector extension
- OpenAI Embeddings API
- Redis for caching
- NLP library for query parsing

## Related Tasks
- book-001: Book listing and discovery
- dialogue-001: Starting dialogue from search results
- ai-model-001: AI model configuration for embeddings