# System Sequence Diagrams - InKnowing Platform

## Business Logic Conservation Mapping
These sequence diagrams show the temporal flow of API calls for key system processes.

## 1. User Search and Dialogue Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant API as API Gateway
    participant Auth as Auth Service
    participant Search as Search Service
    participant Book as Book Service
    participant Dialogue as Dialogue Service
    participant AI as AI Model
    participant Vector as Vector DB

    %% Search Flow
    U->>C: Enter question
    C->>API: GET /search?q={question}
    API->>Search: Process query
    Search->>Vector: Semantic search
    Vector-->>Search: Relevant books
    Search->>AI: Rank by relevance
    AI-->>Search: Scored results
    Search-->>API: Search results
    API-->>C: Display results
    C-->>U: Show books

    %% Select Book
    U->>C: Select book
    C->>API: GET /books/{bookId}
    API->>Book: Get book details
    Book-->>API: Book info + characters
    API-->>C: Book details
    C-->>U: Display book page

    %% Authentication Check
    U->>C: Start dialogue
    C->>API: POST /dialogues/book/start
    API->>Auth: Verify JWT token

    alt Not authenticated
        Auth-->>API: 401 Unauthorized
        API-->>C: Redirect to login
        C-->>U: Show login screen
        U->>C: Enter credentials
        C->>API: POST /auth/login
        API->>Auth: Validate credentials
        Auth-->>API: JWT tokens
        API-->>C: Auth response
        C->>C: Store tokens
    else Authenticated
        Auth-->>API: User verified
    end

    %% Quota Check
    API->>Dialogue: Check user quota

    alt Quota exceeded
        Dialogue-->>API: 403 Quota exceeded
        API-->>C: Upgrade required
        C-->>U: Show upgrade options
    else Quota available
        Dialogue->>Dialogue: Create session
        Dialogue->>AI: Initialize context
        AI-->>Dialogue: Ready
        Dialogue-->>API: Session created
        API-->>C: Session ID + initial response
        C-->>U: Start conversation
    end

    %% Message Exchange
    loop Conversation
        U->>C: Type message
        C->>API: POST /dialogues/{sessionId}/messages
        API->>Auth: Verify token
        Auth-->>API: Authorized
        API->>Dialogue: Process message
        Dialogue->>Vector: Get relevant context
        Vector-->>Dialogue: Book excerpts
        Dialogue->>AI: Generate response
        AI-->>Dialogue: AI response
        Dialogue->>Dialogue: Update session
        Dialogue->>Dialogue: Deduct quota
        Dialogue-->>API: Response + references
        API-->>C: Message response
        C-->>U: Display response
    end

    %% WebSocket Alternative
    note over C,API: Alternative: Real-time via WebSocket
    C->>API: WS /ws/dialogue/{sessionId}
    API->>Dialogue: Establish connection

    loop Real-time chat
        U->>C: Type message
        C->>API: WS: {type: "message", content: "..."}
        API->>Dialogue: Process in real-time
        Dialogue->>AI: Stream response
        AI-->>Dialogue: Chunks
        Dialogue-->>API: WS: {type: "response", content: "..."}
        API-->>C: Stream response
        C-->>U: Display incrementally
    end
