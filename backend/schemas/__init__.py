"""
Pydantic schemas for request/response validation
"""

from .auth import (
    PhoneLogin,
    WeChatLogin,
    PhoneRegistration,
    WeChatRegistration,
    RefreshTokenRequest,
    TokenResponse,
    UserProfileResponse,
    SendSMSCodeRequest,
    SendSMSCodeResponse
)
from .user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserProfile,
    MembershipResponse
)
from .book import (
    BookResponse,
    BookDetail,
    BookCreate,
    BookUpdate,
    CharacterResponse
)
# from .dialogue import (
#     CreateSessionRequest,
#     DialogueSession,
#     SendMessageRequest,
#     DialogueMessage
# )
from .upload import (
    BookCheckRequest,
    BookCheckResponse,
    UploadResponse,
    UploadListResponse,
    UploadCreate,
    UploadUpdate,
    UploadFilters,
    FileUploadMetadata
)
from .payment import (
    CreatePaymentRequest,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
    ProcessRefundRequest,
    AddPaymentMethodRequest,
    PurchasePointsRequest,
    PaymentResponse,
    SubscriptionResponse,
    PaymentMethodResponse,
    PointsTransactionResponse,
    PaymentListResponse,
    TransactionHistoryResponse,
    PaymentMethodListResponse,
    SubscriptionPriceResponse,
    PointsPackageResponse,
    PaymentStatsResponse,
    PaymentClientTokenResponse
)
from .monitoring import (
    EnhancedDashboardStats,
    EnhancedCostStatistics,
    EnhancedDialogueStatistics,
    SystemAlertCreate,
    SystemAlertUpdate,
    SystemAlertResponse,
    AlertsListResponse,
    SystemHealthResponse,
    MetricsCollectionRequest,
    MetricsQueryRequest,
    MetricsQueryResponse
)

__all__ = [
    # Auth
    "PhoneLogin",
    "WeChatLogin",
    "PhoneRegistration",
    "WeChatRegistration",
    "RefreshTokenRequest",
    "TokenResponse",
    "UserProfileResponse",
    "SendSMSCodeRequest",
    "SendSMSCodeResponse",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserProfile",
    "MembershipResponse",
    # Book
    "BookResponse",
    "BookDetail",
    "BookCreate",
    "BookUpdate",
    "CharacterResponse",
    # Dialogue
    # "CreateSessionRequest",
    # "DialogueSession",
    # "SendMessageRequest",
    # "DialogueMessage",
    # Upload
    "BookCheckRequest",
    "BookCheckResponse",
    "UploadResponse",
    "UploadListResponse",
    "UploadCreate",
    "UploadUpdate",
    "UploadFilters",
    "FileUploadMetadata",
    # Payment
    "CreatePaymentRequest",
    "CreateSubscriptionRequest",
    "UpdateSubscriptionRequest",
    "CancelSubscriptionRequest",
    "ProcessRefundRequest",
    "AddPaymentMethodRequest",
    "PurchasePointsRequest",
    "PaymentResponse",
    "SubscriptionResponse",
    "PaymentMethodResponse",
    "PointsTransactionResponse",
    "PaymentListResponse",
    "TransactionHistoryResponse",
    "PaymentMethodListResponse",
    "SubscriptionPriceResponse",
    "PointsPackageResponse",
    "PaymentStatsResponse",
    "PaymentClientTokenResponse",
    # Monitoring
    "EnhancedDashboardStats",
    "EnhancedCostStatistics",
    "EnhancedDialogueStatistics",
    "SystemAlertCreate",
    "SystemAlertUpdate",
    "SystemAlertResponse",
    "AlertsListResponse",
    "SystemHealthResponse",
    "MetricsCollectionRequest",
    "MetricsQueryRequest",
    "MetricsQueryResponse",
]