# Task: Admin Book and User Management API

## Task Info
- **Task ID**: admin-002
- **Priority**: High
- **Estimated Hours**: 18
- **Module**: Admin
- **Dependencies**: admin-001, book-001, user-001
- **Business Logic Reference**: Admin Book Management, User Management

## Description
Implement comprehensive admin APIs for managing books, users, characters, and reviewing user uploads. This includes CRUD operations, status management, and content moderation capabilities.

## Technical Requirements

### API Endpoints to Implement

#### 1. Book Management APIs

**GET /admin/books** - List all books with admin view
```json
{
  "books": [
    {
      "id": "uuid",
      "title": "红楼梦",
      "status": "published",
      "source": "admin",
      "vector_status": "completed",
      "dialogue_count": 234,
      "total_api_cost": 45.67
    }
  ],
  "pagination": {...}
}
```

**POST /admin/books** - Create new book
**PUT /admin/books/{bookId}** - Update book
**DELETE /admin/books/{bookId}** - Delete book

#### 2. Character Management APIs

**GET /admin/books/{bookId}/characters** - List characters
**POST /admin/books/{bookId}/characters** - Add character
**PUT /admin/books/{bookId}/characters/{characterId}** - Update character
**DELETE /admin/books/{bookId}/characters/{characterId}** - Delete character

#### 3. User Management APIs

**GET /admin/users** - List all users
**GET /admin/users/{userId}** - Get user details
**PATCH /admin/users/{userId}** - Update user status/membership

#### 4. Upload Review API

**POST /admin/books/{bookId}/review** - Review uploaded book
```json
{
  "action": "approve",
  "vectorize": true,
  "reason": "Content verified"
}
```

### Database Schema Extensions

```sql
-- book_review_queue table
CREATE TABLE book_review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id),
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewing', 'completed'
    reviewer_id UUID REFERENCES admins(id),
    review_started_at TIMESTAMP,
    review_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_status_priority (status, priority DESC),
    INDEX idx_reviewer_id (reviewer_id)
);

-- book_review_history table
CREATE TABLE book_review_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES admins(id),
    action VARCHAR(20) NOT NULL, -- 'approve', 'reject', 'request_changes'
    reason TEXT,
    vectorize_decision BOOLEAN,
    changes_requested TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_book_id (book_id),
    INDEX idx_reviewer_id (reviewer_id),
    INDEX idx_created_at (created_at)
);

-- user_status_changes table
CREATE TABLE user_status_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    admin_id UUID REFERENCES admins(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_membership VARCHAR(20),
    new_membership VARCHAR(20),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_admin_id (admin_id)
);
```

### Implementation Requirements

1. **Book Management Service**
   ```python
   class AdminBookService:
       async def create_book(self, data: dict, admin_id: str):
           # Check if AI knows the book
           ai_known = await check_ai_knowledge(data['title'], data['author'])

           # Create book record
           book = await create_book_record({
               **data,
               'type': 'ai_known' if ai_known else 'needs_upload',
               'source': 'admin',
               'status': 'draft'
           })

           # Auto-extract characters if AI-known
           if ai_known:
               await extract_characters(book.id)

           # Log admin action
           await log_action(admin_id, 'create_book', book.id)

           return book

       async def update_book_status(self, book_id: str, status: str, admin_id: str):
           # Validate status transition
           current = await get_book(book_id)
           if not is_valid_transition(current.status, status):
               raise InvalidStatusTransition()

           # Update status
           await update_book(book_id, {'status': status})

           # Trigger related actions
           if status == 'published':
               await publish_book_actions(book_id)
           elif status == 'offline':
               await offline_book_actions(book_id)
   ```

2. **Character Management**
   ```python
   class AdminCharacterService:
       async def create_character(self, book_id: str, data: dict):
           # Validate book exists
           book = await get_book(book_id)

           # Create character with full configuration
           character = await create_character_record({
               'book_id': book_id,
               **data,
               'created_by': 'admin_created'
           })

           # Add dialogue style
           if 'dialogue_style' in data:
               await set_character_style(character.id, data['dialogue_style'])

           # Add memories and examples
           if 'memories' in data:
               await add_character_memories(character.id, data['memories'])

           return character
   ```

3. **User Management**
   ```python
   class AdminUserService:
       async def update_user_status(self, user_id: str, updates: dict, admin_id: str):
           user = await get_user(user_id)

           # Record status change
           await record_status_change({
               'user_id': user_id,
               'admin_id': admin_id,
               'old_status': user.status,
               'new_status': updates.get('status'),
               'old_membership': user.membership,
               'new_membership': updates.get('membership')
           })

           # Apply updates
           await update_user(user_id, updates)

           # Handle membership changes
           if 'membership' in updates:
               await adjust_user_quotas(user_id, updates['membership'])
   ```

4. **Upload Review Process**
   ```python
   class UploadReviewService:
       async def review_upload(self, book_id: str, action: str, admin_id: str, **kwargs):
           # Get upload and book info
           book = await get_book(book_id)
           upload = await get_upload_by_book(book_id)

           # Process based on action
           if action == 'approve':
               await approve_upload(book_id, upload.id)

               # Start vectorization if needed
               if kwargs.get('vectorize') and not book.ai_known:
                   await start_vectorization(book_id)

               # Award points to uploader
               await award_upload_points(upload.user_id)

           elif action == 'reject':
               await reject_upload(book_id, kwargs.get('reason'))

           elif action == 'request_changes':
               await request_changes(book_id, kwargs.get('changes'))

           # Record review
           await record_review(book_id, admin_id, action, kwargs)
   ```

## Acceptance Criteria

