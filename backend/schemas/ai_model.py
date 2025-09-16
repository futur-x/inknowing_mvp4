"""
AI Model related schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, validator


class AIProvider(str, Enum):
    """AI provider types"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    QWEN = "qwen"
    BAIDU = "baidu"
    ZHIPU = "zhipu"
    OLLAMA = "ollama"


class ModelStatus(str, Enum):
    """Model status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


# ==================== AI Model Configuration ====================

class AIModelBase(BaseModel):
    """Base AI model configuration"""
    provider: AIProvider
    model: str
    api_endpoint: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AIModelCreate(AIModelBase):
    """Create AI model configuration"""
    api_key: str = Field(..., description="API key for the model")
    name: Optional[str] = Field(None, description="Custom name for the model")
    is_primary: bool = Field(default=False)
    is_backup: bool = Field(default=False)
    routing_rules: Dict[str, Any] = Field(default_factory=dict)


class AIModelUpdate(BaseModel):
    """Update AI model configuration"""
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    is_primary: Optional[bool] = None
    is_backup: Optional[bool] = None
    routing_rules: Optional[Dict[str, Any]] = None
    status: Optional[ModelStatus] = None


class AIModelResponse(AIModelBase):
    """AI model response"""
    id: str
    name: str
    api_key_configured: bool
    is_primary: bool
    is_backup: bool
    routing_rules: Dict[str, Any]
    status: ModelStatus
    last_health_check: Optional[datetime]
    average_latency_ms: Optional[float]
    monthly_cost: Optional[float]


class ModelConfig(BaseModel):
    """Complete model configuration"""
    primary_model: AIModelResponse
    backup_models: List[AIModelResponse] = []
    routing_rules: Dict[str, Any] = Field(default_factory=dict)
    embedding_model: Dict[str, Any] = Field(default_factory=dict)


class ModelConfigUpdate(BaseModel):
    """Update model configuration"""
    primary_model_id: Optional[str] = None
    backup_model_ids: Optional[List[str]] = None
    routing_rules: Optional[Dict[str, Any]] = None
    new_model: Optional[AIModelCreate] = None


class ModelTestRequest(BaseModel):
    """Test model connection"""
    provider: AIProvider
    model: str
    api_endpoint: str
    api_key: str
    test_prompt: str = Field(
        default="Hello, can you introduce yourself?",
        description="Test prompt"
    )


class ModelTestResult(BaseModel):
    """Model test result"""
    success: bool
    latency: float = Field(..., description="Response time in milliseconds")
    response: Optional[str] = None
    error: Optional[str] = None
    estimated_cost: float = Field(default=0.0)


class AICheckResult(BaseModel):
    """AI knowledge check result"""
    ai_knows_book: bool
    confidence: float = Field(..., ge=0, le=100)
    detected_content: Dict[str, List[str]] = Field(
        default_factory=lambda: {
            "chapters": [],
            "main_themes": [],
            "characters": []
        }
    )
    recommendation: str = Field(
        ...,
        pattern="^(use_ai_directly|needs_vectorization|manual_review_needed)$"
    )


# ==================== Cost Statistics ====================

class CostStatistics(BaseModel):
    """Cost statistics"""
    period: str
    total_cost: float
    breakdown: List[Dict[str, Any]]
    trend: List[Dict[str, Any]]
    projection: Dict[str, Any]


# ==================== Dialogue Schemas ====================

class DialogueSessionCreate(BaseModel):
    """Create dialogue session"""
    book_id: str
    initial_question: Optional[str] = None


class CharacterDialogueSessionCreate(BaseModel):
    """Create character dialogue session"""
    book_id: str
    character_id: str
    initial_message: Optional[str] = None


class DialogueSessionResponse(BaseModel):
    """Dialogue session response"""
    id: str
    book_id: str
    book_title: str
    type: str  # book or character
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    user_id: str
    message_count: int
    last_message_at: Optional[datetime]
    created_at: datetime
    status: str  # active, ended


class DialogueMessageCreate(BaseModel):
    """Send dialogue message"""
    message: str = Field(..., min_length=1, max_length=2000)


class DialogueMessageResponse(BaseModel):
    """Dialogue message response"""
    id: str
    session_id: str
    role: str  # user, assistant, system
    content: str
    references: List[Dict[str, Any]] = []
    timestamp: datetime
    tokens_used: int = 0
    model_used: str


class DialogueContextResponse(BaseModel):
    """Dialogue context response"""
    session_id: str
    book_context: Dict[str, Any]
    character_context: Optional[Dict[str, Any]] = None


class DialogueHistoryQuery(BaseModel):
    """Query dialogue history"""
    book_id: Optional[str] = None
    type: Optional[str] = None  # book or character
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=50)


# ==================== Streaming Response ====================

class StreamingConfig(BaseModel):
    """Streaming configuration"""
    enabled: bool = Field(default=True)
    chunk_size: int = Field(default=10, ge=1, le=100)
    include_metadata: bool = Field(default=False)


# ==================== Token Usage ====================

class TokenUsage(BaseModel):
    """Token usage information"""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    model: str
    provider: str


class TokenUsageStats(BaseModel):
    """Token usage statistics"""
    period: str
    total_tokens: int
    total_cost: float
    by_model: Dict[str, TokenUsage]
    by_feature: Dict[str, TokenUsage]
    by_user_tier: Dict[str, TokenUsage]


# ==================== Prompt Management ====================

class PromptTemplateCreate(BaseModel):
    """Create prompt template"""
    name: str
    category: str
    system_prompt: str
    user_prompt_template: str
    required_variables: List[str] = []
    optional_variables: List[str] = []
    default_values: Dict[str, Any] = {}
    preferred_models: List[str] = []
    model_parameters: Dict[str, Any] = {}


class PromptTemplateUpdate(BaseModel):
    """Update prompt template"""
    system_prompt: Optional[str] = None
    user_prompt_template: Optional[str] = None
    required_variables: Optional[List[str]] = None
    optional_variables: Optional[List[str]] = None
    default_values: Optional[Dict[str, Any]] = None
    preferred_models: Optional[List[str]] = None
    model_parameters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PromptTemplateResponse(BaseModel):
    """Prompt template response"""
    id: str
    name: str
    category: str
    system_prompt: str
    user_prompt_template: str
    required_variables: List[str]
    optional_variables: List[str]
    default_values: Dict[str, Any]
    preferred_models: List[str]
    model_parameters: Dict[str, Any]
    version: int
    is_active: bool
    usage_count: int
    average_rating: Optional[float]
    created_at: datetime
    updated_at: datetime


# ==================== Vector Database ====================

class VectorSearchQuery(BaseModel):
    """Vector search query"""
    query: str
    book_id: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=20)
    threshold: float = Field(default=0.7, ge=0, le=1)
    metadata_filter: Optional[Dict[str, Any]] = None


class VectorSearchResult(BaseModel):
    """Vector search result"""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float
    source: str  # chapter, page reference


class VectorIndexStatus(BaseModel):
    """Vector index status"""
    book_id: str
    total_chunks: int
    indexed_chunks: int
    status: str  # pending, indexing, completed, failed
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ==================== RAG (Retrieval Augmented Generation) ====================

class RAGConfig(BaseModel):
    """RAG configuration"""
    enabled: bool = Field(default=True)
    retrieval_model: str = Field(default="text-embedding-3-small")
    generation_model: str = Field(default="gpt-4")
    chunk_size: int = Field(default=500)
    chunk_overlap: int = Field(default=50)
    top_k: int = Field(default=5)
    temperature: float = Field(default=0.7, ge=0, le=2)


class RAGQuery(BaseModel):
    """RAG query"""
    query: str
    book_id: str
    config: Optional[RAGConfig] = None
    include_sources: bool = Field(default=True)


class RAGResponse(BaseModel):
    """RAG response"""
    answer: str
    sources: List[VectorSearchResult] = []
    tokens_used: TokenUsage
    latency_ms: int


# ==================== Fine-tuning ====================

class FineTuningDataset(BaseModel):
    """Fine-tuning dataset"""
    name: str
    description: str
    training_examples: List[Dict[str, str]]
    validation_examples: Optional[List[Dict[str, str]]] = None


class FineTuningJob(BaseModel):
    """Fine-tuning job"""
    id: str
    model: str
    dataset_id: str
    status: str  # pending, training, completed, failed
    progress: float
    created_at: datetime
    completed_at: Optional[datetime]
    result_model: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None