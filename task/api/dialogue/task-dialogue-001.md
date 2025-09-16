# Task: DIALOGUE-001 - Implement Core Dialogue System

## Task Information
- **Task ID**: DIALOGUE-001
- **Title**: Implement Core Dialogue System with AI Integration
- **Priority**: P0-Critical
- **Module/Component**: Dialogue System
- **Estimated Hours**: 16-20 hours

## Description
Implement the core dialogue system that manages conversations between users and books/characters. This includes session management, message handling, context management, AI model integration, and real-time communication support.

## Technical Requirements

### 1. Dialogue Models
```typescript
interface DialogueSession {
  id: string;
  user_id: string;
  book_id: string;
  type: 'book' | 'character';
  character_id?: string;
  status: 'active' | 'ended' | 'expired';
  context: DialogueContext;
  message_count: number;
  tokens_used: number;
  model_used: string;
  created_at: Date;
  last_message_at: Date;
  ended_at?: Date;
}

interface DialogueMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  references?: Reference[];
  tokens_used: number;
  model_used?: string;
  processing_time?: number;
  created_at: Date;
}

interface DialogueContext {
  book_context: {
    current_chapter?: string;
    discussed_topics: string[];
    key_references: Reference[];
  };
  character_context?: {
    character_state: string;
    emotional_tone: string;
    remembered_facts: string[];
  };
  conversation_summary?: string;
  message_window: DialogueMessage[]; // Last N messages for context
}

interface Reference {
  type: 'chapter' | 'page' | 'paragraph' | 'character_memory';
  chapter?: number;
  page?: number;
  text: string;
  highlight?: string;
  relevance_score?: number;
}
```

### 2. Dialogue Service Interface
```typescript
interface DialogueService {
  // Session Management
  startBookDialogue(userId: string, bookId: string, initialQuestion?: string): Promise<DialogueSession>;
  startCharacterDialogue(userId: string, bookId: string, characterId: string, initialMessage?: string): Promise<DialogueSession>;
  getSession(sessionId: string): Promise<DialogueSession>;
  endSession(sessionId: string): Promise<void>;

  // Message Handling
  sendMessage(sessionId: string, message: string): Promise<DialogueMessage>;
  getMessages(sessionId: string, pagination: Pagination): Promise<DialogueMessage[]>;

  // Context Management
  getContext(sessionId: string): Promise<DialogueContext>;
  updateContext(sessionId: string, context: Partial<DialogueContext>): Promise<void>;

  // Real-time Support
  establishWebSocket(sessionId: string, ws: WebSocket): Promise<void>;
  handleWebSocketMessage(sessionId: string, message: any): Promise<void>;
}
```

### 3. AI Integration Layer
```typescript
interface AIIntegration {
  // Model Selection
  selectModel(session: DialogueSession): string;

  // Prompt Generation
  generateBookPrompt(context: DialogueContext, message: string): string;
  generateCharacterPrompt(character: Character, context: DialogueContext, message: string): string;

  // Response Processing
  processAIResponse(response: string): ProcessedResponse;
  extractReferences(response: string, bookContent: any): Reference[];

  // Streaming Support
  streamResponse(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
}
```

## Database Tables Required

### dialogue_sessions
```sql
CREATE TABLE dialogue_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  context JSONB NOT NULL DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  model_used VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,

  CONSTRAINT chk_type CHECK (type IN ('book', 'character')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'ended', 'expired')),

  INDEX idx_user_id (user_id),
  INDEX idx_book_id (book_id),
  INDEX idx_status (status),
  INDEX idx_last_message_at (last_message_at)
);
```

### dialogue_messages
```sql
CREATE TABLE dialogue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES dialogue_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  references JSONB,
  tokens_used INTEGER DEFAULT 0,
  model_used VARCHAR(100),
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_role CHECK (role IN ('user', 'assistant', 'system')),

  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);
```

### dialogue_quota_usage
```sql
CREATE TABLE dialogue_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES dialogue_sessions(id) ON DELETE SET NULL,
  messages_used INTEGER NOT NULL DEFAULT 1,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_period_type CHECK (period_type IN ('daily', 'monthly')),

  INDEX idx_user_period (user_id, period_type, period_start)
);
```

