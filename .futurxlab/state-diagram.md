# State Diagrams - InKnowing Platform

## Business Logic Conservation Mapping
These state diagrams show system state transitions with complete API endpoint mapping.

## 1. User State Transitions

```mermaid
stateDiagram-v2
    [*] --> Anonymous: Platform Visit

    state Anonymous {
        [*] --> Browsing
        Browsing --> Searching: GET /search
        Searching --> ViewingResults: Results returned
        ViewingResults --> ViewingBook: GET /books/{id}
        ViewingBook --> Browsing: Back
        ViewingBook --> NeedAuth: Start dialogue
    }

    Anonymous --> Registering: POST /auth/register

    state Registering {
        [*] --> InfoEntry
        InfoEntry --> CodeSent: POST /auth/verify-code
        CodeSent --> CodeVerified: Code valid
        CodeVerified --> AccountCreated: Success
        AccountCreated --> [*]
    }

    Registering --> Authenticated: POST /auth/login
    Anonymous --> Authenticated: POST /auth/login

    state Authenticated {
        [*] --> FreeUser

        state FreeUser {
            [*] --> Active
            Active --> QuotaCheck: GET /users/quota
            QuotaCheck --> HasQuota: quota > 0
            QuotaCheck --> NoQuota: quota = 0
            HasQuota --> InDialogue: POST /dialogues/*/start
            NoQuota --> UpgradePrompt: Show plans
        }

        FreeUser --> Upgrading: POST /users/membership/upgrade

        state Upgrading {
            [*] --> PlanSelected
            PlanSelected --> PaymentPending: Order created
            PaymentPending --> PaymentProcessing: User pays
            PaymentProcessing --> PaymentComplete: Callback received
            PaymentComplete --> [*]: Success
            PaymentProcessing --> PaymentFailed: Timeout/Cancel
            PaymentFailed --> [*]: Failed
        }

        Upgrading --> PaidMember: Payment success

        state PaidMember {
            [*] --> Active
            Active --> EnhancedQuota: Higher limits
            EnhancedQuota --> InDialogue: POST /dialogues/*/start
            Active --> CanUpload: Upload enabled

            state CanUpload {
                [*] --> Ready
                Ready --> Uploading: POST /uploads
                Uploading --> Processing: Accepted
                Processing --> Complete: Success
                Processing --> Failed: Error
                Complete --> [*]
                Failed --> [*]
            }
        }
    }

    state InDialogue {
        [*] --> DialogueActive
        DialogueActive --> Messaging: POST /messages
        Messaging --> WaitingResponse: Processing
        WaitingResponse --> ResponseReceived: AI responds
        ResponseReceived --> Messaging: Continue
        ResponseReceived --> DialogueEnded: End chat
        DialogueEnded --> [*]
    }

    Authenticated --> SessionExpired: Token expired
    SessionExpired --> Anonymous: Logout
    SessionExpired --> Authenticated: POST /auth/refresh

    note right of Anonymous
        No authentication required
        Limited to browsing/searching
        API: Public endpoints only
    end note

    note right of FreeUser
        Default after registration
        20 dialogues/day limit
        API: GET /users/quota
    end note

    note right of PaidMember
        Enhanced quotas by tier:
        - Basic: 200/month
        - Premium: 500/month
        - Super: 1000/month
        Can upload books
    end note
```

## 2. Book State Transitions

