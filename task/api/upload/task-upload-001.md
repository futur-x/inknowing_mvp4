# Task: Book Upload and Processing API

## Task Info
- **Task ID**: upload-001
- **Priority**: High
- **Estimated Hours**: 20
- **Module**: Upload
- **Dependencies**: Authentication, AI Model integration, File storage
- **Business Logic Reference**: User Upload → AI Processing → Vectorization Pipeline

## Description
Implement the complete book upload system that allows users to upload books, checks for duplicates, processes files, and manages the vectorization pipeline for non-AI-known books.

## Technical Requirements

### API Endpoints to Implement

#### 1. POST /uploads/check
Check if a book already exists before upload.

**Request Body:**
```json
{
  "title": "书籍标题",
  "author": "作者名"
}
```

**Response:**
```json
{
  "exists": false,
  "book_id": null,
  "ai_known": false
}
```

#### 2. POST /uploads
Upload a book file for processing.

**Request (multipart/form-data):**
- `file`: Book file (TXT or PDF, max 10MB)
- `title`: Book title
- `author`: Author name
- `category`: Book category (optional)
- `description`: Book description (optional)

**Response (202 Accepted):**
```json
{
  "id": "upload-uuid",
  "status": "pending",
  "estimated_time": 300,
  "message": "Upload accepted for processing"
}
```

#### 3. GET /uploads/{uploadId}
Get processing status of uploaded book.

**Response:**
```json
{
  "id": "upload-uuid",
  "user_id": "user-uuid",
  "book_id": "book-uuid",
  "filename": "book.pdf",
  "file_size": 2048576,
  "file_type": "pdf",
  "status": "processing",
  "processing_steps": [
    {
      "step": "ai_detection",
      "status": "completed",
      "progress": 100
    },
    {
      "step": "text_preprocessing",
      "status": "processing",
      "progress": 45
    }
  ],
  "ai_known": false,
  "vector_count": null,
  "created_at": "2024-01-20T10:00:00Z"
}
```

#### 4. GET /uploads/my
Get list of user's uploaded books.

**Parameters:**
- `status`: Filter by status (pending, processing, completed, failed, all)
- `page`: Page number
- `limit`: Items per page

### Database Schema

```sql
-- uploads table
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    book_id UUID REFERENCES books(id),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_path TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    ai_known BOOLEAN,
    vector_count INTEGER,
    points_earned INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- upload_processing_steps table
CREATE TABLE upload_processing_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_details TEXT,

    INDEX idx_upload_id (upload_id),
    UNIQUE KEY unique_upload_step (upload_id, step_name)
);

-- extracted_content table
CREATE TABLE extracted_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    content_type VARCHAR(20), -- 'full_text', 'chapter', 'metadata'
    chapter_number INTEGER,
    chapter_title VARCHAR(255),
    content TEXT,
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_upload_id (upload_id),
    INDEX idx_content_type (content_type)
);
```

### Processing Pipeline

```python
class BookProcessingPipeline:
    """Complete book processing pipeline"""

    PROCESSING_STEPS = [
        'ai_detection',        # Check if AI knows the book
        'text_preprocessing',  # Extract and clean text
        'chapter_extraction',  # Identify chapters
        'character_extraction', # Extract characters
        'vectorization',       # Generate embeddings
        'indexing',           # Index for search
        'model_generation'    # Generate dialogue model
    ]

    async def process_upload(self, upload_id: str):
        """Main processing pipeline"""
        upload = await get_upload(upload_id)

        try:
            # Step 1: AI Detection
            await self.update_step(upload_id, 'ai_detection', 'processing')
            ai_known = await self.check_ai_knowledge(upload.title, upload.author)
            await self.update_step(upload_id, 'ai_detection', 'completed')

            if ai_known:
                # Fast track for AI-known books
                await self.process_ai_known_book(upload_id)
            else:
                # Full processing for unknown books
                await self.process_unknown_book(upload_id)

            # Mark upload as completed
            await self.complete_upload(upload_id)

        except Exception as e:
            await self.fail_upload(upload_id, str(e))
```

### Implementation Requirements

1. **File Processing**
   - Support TXT and PDF formats
   - Extract text with encoding detection
   - Handle Chinese text properly
   - Clean and normalize content

2. **Duplicate Detection**
   - Check by title + author combination
   - Fuzzy matching for similar titles
   - Check against AI knowledge base
   - Prevent duplicate uploads

3. **Vectorization Process**
   - Split text into chunks (500 tokens)
   - Generate embeddings for each chunk
   - Store in vector database
   - Create search indexes

4. **Progress Tracking**
   - Real-time status updates
   - Granular progress per step
   - Error recovery mechanisms
   - User notifications

## Acceptance Criteria

### Functional Requirements
- [ ] Files upload successfully (TXT and PDF)
- [ ] Duplicate books are detected
- [ ] Processing pipeline completes all steps
- [ ] Status updates are real-time
- [ ] Failed uploads show error details
- [ ] User can view their upload history

### Performance Requirements
- [ ] File upload completes within 10 seconds
- [ ] Processing starts within 30 seconds
- [ ] Status checks respond within 100ms
- [ ] Support concurrent uploads (10+)

### Security Requirements
- [ ] File size limit enforced (10MB)
- [ ] File type validation (TXT/PDF only)
- [ ] Virus scanning on uploads
- [ ] User quota limits enforced
- [ ] Secure file storage with encryption