## API Endpoints
Based on api-specification.yaml:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dialogues/book/start` | POST | Start book dialogue |
| `/dialogues/character/start` | POST | Start character dialogue |
| `/dialogues/{sessionId}/messages` | POST | Send message |
| `/dialogues/{sessionId}/messages` | GET | Get message history |
| `/dialogues/{sessionId}/context` | GET | Get dialogue context |
| `/dialogues/history` | GET | Get user's dialogue history |
| `/ws/dialogue/{sessionId}` | WS | WebSocket for real-time chat |

## Acceptance Criteria
- [ ] Users can start dialogues with books and characters
- [ ] Quota is checked and enforced before starting/continuing
- [ ] Messages are processed through appropriate AI model
- [ ] Context is maintained throughout conversation
- [ ] References are extracted and linked to responses
- [ ] WebSocket provides real-time bidirectional communication
- [ ] Sessions expire after 30 minutes of inactivity
- [ ] Message history is preserved after session ends
- [ ] Character personalities are consistently maintained
- [ ] Token usage is tracked for cost calculation

## Test Cases

### Unit Tests
1. **Session Management**
   - Create book dialogue session
   - Create character dialogue session
   - End active session
   - Handle expired sessions

2. **Message Processing**
   - Send user message
   - Generate AI response
   - Extract references
   - Track token usage

3. **Quota Enforcement**
   - Check quota before message
   - Deduct quota after message
   - Block when quota exceeded

4. **Context Management**
   - Initialize context
   - Update context with messages
   - Maintain conversation summary

### Integration Tests
1. Complete dialogue flow: start → messages → end
2. WebSocket real-time communication
3. Context persistence across messages
4. Character personality consistency
5. Concurrent sessions for same user
6. Session recovery after disconnect

## AI Model Integration

### Prompt Templates
```typescript
// Book Dialogue Prompt
const BOOK_PROMPT = `
You are discussing the book "${book.title}" by ${book.author}.
Context: ${context.summary}
Recent discussion topics: ${context.discussed_topics}

User question: ${message}

Provide an insightful response based on the book's content.
Include specific references when possible.
`;

// Character Dialogue Prompt
const CHARACTER_PROMPT = `
You are ${character.name} from "${book.title}".
Character traits: ${character.personality}
Current emotional state: ${context.emotional_tone}
Remembered facts: ${context.remembered_facts}

User says: ${message}

Respond in character, maintaining personality and knowledge scope.
`;
```

## WebSocket Protocol
```typescript
// Client → Server
{
  "type": "message",
  "content": "User message text"
}

// Server → Client
{
  "type": "response",
  "content": "AI response text",
  "references": [...],
  "timestamp": "2024-01-20T10:30:00Z"
}

{
  "type": "typing",
  "isTyping": true
}

{
  "type": "error",
  "message": "Error description"
}
```

## Performance Requirements
- Message response time < 3 seconds (excluding AI processing)
- WebSocket latency < 100ms
- Support 1000 concurrent sessions
- Context retrieval < 200ms
- Message history pagination < 500ms

## Implementation Notes
1. Use Redis for session state caching
2. Implement message queuing for AI requests
3. Stream AI responses for better UX
4. Batch database writes for performance
5. Implement circuit breaker for AI service
6. Use connection pooling for WebSocket
7. Archive old sessions to cold storage

## Error Handling
| Error Case | Status Code | Response |
|------------|-------------|----------|
| Session not found | 404 | `{error: "SESSION_NOT_FOUND", message: "Dialogue session not found"}` |
| Quota exceeded | 403 | `{error: "QUOTA_EXCEEDED", message: "Dialogue quota exceeded"}` |
| AI service error | 503 | `{error: "AI_UNAVAILABLE", message: "AI service temporarily unavailable"}` |
| Session expired | 410 | `{error: "SESSION_EXPIRED", message: "Session has expired"}` |
| Invalid message | 400 | `{error: "INVALID_MESSAGE", message: "Message content invalid"}` |

## Related Tasks
- AI-001: AI Model Integration
- AI-002: Vector Search Implementation
- USER-003: Quota Management
- BOOK-001: Book Data Management
- CHARACTER-001: Character Management
- WEBSOCKET-001: WebSocket Infrastructure