```mermaid
stateDiagram-v2
    [*] --> Draft: Book created

    state Draft {
        [*] --> MetadataOnly
        MetadataOnly --> AIChecked: POST /admin/books/ai-check
        AIChecked --> AIKnown: AI has knowledge
        AIChecked --> NeedsContent: AI unknown
        NeedsContent --> ContentAdded: File uploaded
        ContentAdded --> [*]
    }

    Draft --> Processing: Trigger processing

    state Processing {
        [*] --> AIDetection
        AIDetection --> TextExtraction: Extract text
        TextExtraction --> ChapterParsing: Parse structure
        ChapterParsing --> CharacterExtraction: Find characters
        CharacterExtraction --> Vectorization: If needed
        Vectorization --> Indexing: Store vectors
        Indexing --> ModelGeneration: Prepare AI
        ModelGeneration --> [*]: Complete

        AIDetection --> ProcessingFailed: Error
        TextExtraction --> ProcessingFailed: Error
        ChapterParsing --> ProcessingFailed: Error
        CharacterExtraction --> ProcessingFailed: Error
        Vectorization --> ProcessingFailed: Error
        Indexing --> ProcessingFailed: Error
        ModelGeneration --> ProcessingFailed: Error
    }

    Processing --> Published: Admin approval
    Processing --> ReviewPending: User upload

    state ReviewPending {
        [*] --> AwaitingReview
        AwaitingReview --> UnderReview: Admin views
        UnderReview --> Approved: POST /admin/books/{id}/review
        UnderReview --> Rejected: Reject with reason
        UnderReview --> ChangesRequested: Need modifications
        Approved --> [*]
        Rejected --> [*]
        ChangesRequested --> [*]
    }

    ReviewPending --> Published: Approved
    ReviewPending --> Rejected: Denied

    state Published {
        [*] --> Available
        Available --> BeingRead: Dialogues active
        BeingRead --> Popular: High engagement
        Popular --> Trending: Top activity
        Available --> Offline: Admin action
        Offline --> Available: Restore
    }

    state Rejected {
        [*] --> Final
        Final --> Draft: Resubmit
    }

    ProcessingFailed --> Draft: Retry

    note right of Draft
        Initial state for all books
        API: POST /admin/books
        Can be AI-known or uploaded
    end note

    note right of Processing
        Async processing pipeline
        API: GET /uploads/{id}
        Updates via status polling
    end note

    note right of Published
        Available for dialogues
        API: GET /books
        Tracks engagement metrics
    end note
```

## 3. Dialogue State Transitions

```mermaid
stateDiagram-v2
    [*] --> Idle: No dialogue

    Idle --> Initializing: POST /dialogues/*/start

    state Initializing {
        [*] --> ValidatingUser
        ValidatingUser --> CheckingQuota: Authenticated
        CheckingQuota --> QuotaAvailable: Has quota
        CheckingQuota --> QuotaExceeded: No quota
        QuotaAvailable --> LoadingContext: Proceed
        LoadingContext --> PreparingAI: Book/Character data
        PreparingAI --> Ready: AI initialized
        QuotaExceeded --> [*]: Blocked
        Ready --> [*]: Success
    }

    Initializing --> Active: Session created
    Initializing --> Failed: Error/No quota

    state Active {
        [*] --> WaitingInput
        WaitingInput --> Processing: POST /messages

        state Processing {
            [*] --> ValidatingMessage
            ValidatingMessage --> FetchingContext: Valid
            FetchingContext --> GeneratingResponse: Vector search
            GeneratingResponse --> Streaming: AI processing
            Streaming --> [*]: Complete
        }

        Processing --> ResponseSent: Message sent
        ResponseSent --> WaitingInput: Continue
        ResponseSent --> Ending: User ends

        state WebSocketMode {
            [*] --> Connected
            Connected --> Typing: User types
            Typing --> Sending: Send message
            Sending --> Receiving: AI responds
            Receiving --> Connected: Continue
            Connected --> Disconnected: Connection lost
            Disconnected --> Reconnecting: Auto-retry
            Reconnecting --> Connected: Success
        }
    }

    Active --> Completed: Session ends
    Active --> Expired: Timeout (30 min)

    state Completed {
        [*] --> Saved
        Saved --> Accessible: GET /dialogues/history
        Accessible --> Archived: After 30 days
    }

    state Expired {
        [*] --> AutoSaved
        AutoSaved --> CanResume: Within 24h
        AutoSaved --> Archived: After 24h
        CanResume --> Active: Resume
    }

    Failed --> Idle: Retry

    note right of Active
        Real-time interaction
        API: POST /dialogues/{id}/messages
        WS: /ws/dialogue/{id}
        Quota deducted per message
    end note

    note right of Completed
        Session history preserved
        API: GET /dialogues/history
        Context available for analysis
    end note
```