```

## 2. Book Upload and Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant API as API Gateway
    participant Auth as Auth Service
    participant Upload as Upload Service
    participant Storage as File Storage
    participant AI as AI Model
    participant Vector as Vector Service
    participant Book as Book Service
    participant Queue as Task Queue

    %% Pre-upload Check
    U->>C: Select book to upload
    C->>C: Extract title/author
    C->>API: POST /uploads/check
    API->>Auth: Verify user (paid member)
    Auth-->>API: Authorized
    API->>Book: Check existence

    alt Book exists
        Book-->>API: Book found
        API-->>C: {exists: true, book_id: "..."}
        C-->>U: Book already available
    else Book not exists
        Book-->>API: Not found
        API->>AI: Check AI knowledge
        AI-->>API: AI knowledge status
        API-->>C: {exists: false, ai_known: boolean}
        C-->>U: Ready to upload
    end

    %% File Upload
    U->>C: Select file (TXT/PDF)
    C->>C: Validate file (<10MB)
    C->>API: POST /uploads (multipart)
    API->>Auth: Verify quota
    Auth-->>API: Authorized
    API->>Upload: Process upload
    Upload->>Storage: Store file
    Storage-->>Upload: File ID
    Upload->>Queue: Queue processing job
    Queue-->>Upload: Job ID
    Upload-->>API: {upload_id: "...", status: "pending"}
    API-->>C: Upload accepted
    C-->>U: Show processing status

    %% Async Processing
    Queue->>Upload: Start processing

    par AI Detection
        Upload->>AI: Detect book knowledge
        AI-->>Upload: Knowledge assessment
    and Text Processing
        Upload->>Upload: Extract text
        Upload->>Upload: Clean & normalize
    and Chapter Extraction
        Upload->>AI: Extract chapters
        AI-->>Upload: Chapter structure
    end

    Upload->>Upload: Update status: "processing"

    %% Character Extraction
    Upload->>AI: Extract characters
    AI-->>Upload: Character list + descriptions
    Upload->>AI: Generate character prompts
    AI-->>Upload: Character personalities

    %% Vectorization (if needed)
    alt Book not AI-known
        Upload->>Vector: Chunk text
        Vector->>Vector: Generate embeddings
        Vector->>Vector: Store in vector DB
        Vector-->>Upload: Vector count
    end

    %% Book Creation
    Upload->>Book: Create book entry
    Book->>Book: Store metadata
    Book->>Book: Add characters
    Book-->>Upload: Book ID

    %% Completion
    Upload->>Upload: Update status: "completed"
    Upload->>Upload: Award points to user
    Upload->>Queue: Notify completion

    %% Status Polling
    loop Until complete
        C->>API: GET /uploads/{uploadId}
        API->>Upload: Get status
        Upload-->>API: Current status + progress
        API-->>C: Status response
        C-->>U: Update progress bar
        Note over C: Wait 2 seconds
    end

    C-->>U: Upload complete!
```

## 3. Admin Book Creation Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant Portal as Admin Portal
    participant API as API Gateway
    participant Auth as Auth Service
    participant Book as Book Service
    participant AI as AI Model
    participant Vector as Vector Service
    participant Char as Character Service

    %% Admin Authentication
    A->>Portal: Login to admin
    Portal->>API: POST /admin/login
    API->>Auth: Validate admin credentials
    Auth-->>API: Admin JWT token
    API-->>Portal: Admin session
    Portal-->>A: Dashboard access

    %% Check AI Knowledge
    A->>Portal: Enter book info
    Portal->>API: POST /admin/books/ai-check
    API->>Auth: Verify admin token
    Auth-->>API: Authorized
    API->>AI: Check book knowledge
    AI->>AI: Test with prompts
    AI-->>API: {ai_knows_book: true, confidence: 95}
    API-->>Portal: AI check result
    Portal-->>A: Show AI status

    %% Create Book
    A->>Portal: Fill book details
    Portal->>API: POST /admin/books
    API->>Auth: Verify admin
    Auth-->>API: Authorized
    API->>Book: Create book entry

    alt AI-known book
        Book->>AI: Auto-detect content
        AI-->>Book: Chapters, themes
        Book->>Char: Extract characters
        Char->>AI: Generate character profiles
        AI-->>Char: Character list
        Char->>Char: Store characters
    else Needs upload
        Book->>Book: Mark for upload
        Book->>Book: Set status: "draft"
    end

    Book-->>API: Book created
    API-->>Portal: Book details
    Portal-->>A: Success message

    %% Character Management
    A->>Portal: Review characters
    Portal->>API: GET /admin/books/{bookId}/characters
    API->>Char: Get character list
    Char-->>API: Characters
    API-->>Portal: Character data
    Portal-->>A: Display characters

    A->>Portal: Edit character
    Portal->>API: PUT /admin/books/{bookId}/characters/{charId}
    API->>Char: Update character
    Char->>AI: Refine personality prompt
    AI-->>Char: Enhanced prompt
    Char-->>API: Updated
    API-->>Portal: Success
    Portal-->>A: Character updated

    %% Review User Upload
    A->>Portal: View pending uploads
    Portal->>API: GET /admin/books?status=review
    API->>Book: Get review queue
    Book-->>API: Pending books
    API-->>Portal: Book list
    Portal-->>A: Show pending

    A->>Portal: Review book
    Portal->>API: POST /admin/books/{bookId}/review
    API->>Book: Process review

    alt Approve
        Book->>Book: Set status: "published"
        Book->>Vector: Trigger vectorization
        Vector-->>Book: Processing started
    else Reject
        Book->>Book: Set status: "rejected"
        Book->>Book: Add rejection reason
    end

    Book-->>API: Review complete
    API-->>Portal: Status updated
    Portal-->>A: Review saved
