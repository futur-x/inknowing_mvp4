# Task: Book Details and Character Management API

## Task Info
- **Task ID**: book-002
- **Priority**: High
- **Estimated Hours**: 10
- **Module**: Book Management
- **Dependencies**: book-001, Database setup
- **Business Logic Reference**: Character Selection for Immersive Dialogue

## Description
Implement APIs for retrieving detailed book information and managing book characters. This enables users to view comprehensive book details and select characters for dialogue interactions.

## Technical Requirements

### API Endpoints to Implement

#### 1. GET /books/{bookId}
Get detailed information about a specific book.

**Parameters:**
- `bookId`: UUID of the book

**Response:**
- Complete book details including:
  - Basic info (title, author, cover, category, description)
  - Statistics (dialogue_count, rating, chapters)
  - Type (ai_known or vectorized)
  - Available characters
  - Tags and metadata
  - Uploader info (if user-uploaded)

**Error Handling:**
- 404 if book not found
- 403 if book is offline/draft (unless admin)

#### 2. GET /books/{bookId}/characters
Get list of available dialogue characters for a book.

**Parameters:**
- `bookId`: UUID of the book

**Response:**
- Array of character objects with:
  - Character ID, name, alias
  - Description and personality
  - Dialogue count
  - Enabled status

### Database Schema

```sql
-- characters table
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    personality TEXT,
    dialogue_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(20) DEFAULT 'ai_extracted', -- 'ai_extracted' or 'admin_created'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_book_id (book_id),
    INDEX idx_enabled (enabled),
    UNIQUE KEY unique_book_character (book_id, name)
);

-- character_aliases table
CREATE TABLE character_aliases (
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    PRIMARY KEY (character_id, alias),
    INDEX idx_alias (alias)
);

-- character_dialogue_styles table
CREATE TABLE character_dialogue_styles (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    language_style VARCHAR(20), -- 'elegant', 'poetic', 'modern', 'casual'
    emotional_tone VARCHAR(20), -- 'melancholic', 'cheerful', 'serious', 'rebellious'
    knowledge_scope VARCHAR(20), -- 'book_only', 'extended'
    personality_prompt TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- character_memories table
CREATE TABLE character_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    memory_text TEXT NOT NULL,
    importance INTEGER DEFAULT 5, -- 1-10 scale
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_character_id (character_id),
    INDEX idx_importance (importance)
);

-- example_dialogues table
CREATE TABLE example_dialogues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    user_input TEXT NOT NULL,
    character_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_character_id (character_id)
);
```

### Implementation Requirements

1. **Book Details Aggregation**
   - Join multiple tables efficiently
   - Calculate derived fields (estimated_reading_time)
   - Include character count and preview
   - Format response based on user role

2. **Character Management**
   - Auto-extract characters for AI-known books
   - Support manual character creation
   - Character personality configuration
   - Example dialogue management

3. **Access Control**
   - Public access for published books
   - Admin access for all statuses
   - User access for their uploaded books
   - Character visibility based on enabled flag

4. **Performance Optimization**
   - Use eager loading for related data
   - Cache book details (TTL: 10 minutes)
   - Optimize character queries with indexes

## Acceptance Criteria

### Functional Requirements
- [ ] Book details include all required fields
- [ ] Characters are properly associated with books
- [ ] Character aliases are searchable
- [ ] Disabled characters are hidden from users
- [ ] Book type (ai_known/vectorized) is correctly shown
- [ ] 404 returned for non-existent books

### Performance Requirements
- [ ] Book details load within 150ms
- [ ] Character list loads within 100ms
- [ ] Related data loaded in single query (no N+1)
- [ ] Caching reduces database load

### Data Integrity
- [ ] Character names are unique per book
- [ ] Character deletion cascades properly
- [ ] Character statistics are accurate
- [ ] Memory and dialogue examples are preserved

## Test Cases

