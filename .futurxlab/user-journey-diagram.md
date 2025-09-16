# User Journey Diagram - InKnowing Platform

## Business Logic Conservation Mapping
This diagram shows the complete user flow from discovery to paid usage, with each user action mapped to corresponding API endpoints.

```mermaid
journey
    title InKnowing User Journey - From Discovery to Paid Member
    section Discovery Phase
      Visit Platform: 5: Anonymous
      Search for Question: 4: Anonymous
      Browse Popular Books: 4: Anonymous
      View Book Details: 3: Anonymous
      Decide to Interact: 2: Anonymous

    section Registration/Login
      Click Register: 3: Anonymous
      Choose Phone/WeChat: 4: Anonymous
      Verify Code: 3: Anonymous
      Complete Registration: 5: Registered
      Login Success: 5: Registered

    section Free Tier Experience
      Start Book Dialogue: 5: Free User
      Send Messages: 5: Free User
      Try Character Chat: 4: Free User
      Reach Quota Limit: 2: Free User
      View Upgrade Options: 3: Free User

    section Upgrade Journey
      Select Membership Plan: 4: Free User
      Choose Payment Method: 4: Free User
      Complete Payment: 3: Free User
      Membership Activated: 5: Paid Member
      Access Enhanced Features: 5: Paid Member

    section Book Upload Flow
      Check Book Exists: 4: Paid Member
      Upload Book File: 3: Paid Member
      Monitor Processing: 3: Paid Member
      Book Available: 5: Paid Member
      Share with Community: 5: Paid Member
```

## Detailed User Journey with API Mappings

```mermaid
flowchart TB
    Start([Anonymous User]) --> Discover{Discovery Method}

    Discover -->|Question-Driven| Search[Search by Question<br/>API: GET /search?q=...]
    Discover -->|Book-Driven| Browse[Browse Books<br/>API: GET /books<br/>GET /books/popular]

    Search --> Results[View Search Results<br/>Relevance Scores]
    Browse --> BookList[View Book List<br/>Categories & Ratings]

    Results --> BookDetail[View Book Details<br/>API: GET /books/{bookId}]
    BookList --> BookDetail

    BookDetail --> Interact{Want to Interact?}

    Interact -->|No| Continue[Continue Browsing]
    Interact -->|Yes| AuthCheck{Authenticated?}

    AuthCheck -->|No| Register[Registration<br/>API: POST /auth/register]
    AuthCheck -->|Yes| StartDialogue

    Register --> VerifyCode[Verify Code<br/>API: POST /auth/verify-code]
    VerifyCode --> Login[Login<br/>API: POST /auth/login]

    Login --> UserProfile[Get Profile<br/>API: GET /users/profile]
    UserProfile --> QuotaCheck[Check Quota<br/>API: GET /users/quota]

    QuotaCheck --> StartDialogue{Start Dialogue}

    StartDialogue -->|Book Chat| BookChat[Start Book Dialogue<br/>API: POST /dialogues/book/start]
    StartDialogue -->|Character Chat| CharSelect[Select Character<br/>API: GET /books/{bookId}/characters]

    CharSelect --> CharChat[Start Character Dialogue<br/>API: POST /dialogues/character/start]

    BookChat --> Messaging[Send Messages<br/>API: POST /dialogues/{sessionId}/messages<br/>WS: /ws/dialogue/{sessionId}]
    CharChat --> Messaging

    Messaging --> QuotaUsed{Quota Status}

    QuotaUsed -->|Available| Messaging
    QuotaUsed -->|Exhausted| UpgradePrompt[Upgrade Prompt<br/>API: GET /users/membership]

    UpgradePrompt --> UpgradePlan[Select Plan<br/>API: POST /users/membership/upgrade]

    UpgradePlan --> Payment[Payment Process<br/>Payment Gateway]

    Payment --> PaymentCallback[Payment Callback<br/>API: POST /payment/callback/*]

    PaymentCallback --> MembershipActive[Membership Active<br/>API: GET /users/membership]

    MembershipActive --> EnhancedFeatures[Access Enhanced Features]

    EnhancedFeatures --> Upload{Upload Book?}

    Upload -->|Yes| CheckExists[Check Book Exists<br/>API: POST /uploads/check]
    Upload -->|No| ContinueChat[Continue Dialogues]

    CheckExists -->|Exists| UseExisting[Use Existing Book]
    CheckExists -->|Not Exists| UploadFile[Upload File<br/>API: POST /uploads]

    UploadFile --> Processing[Monitor Processing<br/>API: GET /uploads/{uploadId}]

    Processing -->|Processing| Processing
    Processing -->|Complete| BookReady[Book Ready<br/>Points Earned]

    BookReady --> ShareCommunity[Share with Community]

    style Start fill:#e1f5fe
    style MembershipActive fill:#c8e6c9
    style BookReady fill:#fff9c4
    style Payment fill:#ffccbc
```