## Test Cases

### Unit Tests
```python
def test_upload_check_duplicate():
    """Test duplicate book detection"""
    # Create existing book
    create_book(title="红楼梦", author="曹雪芹")

    response = client.post("/uploads/check", json={
        "title": "红楼梦",
        "author": "曹雪芹"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["exists"] == True
    assert data["book_id"] is not None

def test_file_upload():
    """Test book file upload"""
    with open("test_book.txt", "rb") as f:
        response = client.post("/uploads",
            files={"file": ("book.txt", f, "text/plain")},
            data={
                "title": "测试书籍",
                "author": "测试作者",
                "category": "fiction"
            }
        )

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "pending"
    assert "id" in data

def test_upload_status_tracking():
    """Test upload status updates"""
    upload_id = create_test_upload()

    response = client.get(f"/uploads/{upload_id}")
    assert response.status_code == 200

    data = response.json()
    assert "processing_steps" in data
    assert len(data["processing_steps"]) > 0

def test_file_size_limit():
    """Test file size validation"""
    large_file = io.BytesIO(b"x" * (11 * 1024 * 1024))  # 11MB

    response = client.post("/uploads",
        files={"file": ("large.txt", large_file, "text/plain")},
        data={"title": "Large Book", "author": "Author"}
    )

    assert response.status_code == 413
    assert "too large" in response.json()["message"].lower()
```

### Integration Tests
```python
async def test_complete_upload_pipeline():
    """Test complete upload and processing pipeline"""
    # 1. Check book doesn't exist
    check = client.post("/uploads/check", json={
        "title": "New Book",
        "author": "New Author"
    })
    assert check.json()["exists"] == False

    # 2. Upload file
    with open("sample_book.pdf", "rb") as f:
        upload = client.post("/uploads",
            files={"file": f},
            data={"title": "New Book", "author": "New Author"}
        )
    upload_id = upload.json()["id"]

    # 3. Wait for processing
    for _ in range(60):  # Max 60 seconds
        status = client.get(f"/uploads/{upload_id}")
        if status.json()["status"] == "completed":
            break
        await asyncio.sleep(1)

    # 4. Verify book is created
    final_status = client.get(f"/uploads/{upload_id}")
    assert final_status.json()["status"] == "completed"
    assert final_status.json()["book_id"] is not None

def test_ai_known_book_fast_track():
    """Test fast processing for AI-known books"""
    upload_id = upload_ai_known_book("1984", "George Orwell")

    # Should complete quickly
    time.sleep(5)

    status = client.get(f"/uploads/{upload_id}")
    assert status.json()["ai_known"] == True
    assert status.json()["status"] == "completed"
```

### Performance Tests
```python
def test_concurrent_uploads():
    """Test system handles multiple concurrent uploads"""
    files = [create_test_file(f"book_{i}.txt") for i in range(10)]

    upload_tasks = []
    for i, file in enumerate(files):
        task = async_upload_file(file, f"Book {i}", f"Author {i}")
        upload_tasks.append(task)

    results = await asyncio.gather(*upload_tasks)
    assert all(r.status_code == 202 for r in results)

def test_large_file_processing():
    """Test processing of maximum size file"""
    # Create 10MB file
    large_file = create_large_file(10 * 1024 * 1024)

    start = time.time()
    response = client.post("/uploads",
        files={"file": large_file},
        data={"title": "Large Book", "author": "Author"}
    )
    upload_time = time.time() - start

    assert response.status_code == 202
    assert upload_time < 10  # Should complete within 10 seconds
```

## Implementation Notes

### File Storage Strategy
```python
# File storage structure
UPLOAD_BASE_PATH = "/data/uploads"
PROCESSED_BASE_PATH = "/data/processed"

def get_upload_path(user_id: str, upload_id: str, filename: str) -> str:
    """Generate secure upload path"""
    date = datetime.now().strftime("%Y/%m/%d")
    return f"{UPLOAD_BASE_PATH}/{date}/{user_id}/{upload_id}/{filename}"
```

### Text Extraction
```python
async def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text from uploaded file"""
    if file_type == "txt":
        return await extract_from_txt(file_path)
    elif file_type == "pdf":
        return await extract_from_pdf(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

async def extract_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyPDF2"""
    import PyPDF2

    text = []
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text.append(page.extract_text())

    return '\n'.join(text)
```

### Vectorization Implementation
```python
async def vectorize_content(upload_id: str, content: str):
    """Generate embeddings for book content"""
    # Split into chunks
    chunks = split_into_chunks(content, max_tokens=500)

    # Generate embeddings
    embeddings = []
    for chunk in chunks:
        embedding = await generate_embedding(chunk)
        embeddings.append({
            'content': chunk,
            'embedding': embedding
        })

    # Store in vector database
    await store_embeddings(upload_id, embeddings)
```

### Background Processing
```python
# Celery task for async processing
@celery_task
def process_upload_task(upload_id: str):
    """Background task for processing upload"""
    pipeline = BookProcessingPipeline()
    asyncio.run(pipeline.process_upload(upload_id))
```

## Dependencies
- File storage system (S3 or local)
- PyPDF2 for PDF processing
- Celery for background tasks
- Vector database (pgvector)
- AI service for detection
- Redis for job queue

## Related Tasks
- ai-model-002: AI knowledge detection
- admin-004: Upload review and approval
- search-002: Integration with vectorized content