```

## 4. Payment Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant API as API Gateway
    participant Auth as Auth Service
    participant Member as Membership Service
    participant Pay as Payment Service
    participant GW as Payment Gateway
    participant Webhook as Webhook Handler

    %% Initiate Upgrade
    U->>C: View membership plans
    C->>API: GET /users/membership
    API->>Auth: Verify user
    Auth-->>API: User verified
    API->>Member: Get current status
    Member-->>API: Current membership
    API-->>C: Membership info
    C-->>U: Show upgrade options

    %% Select Plan
    U->>C: Select plan (Basic/Premium/Super)
    U->>C: Choose duration (1/3/6/12 months)
    U->>C: Select payment method
    C->>API: POST /users/membership/upgrade
    API->>Auth: Verify user
    Auth-->>API: Authorized
    API->>Member: Calculate price
    Member-->>API: Price details
    API->>Pay: Create order
    Pay->>Pay: Generate order ID
    Pay->>GW: Initialize payment

    alt WeChat Pay
        GW-->>Pay: WeChat QR code
    else Alipay
        GW-->>Pay: Alipay URL
    end

    Pay-->>API: Payment order
    API-->>C: {order_id, payment_url, expires_at}
    C-->>U: Display payment QR/URL

    %% User Payment
    U->>GW: Scan QR/Click link
    GW-->>U: Payment page
    U->>GW: Confirm payment
    GW->>GW: Process payment

    %% Async Callback
    GW->>Webhook: POST /payment/callback/wechat
    Webhook->>Pay: Verify signature
    Pay->>Pay: Validate callback
    Pay->>Member: Update membership
    Member->>Member: Set new tier
    Member->>Member: Reset quota
    Member->>Member: Set expiry date
    Member-->>Pay: Updated
    Pay-->>Webhook: Success
    Webhook-->>GW: 200 OK

    %% Status Polling
    loop Check payment status
        C->>API: GET /payment/orders/{orderId}
        API->>Pay: Get order status
        Pay-->>API: Order status
        API-->>C: Status response

        alt Payment complete
            C->>API: GET /users/membership
            API->>Member: Get updated status
            Member-->>API: New membership
            API-->>C: Membership active
            C-->>U: Success! Membership upgraded
        else Still pending
            C-->>U: Waiting for payment...
            Note over C: Wait 3 seconds
        else Payment failed
            C-->>U: Payment failed
        end
    end

    %% Quota Reset
    Note over Member: Daily/Monthly quota reset job
    Member->>Member: Check reset schedule
    alt Reset time reached
        Member->>Member: Reset all user quotas
        Member->>Member: Log reset event
    end
```

## API Call Sequences Summary

| Flow | Key API Sequence | Business Logic |
|------|-----------------|----------------|
| **Question Search** | `/search` → `/books/{id}` → `/dialogues/book/start` → `/dialogues/{id}/messages` | Discovery → Selection → Interaction |
| **Character Chat** | `/books/{id}/characters` → `/dialogues/character/start` → `/ws/dialogue/{id}` | Character selection → Immersive dialogue |
| **Book Upload** | `/uploads/check` → `/uploads` → `/uploads/{id}` (polling) | Duplicate check → Processing → Availability |
| **Admin Creation** | `/admin/books/ai-check` → `/admin/books` → `/admin/books/{id}/characters` | AI detection → Creation → Character setup |
| **Payment Flow** | `/users/membership/upgrade` → `/payment/callback/*` → `/users/membership` | Order → Payment → Activation |

## Business Logic Conservation Notes

1. **Temporal Consistency**: API calls follow logical time sequence
2. **State Verification**: Each step validates prerequisites (auth, quota, permissions)
3. **Async Patterns**: Long-running operations use polling or webhooks
4. **Error Handling**: Each interaction includes failure paths
5. **Resource Optimization**: WebSocket for real-time, REST for transactional