### Functional Requirements
- [ ] Admin can create, update, delete books
- [ ] Character management works for all books
- [ ] User status and membership can be updated
- [ ] Upload review process completes successfully
- [ ] All changes are logged for audit
- [ ] Proper error handling for invalid operations

### Security Requirements
- [ ] Only authorized admins can access endpoints
- [ ] Role-based permissions are enforced
- [ ] Sensitive user data is protected
- [ ] Deletion operations require confirmation
- [ ] Audit trail for all modifications

### Data Integrity
- [ ] Cascading deletes work correctly
- [ ] Status transitions are validated
- [ ] Character uniqueness per book
- [ ] User quota adjustments are accurate

## Test Cases

### Unit Tests
```python
def test_create_book_admin():
    """Test admin book creation"""
    token = get_admin_token()
    response = client.post("/admin/books",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "New Book",
            "author": "Author",
            "type": "ai_known",
            "category": "fiction"
        })

    assert response.status_code == 201
    book = response.json()
    assert book["source"] == "admin"
    assert book["status"] == "draft"

def test_update_book_status():
    """Test book status update"""
    book_id = create_test_book(status="draft")
    token = get_admin_token()

    response = client.put(f"/admin/books/{book_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "published"})

    assert response.status_code == 200
    assert response.json()["status"] == "published"

def test_manage_characters():
    """Test character CRUD operations"""
    book_id = create_test_book()
    token = get_admin_token()

    # Create character
    create_response = client.post(f"/admin/books/{book_id}/characters",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "主角",
            "description": "故事的主人公",
            "personality": "勇敢、正直"
        })
    assert create_response.status_code == 201

    char_id = create_response.json()["id"]

    # Update character
    update_response = client.put(
        f"/admin/books/{book_id}/characters/{char_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"personality": "勇敢、正直、智慧"})
    assert update_response.status_code == 200

def test_user_management():
    """Test user status and membership updates"""
    user_id = create_test_user(membership="free")
    token = get_admin_token()

    response = client.patch(f"/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "membership": "premium",
            "quota_override": 1000
        })

    assert response.status_code == 200
    user = response.json()
    assert user["membership"] == "premium"
```

### Integration Tests
```python
def test_upload_review_workflow():
    """Test complete upload review workflow"""
    # User uploads book
    upload_id = user_upload_book("New Book", "Author")
    wait_for_processing(upload_id)

    # Get book from upload
    upload = client.get(f"/uploads/{upload_id}")
    book_id = upload.json()["book_id"]

    # Admin reviews and approves
    token = get_admin_token()
    response = client.post(f"/admin/books/{book_id}/review",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "action": "approve",
            "vectorize": True
        })

    assert response.status_code == 200

    # Check book status
    book = client.get(f"/admin/books/{book_id}",
        headers={"Authorization": f"Bearer {token}"})
    assert book.json()["review_status"] == "approved"

def test_ai_known_book_character_extraction():
    """Test automatic character extraction for AI-known books"""
    token = get_admin_token()

    # Create AI-known book
    response = client.post("/admin/books",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "红楼梦",
            "author": "曹雪芹",
            "type": "ai_known"
        })

    book_id = response.json()["id"]

    # Wait for character extraction
    time.sleep(5)

    # Check characters were extracted
    chars = client.get(f"/admin/books/{book_id}/characters",
        headers={"Authorization": f"Bearer {token}"})

    assert len(chars.json()["characters"]) > 0
    assert any(c["name"] == "林黛玉" for c in chars.json()["characters"])
```

### Performance Tests
```python
def test_bulk_user_management():
    """Test managing many users efficiently"""
    user_ids = [create_test_user() for _ in range(100)]
    token = get_admin_token()

    start = time.time()

    # Update all users
    for user_id in user_ids:
        client.patch(f"/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "active"})

    duration = time.time() - start
    assert duration < 30  # Should complete within 30 seconds

def test_book_listing_performance():
    """Test admin book listing with many books"""
    # Create many books
    for i in range(1000):
        create_test_book(title=f"Book {i}")

    token = get_admin_token()

    start = time.time()
    response = client.get("/admin/books?limit=100",
        headers={"Authorization": f"Bearer {token}"})
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 0.5  # 500ms requirement
```

## Implementation Notes

### Status Transition Validation
```python
VALID_STATUS_TRANSITIONS = {
    'draft': ['published', 'review'],
    'review': ['published', 'draft', 'rejected'],
    'published': ['offline'],
    'offline': ['published', 'draft'],
    'rejected': ['draft']
}

def is_valid_transition(current: str, new: str) -> bool:
    return new in VALID_STATUS_TRANSITIONS.get(current, [])
```

### Batch Operations
```python
async def batch_update_books(book_ids: List[str], updates: dict):
    """Efficiently update multiple books"""
    async with db.transaction():
        for book_id in book_ids:
            await update_book(book_id, updates)

        # Single audit log entry for batch
        await log_batch_action(
            "batch_update_books",
            book_ids,
            updates
        )
```

### Review Queue Management
```python
async def get_next_review_item(reviewer_id: str):
    """Get next item from review queue"""
    item = await db.fetch_one("""
        SELECT * FROM book_review_queue
        WHERE status = 'pending'
        AND (reviewer_id IS NULL OR reviewer_id = $1)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    """, reviewer_id)

    if item:
        await db.execute("""
            UPDATE book_review_queue
            SET status = 'reviewing',
                reviewer_id = $1,
                review_started_at = NOW()
            WHERE id = $2
        """, reviewer_id, item['id'])

    return item
```

## Dependencies
- Admin authentication system
- Book management module
- User management module
- Audit logging system
- Background job processing

## Related Tasks
- admin-001: Admin authentication
- book-001: Book management
- upload-001: Upload processing
- admin-003: Statistics and monitoring