### Unit Tests
```python
def test_get_book_details():
    """Test retrieving book details"""
    book_id = create_test_book()
    response = client.get(f"/books/{book_id}")

    assert response.status_code == 200
    book = response.json()
    assert book["id"] == str(book_id)
    assert "characters" in book
    assert "tags" in book
    assert "type" in book

def test_book_not_found():
    """Test 404 for non-existent book"""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/books/{fake_id}")
    assert response.status_code == 404

def test_get_book_characters():
    """Test retrieving book characters"""
    book_id = create_test_book_with_characters()
    response = client.get(f"/books/{book_id}/characters")

    assert response.status_code == 200
    data = response.json()
    assert "characters" in data
    assert len(data["characters"]) > 0

def test_character_enabled_filter():
    """Test that disabled characters are hidden"""
    book_id = create_test_book()
    char_id = create_character(book_id, enabled=False)

    response = client.get(f"/books/{book_id}/characters")
    characters = response.json()["characters"]

    assert not any(c["id"] == str(char_id) for c in characters)
```

### Integration Tests
```python
def test_book_with_full_character_data():
    """Test book with complete character information"""
    book_id = create_ai_known_book()

    # Create character with all attributes
    character = create_character_with_style(
        book_id,
        name="林黛玉",
        style={"language_style": "poetic", "emotional_tone": "melancholic"}
    )

    # Add memories and examples
    add_character_memory(character["id"], "初入贾府，寄人篱下")
    add_example_dialogue(
        character["id"],
        user="你觉得宝玉如何？",
        response="他虽有些痴傻，却是个真性情的人。"
    )

    response = client.get(f"/books/{book_id}")
    assert response.status_code == 200

    book = response.json()
    assert len(book["characters"]) > 0
    char = book["characters"][0]
    assert char["name"] == "林黛玉"

def test_character_alias_search():
    """Test searching characters by alias"""
    book_id = create_test_book()
    char_id = create_character(book_id, name="孙悟空")
    add_character_alias(char_id, "美猴王")
    add_character_alias(char_id, "齐天大圣")

    response = client.get(f"/books/{book_id}/characters")
    characters = response.json()["characters"]

    monkey_king = next(c for c in characters if c["name"] == "孙悟空")
    assert "美猴王" in monkey_king["alias"]
    assert "齐天大圣" in monkey_king["alias"]
```

### Performance Tests
```python
def test_book_details_performance():
    """Test book details loading performance"""
    book_id = create_book_with_many_characters(count=20)

    import time
    start = time.time()
    response = client.get(f"/books/{book_id}")
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 0.15  # 150ms requirement

def test_character_query_optimization():
    """Test character query doesn't cause N+1"""
    book_id = create_book_with_characters_and_data()

    with assert_query_count(max_queries=3):  # Should be optimized
        response = client.get(f"/books/{book_id}/characters")
        assert response.status_code == 200
```

## Implementation Notes

### Character Extraction for AI-Known Books
```python
async def extract_characters_from_ai(book_title: str, author: str):
    """Use AI to extract character information"""
    prompt = f"""
    List the main characters from '{book_title}' by {author}.
    For each character provide:
    - Name and common aliases
    - Brief description
    - Key personality traits
    - Speaking style
    """

    response = await ai_client.complete(prompt)
    return parse_character_response(response)
```

### Caching Strategy
```python
# Cache keys
BOOK_DETAILS_KEY = "book:details:{book_id}"
BOOK_CHARACTERS_KEY = "book:characters:{book_id}"

# Cache invalidation on update
def invalidate_book_cache(book_id: str):
    redis_client.delete(
        BOOK_DETAILS_KEY.format(book_id=book_id),
        BOOK_CHARACTERS_KEY.format(book_id=book_id)
    )
```

### Query Optimization
```sql
-- Optimized query for book details with characters
SELECT
    b.*,
    COUNT(DISTINCT c.id) as character_count,
    json_agg(
        DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'description', c.description
        )
    ) FILTER (WHERE c.enabled = true) as characters
FROM books b
LEFT JOIN characters c ON b.id = c.book_id AND c.enabled = true
WHERE b.id = $1
GROUP BY b.id;
```

## Dependencies
- Character extraction AI service
- Redis for caching
- PostgreSQL with JSON support

## Related Tasks
- dialogue-002: Character dialogue implementation
- admin-003: Character management interface
- upload-002: Character extraction from uploaded books