## User State Transitions

```mermaid
stateDiagram-v2
    [*] --> Anonymous: Visit Platform

    Anonymous --> Exploring: Browse/Search
    Exploring --> Anonymous: No Action

    Anonymous --> Registering: Click Register
    Registering --> Registered: Complete Registration

    Registered --> Authenticated: Login Success

    Authenticated --> FreeUser: Default State

    FreeUser --> InDialogue: Start Dialogue
    InDialogue --> FreeUser: End Dialogue

    FreeUser --> QuotaExhausted: Use All Quota
    QuotaExhausted --> Upgrading: Choose Upgrade

    Upgrading --> PaymentPending: Initiate Payment
    PaymentPending --> PaidMember: Payment Success
    PaymentPending --> FreeUser: Payment Failed

    PaidMember --> InDialogue: Start Dialogue
    InDialogue --> PaidMember: End Dialogue

    PaidMember --> Uploading: Upload Book
    Uploading --> BookProcessing: File Uploaded
    BookProcessing --> BookPublished: Processing Complete
    BookProcessing --> UploadFailed: Processing Failed

    BookPublished --> PaidMember: Continue Usage
    UploadFailed --> PaidMember: Retry Option

    note right of Anonymous
        Entry point for all users
        Can browse and search
        Limited functionality
    end note

    note right of FreeUser
        20 dialogues/day limit
        Basic features only
        Can't upload books
    end note

    note right of PaidMember
        Enhanced quotas:
        - Basic: 200/month
        - Premium: 500/month
        - Super: 1000/month
        Can upload books
    end note
```

## API Endpoint Mapping to User Actions

| User Action | API Endpoint | Business Logic |
|------------|--------------|----------------|
| **Discovery Phase** |
| Search by question | GET /search?q={question} | Question → Book discovery |
| Browse books | GET /books | Book catalog exploration |
| View popular | GET /books/popular | Trending content discovery |
| Book details | GET /books/{bookId} | Detailed information retrieval |
| **Authentication** |
| Register | POST /auth/register | User account creation |
| Send verification | POST /auth/verify-code | Phone number verification |
| Login | POST /auth/login | Session establishment |
| Refresh token | POST /auth/refresh | Session maintenance |
| **Dialogue Experience** |
| Start book chat | POST /dialogues/book/start | Initialize AI conversation |
| Start character chat | POST /dialogues/character/start | Character roleplay session |
| Send message | POST /dialogues/{id}/messages | Conversation interaction |
| WebSocket chat | WS /ws/dialogue/{sessionId} | Real-time messaging |
| View history | GET /dialogues/history | Past conversations |
| **Membership** |
| Check quota | GET /users/quota | Usage monitoring |
| View membership | GET /users/membership | Status verification |
| Upgrade plan | POST /users/membership/upgrade | Payment initiation |
| Payment callback | POST /payment/callback/* | Payment confirmation |
| **Book Upload** |
| Check existence | POST /uploads/check | Duplicate prevention |
| Upload file | POST /uploads | Content contribution |
| Check status | GET /uploads/{uploadId} | Processing monitoring |
| View uploads | GET /uploads/my | Upload management |

## Business Logic Conservation Notes

1. **Complete Traceability**: Every user action maps to specific API endpoints
2. **State Consistency**: User state transitions are reflected in API responses
3. **Quota Management**: Built into dialogue initiation and message sending
4. **Progressive Enhancement**: Features unlock based on membership tier
5. **Async Processing**: Upload flow uses polling pattern for status updates