// API Response Types - InKnowing MVP 4.0
// Business Logic Conservation: Types match backend API specification exactly

// ==================== Authentication Types ====================
export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface AdminAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  admin: AdminUser
}

export interface PhoneRegistration {
  type: 'phone'
  phone: string
  code: string
  password?: string
}

export interface WeChatRegistration {
  type: 'wechat'
  code: string
}

export interface PhoneLogin {
  type: 'phone'
  phone: string
  password?: string
  code?: string
}

export interface WeChatLogin {
  type: 'wechat'
  code: string
}

// ==================== User Types ====================
export interface User {
  id: string
  username: string
  phone?: string | null
  wechat_openid?: string | null
  avatar?: string | null
  nickname: string
  membership: MembershipType
  points: number
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  username: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: string[]
}

export interface UserUpdate {
  nickname?: string
  avatar?: string
}

// ==================== Membership Types ====================
export type MembershipType = 'free' | 'basic' | 'premium' | 'super'

export interface Membership {
  type: MembershipType
  expires_at?: string | null
  quota_total: number
  quota_used: number
  quota_reset_at: string
  benefits: string[]
}

export interface MembershipUpgrade {
  plan: 'basic' | 'premium' | 'super'
  duration: 1 | 3 | 6 | 12
  payment_method: 'wechat' | 'alipay'
}

export interface Quota {
  total: number
  used: number
  remaining: number
  reset_at: string
}

// ==================== Book Types ====================
export interface Book {
  id: string
  title: string
  author: string
  cover?: string | null
  category: string
  description: string
  dialogue_count: number
  rating: number
  created_at: string
}

export interface BookDetail extends Book {
  type: 'ai_known' | 'vectorized'
  chapters: number
  estimated_reading_time: number
  characters: Character[]
  tags: string[]
  uploader?: {
    id: string
    nickname: string
  } | null
}

export interface BookCreate {
  title: string
  author: string
  type: 'ai_known' | 'needs_upload'
  category?: string
  description?: string
  cover_url?: string
  isbn?: string
  tags?: string[]
}

export interface BookUpdate {
  title?: string
  author?: string
  category?: string
  description?: string
  cover_url?: string
  status?: 'published' | 'draft' | 'offline'
  tags?: string[]
}

export interface BookList {
  books: Book[]
  pagination: Pagination
}

// ==================== Character Types ====================
export interface Character {
  id: string
  name: string
  alias: string[]
  description: string
  personality: string
  dialogue_count: number
  enabled: boolean
}

export interface AdminCharacter extends Character {
  personality_prompt: string
  dialogue_style: {
    language_style: 'elegant' | 'poetic' | 'modern' | 'casual'
    emotional_tone: 'melancholic' | 'cheerful' | 'serious' | 'rebellious'
    knowledge_scope: 'book_only' | 'extended'
  }
  key_memories: string[]
  example_dialogues: Array<{
    user_input: string
    character_response: string
  }>
  created_by: 'ai_extracted' | 'admin_created'
  created_at: string
  updated_at: string
}

export interface CharacterCreate {
  name: string
  alias?: string[]
  description: string
  personality?: string
  personality_prompt?: string
  dialogue_style?: AdminCharacter['dialogue_style']
  key_memories?: string[]
  example_dialogues?: AdminCharacter['example_dialogues']
  enabled?: boolean
}

export interface CharacterUpdate extends Partial<CharacterCreate> {}

// ==================== Dialogue Types ====================
export interface DialogueSession {
  id: string
  book_id: string
  book_title: string
  type: 'book' | 'character'
  character_id?: string | null
  character_name?: string | null
  user_id: string
  message_count: number
  last_message_at: string
  created_at: string
  status: 'active' | 'ended'
}

export interface DialogueMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  references: Reference[]
  timestamp: string
  tokens_used: number
  model_used: string
}

export interface DialogueContext {
  session_id: string
  book_context: {
    current_chapter?: string | null
    discussed_topics: string[]
    key_references: Reference[]
  }
  character_context?: {
    character_state: string
    emotional_tone: string
    remembered_facts: string[]
  } | null
}

export interface Reference {
  type: 'chapter' | 'page' | 'paragraph' | 'character_memory'
  chapter?: number | null
  page?: number | null
  text: string
  highlight: string
}

// ==================== Search Types ====================
export interface SearchResults {
  query: string
  type: 'question' | 'title' | 'author'
  results: Array<{
    book: Book
    relevance_score: number
    matched_chapters: Array<{
      chapter_number: number
      chapter_title: string
      preview: string
    }>
  }>
  total: number
  page: number
  limit: number
}

// ==================== Upload Types ====================
export interface Upload {
  id: string
  user_id: string
  book_id?: string | null
  filename: string
  file_size: number
  file_type: 'txt' | 'pdf'
  title: string
  author: string
  category?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_steps: Array<{
    step: 'ai_detection' | 'text_preprocessing' | 'chapter_extraction' | 'character_extraction' | 'vectorization' | 'indexing' | 'model_generation'
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    message?: string
  }>
  ai_known?: boolean | null
  vector_count?: number | null
  extracted_characters: string[]
  points_earned: number
  error_message?: string | null
  created_at: string
  completed_at?: string | null
}

// ==================== Payment Types ====================
export interface PaymentOrder {
  order_id: string
  user_id: string
  type: 'membership' | 'points'
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  payment_method: 'wechat' | 'alipay'
  payment_url: string
  expires_at: string
  created_at: string
  completed_at?: string | null
}

// ==================== Common Types ====================
export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ApiError {
  error: string
  message: string
  details?: Record<string, any> | null
  timestamp: string
}

// ==================== WebSocket Types ====================
export interface WebSocketMessage {
  type: 'message' | 'response' | 'typing' | 'error'
  content?: string
  isTyping?: boolean
  references?: Reference[]
  timestamp?: string
  message?: string
}

// ==================== Admin Types ====================
export interface DashboardStats {
  real_time: {
    online_users: number
    active_dialogues: number
    api_health: Record<string, {
      status: 'healthy' | 'degraded' | 'down'
      latency: number
    }>
  }
  today: {
    new_users: number
    total_dialogues: number
    new_books: number
    api_cost: number
    revenue: number
  }
  trending: {
    top_books: Array<{
      book_id: string
      title: string
      dialogue_count: number
    }>
    top_questions: Array<{
      question: string
      count: number
    }>
  }
}

// ==================== API Client Types ====================
export interface ApiClientConfig {
  baseURL: string
  timeout?: number
  retries?: number
}

export interface ApiResponse<T> {
  data: T
  status: number
  statusText: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

// ==================== Form Types ====================
export interface LoginFormData {
  type: 'phone' | 'wechat'
  phone?: string
  password?: string
  code?: string
  wechatCode?: string
}

export interface RegisterFormData {
  type: 'phone' | 'wechat'
  phone?: string
  code?: string
  password?: string
  wechatCode?: string
}

export interface BookUploadFormData {
  file: File
  title: string
  author: string
  category?: string
  description?: string
}

export interface MessageFormData {
  content: string
}

// ==================== Route Types ====================
export interface RouteParams {
  bookId?: string
  sessionId?: string
  characterId?: string
  uploadId?: string
  orderId?: string
}

export interface SearchParams {
  q?: string
  type?: 'question' | 'title' | 'author'
  category?: string
  sort?: 'popular' | 'newest' | 'most_discussed'
  page?: string
  limit?: string
}