## 4. Upload State Transitions

```mermaid
stateDiagram-v2
    [*] --> Ready: User on upload page

    Ready --> Checking: POST /uploads/check

    state Checking {
        [*] --> QueryingDB
        QueryingDB --> BookExists: Found
        QueryingDB --> BookNew: Not found
        BookExists --> [*]: Use existing
        BookNew --> CheckingAI: Check AI
        CheckingAI --> AIKnows: AI has it
        CheckingAI --> NeedUpload: AI doesn't know
        AIKnows --> [*]: Suggest AI mode
        NeedUpload --> [*]: Proceed upload
    }

    Checking --> Uploading: Proceed
    Checking --> Aborted: Book exists

    state Uploading {
        [*] --> SelectingFile
        SelectingFile --> ValidatingFile: File chosen
        ValidatingFile --> FileValid: Pass checks
        ValidatingFile --> FileInvalid: Fail checks
        FileValid --> Transmitting: POST /uploads
        Transmitting --> [*]: Complete
        FileInvalid --> SelectingFile: Retry
    }

    Uploading --> Processing: File received

    state Processing {
        [*] --> Pending
        Pending --> AIDetection: Start

        state AIDetection {
            [*] --> TestingKnowledge
            TestingKnowledge --> Known: AI recognizes
            TestingKnowledge --> Unknown: AI doesn't know
            Known --> [*]: Skip vectorization
            Unknown --> [*]: Need vectorization
        }

        AIDetection --> TextProcessing

        state TextProcessing {
            [*] --> Extracting
            Extracting --> Cleaning: Raw text
            Cleaning --> Normalizing: Clean text
            Normalizing --> [*]: Ready
        }

        TextProcessing --> ChapterExtraction

        state ChapterExtraction {
            [*] --> Parsing
            Parsing --> Structuring: Find chapters
            Structuring --> [*]: Chapters ready
        }

        ChapterExtraction --> CharacterExtraction

        state CharacterExtraction {
            [*] --> Analyzing
            Analyzing --> Identifying: Find names
            Identifying --> Profiling: Build profiles
            Profiling --> [*]: Characters ready
        }

        CharacterExtraction --> Vectorization

        state Vectorization {
            [*] --> Chunking
            Chunking --> Embedding: Create chunks
            Embedding --> Storing: Generate vectors
            Storing --> [*]: Indexed
        }

        Vectorization --> Finalizing
        Finalizing --> [*]: Complete
    }

    Processing --> Completed: Success
    Processing --> Failed: Error

    state Completed {
        [*] --> BookCreated
        BookCreated --> PointsAwarded: Reward user
        PointsAwarded --> Available: Book live
    }

    state Failed {
        [*] --> ErrorLogged
        ErrorLogged --> CanRetry: User notified
        CanRetry --> Ready: Try again
    }

    note right of Processing
        Async pipeline
        API: GET /uploads/{id}
        Status updates via polling
        Each step logged
    end note

    note right of Completed
        Book available immediately
        Points added to user account
        Upload history preserved
    end note
```

## 5. Payment State Transitions

```mermaid
stateDiagram-v2
    [*] --> NoPayment: Free user

    NoPayment --> InitiatingUpgrade: POST /users/membership/upgrade

    state InitiatingUpgrade {
        [*] --> SelectingPlan
        SelectingPlan --> ChoosingDuration: Plan chosen
        ChoosingDuration --> SelectingMethod: Duration set
        SelectingMethod --> CreatingOrder: Method selected
        CreatingOrder --> [*]: Order created
    }

    InitiatingUpgrade --> PaymentPending: Order created

    state PaymentPending {
        [*] --> DisplayingQR
        DisplayingQR --> WaitingForScan: QR shown
        WaitingForScan --> UserScanned: Scan detected
        UserScanned --> [*]: Proceed to pay
        DisplayingQR --> Timeout: 15 min expire
        Timeout --> [*]: Order expired
    }

    PaymentPending --> PaymentProcessing: User initiated
    PaymentPending --> PaymentExpired: Timeout

    state PaymentProcessing {
        [*] --> GatewayProcessing
        GatewayProcessing --> Authorizing: Payment sent
        Authorizing --> Capturing: Authorized
        Capturing --> [*]: Success
        Authorizing --> Declined: Failed
        Declined --> [*]: Rejected
    }

    PaymentProcessing --> PaymentCompleted: Success
    PaymentProcessing --> PaymentFailed: Failed

    state PaymentCompleted {
        [*] --> CallbackReceived
        CallbackReceived --> VerifyingSignature: POST /payment/callback
        VerifyingSignature --> UpdatingMembership: Valid
        UpdatingMembership --> ResettingQuota: Tier changed
        ResettingQuota --> NotifyingUser: Quota set
        NotifyingUser --> [*]: Complete
    }

    PaymentCompleted --> MembershipActive: Upgraded

    state MembershipActive {
        [*] --> BasicTier: Basic plan
        [*] --> PremiumTier: Premium plan
        [*] --> SuperTier: Super plan

        BasicTier --> Expiring: Near expiry
        PremiumTier --> Expiring: Near expiry
        SuperTier --> Expiring: Near expiry

        Expiring --> RenewalPrompt: 7 days before
        RenewalPrompt --> InitiatingUpgrade: Renew
        RenewalPrompt --> Expired: No action
    }

    state PaymentFailed {
        [*] --> ErrorRecorded
        ErrorRecorded --> UserNotified: Show error
        UserNotified --> CanRetry: Option given
        CanRetry --> InitiatingUpgrade: Try again
    }

    PaymentExpired --> NoPayment: Return to free
    MembershipActive --> PaymentExpired: Membership ends

    note right of PaymentPending
        Order valid for 15 minutes
        API: GET /payment/orders/{id}
        Status polling required
    end note

    note right of MembershipActive
        Quota based on tier
        Auto-renewal optional
        Benefits immediate
    end note
```

## State Transition API Mapping

| State Category | Transition | API Trigger | Business Rule |
|---------------|------------|-------------|---------------|
| **User States** |
| Anonymous → Registered | Registration | POST /auth/register | Phone/WeChat required |
| Registered → Authenticated | Login | POST /auth/login | Valid credentials |
| Free → Paid | Upgrade | POST /users/membership/upgrade | Payment success |
| Session → Expired | Timeout | N/A | 24h token expiry |
| **Book States** |
| Draft → Processing | Start process | Admin action | Content ready |
| Processing → Published | Complete | Auto/Admin | All steps pass |
| Published → Offline | Disable | PUT /admin/books/{id} | Admin only |
| **Dialogue States** |
| Idle → Active | Start chat | POST /dialogues/*/start | Quota available |
| Active → Completed | End chat | User action | Manual/Timeout |
| Active → Expired | Timeout | System | 30 min inactive |
| **Upload States** |
| Ready → Uploading | Select file | POST /uploads | File valid |
| Uploading → Processing | Upload done | System | File received |
| Processing → Completed | Process done | System | All steps pass |
| Processing → Failed | Error | System | Step failure |
| **Payment States** |
| None → Pending | Create order | POST /membership/upgrade | Plan selected |
| Pending → Processing | User pays | Gateway | Scan QR/Link |
| Processing → Completed | Success | Callback | Payment verified |
| Completed → Active | Activate | System | Membership updated |

## Business Logic Conservation Notes

1. **State Integrity**: Every state transition has clear entry/exit conditions
2. **API Consistency**: Each transition maps to specific API operations
3. **Rollback Safety**: Failed states have recovery paths
4. **Audit Trail**: All transitions are logged for tracking
5. **Business Rules**: State guards enforce business constraints