# Saral Funding — System Architecture

## Overview

Saral Funding is a government funding discovery and application management platform for Indian MSMEs. It connects business owners to relevant funding schemes, assists with the application process, and gives admins a full CRM to track leads from booking to disbursal.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (Expo / React Native)          │
│  User Screens            │         Admin Screens                 │
│  Login → Onboarding →   │   Dashboard → Leads → Documents →    │
│  Dashboard → Schemes →  │   Consultations → Analytics →        │
│  Booking → Documents    │   Schemes → Banks → Notifications     │
└───────────────────────────────────┬─────────────────────────────┘
                                    │  HTTPS / REST
                         ┌──────────▼──────────┐
                         │   FastAPI Backend    │
                         │   (Python 3.11+)     │
                         │   /api/...           │
                         └──────────┬──────────┘
                                    │
           ┌────────────────────────┼─────────────────────────┐
           │                        │                         │
  ┌────────▼────────┐    ┌─────────▼────────┐    ┌──────────▼────────┐
  │    MongoDB       │    │  Azure Blob      │    │  External APIs    │
  │  (Primary DB)    │    │  (Documents)     │    │  MSG91 / OTP      │
  │  Users, Leads,  │    │  Uploaded files  │    │  OpenAI / GPT-4   │
  │  Schemes, Notif │    │  SAS URLs (5min) │    │  GHL CRM          │
  └─────────────────┘    └──────────────────┘    │  Setu AA          │
                                                  └───────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native 0.81, Expo SDK, TypeScript |
| Routing | Expo Router (file-based, similar to Next.js) |
| State Management | React `useState` / `useEffect` (local state per screen) |
| Animations | React Native Reanimated 3 |
| Icons | Lucide React Native |
| Backend | Python 3.11 + FastAPI 0.110 |
| Database | MongoDB (async via Motor driver) |
| Auth | OTP via MSG91 → JWT (access + refresh token rotation) |
| Document Storage | Azure Blob Storage (SAS URLs, 5-min expiry) |
| AI Matching | OpenAI GPT-4 |
| CRM | GoHighLevel (GHL) v2 API |
| Meetings | Jitsi Meet (free, no key required) |
| FinTech | Setu Account Aggregator (bank data consent) |
| SMS | MSG91 (DLT compliant) |

---

## Directory Structure

```
saral-funding-app/
├── backend/
│   ├── server.py              # Main FastAPI app — all routes
│   ├── ghl_service.py         # GoHighLevel CRM integration
│   ├── ai_service.py          # OpenAI scheme matching + advisor chat
│   ├── auth_service.py        # OTP generation / MSG91
│   ├── security.py            # JWT, rate limiting, validation
│   ├── analytics_service.py   # Dashboard analytics
│   ├── alerts_service.py      # Auto-generated user alerts
│   ├── readiness_service.py   # Readiness score computation
│   ├── bank_service.py        # Bank recommendation engine
│   ├── audit_service.py       # Immutable audit log writer
│   ├── notifications_service.py # Expo push notifications
│   ├── setu_service.py        # Account Aggregator (Setu)
│   ├── azure_storage.py       # Blob upload / SAS URL
│   ├── whatsapp_service.py    # WhatsApp integration
│   ├── schemes_seed.py        # Initial scheme data
│   ├── banks_seed.py          # Initial bank data
│   ├── .env.example           # Environment variable template
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── index.tsx          # Auth gate / splash
│   │   ├── login.tsx          # Mobile input screen
│   │   ├── otp.tsx            # OTP verification
│   │   ├── language.tsx       # Language picker
│   │   ├── (tabs)/            # Main user tab bar
│   │   │   ├── index.tsx      # Home dashboard
│   │   │   ├── schemes.tsx    # Browse schemes
│   │   │   ├── documents.tsx  # Upload documents
│   │   │   ├── advisor.tsx    # AI chat advisor
│   │   │   └── profile.tsx    # User profile
│   │   ├── onboarding/
│   │   │   ├── profile.tsx    # Step 1 — personal details
│   │   │   └── business.tsx   # Step 2 — business + assessment
│   │   ├── admin/
│   │   │   ├── index.tsx      # Admin dashboard
│   │   │   ├── leads.tsx      # CRM leads list
│   │   │   ├── lead/[id].tsx  # Lead detail + actions
│   │   │   ├── consultations.tsx
│   │   │   ├── documents.tsx
│   │   │   ├── users.tsx
│   │   │   ├── user/[id].tsx
│   │   │   ├── schemes.tsx
│   │   │   ├── scheme/[id].tsx
│   │   │   ├── banks.tsx
│   │   │   ├── bank/[id].tsx
│   │   │   ├── analytics.tsx
│   │   │   ├── notifications.tsx
│   │   │   ├── team.tsx
│   │   │   └── settings.tsx
│   │   ├── booking.tsx        # Consultation booking
│   │   ├── readiness.tsx      # Readiness assessment
│   │   ├── notifications.tsx  # User notifications
│   │   ├── banks.tsx          # Bank listing
│   │   ├── banks-compare.tsx  # Bank comparison
│   │   ├── bank/[id].tsx
│   │   ├── scheme/[id].tsx
│   │   ├── my-applications.tsx
│   │   └── settings.tsx
│   ├── src/
│   │   ├── api.ts             # HTTP client (auto-auth + token refresh)
│   │   ├── theme.ts           # Colors, fonts, spacing, utilities
│   │   ├── constants.ts       # States, categories, time slots, etc.
│   │   └── components/        # Shared UI components
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md        # This file
│   ├── FEATURES.md            # Full feature documentation
│   └── API.md                 # API reference
│
└── README.md                  # GitHub project overview
```

---

## Authentication Flow

```
User enters mobile number
        │
        ▼
POST /auth/send-otp
  → MSG91 sends SMS (or mock OTP: 123456 in dev)
  → Rate limited: 5 sends / 10 min
        │
        ▼
User enters 6-digit OTP
        │
        ▼
POST /auth/verify-otp
  → OTP validated (expiry + attempts check)
  → User created (first time) or fetched (returning)
  → Returns: { access_token, refresh_token, user }
        │
        ▼
Client stores tokens in SecureStore
All API calls → Authorization: Bearer {access_token}
        │
        ▼ (on 401)
POST /auth/refresh  → New access + refresh token pair
Old refresh token invalidated (rotation)
```

---

## Onboarding Flow

```
New user login
        │
        ▼
onboarding_step == "profile"
→ /onboarding/profile  (name, state, gender, category, age)
        │
POST /profile → onboarding_step = "business"
        │
        ▼
onboarding_step == "business"
→ /onboarding/business  (industry, funding, turnover, employees, GST, Udyam,
                          business location, woman entrepreneur, existing loans)
        │
POST /business-profile + POST /funding-assessment (parallel)
→ Triggers compute_and_store_matches()
→ onboarding_step = "done"
        │
        ▼
→ /documents (main app)
```

---

## Scheme Matching Algorithm

```
User completes assessment
        │
        ▼
compute_and_store_matches(user_id)
  1. Load user profile + business profile + assessment
  2. Load all active schemes from DB
  3. Rule-based pre-filter:
     - State match (scheme.states includes user.state or "All India")
     - Category match (SC/ST/OBC/Women/General)
     - Funding range match
  4. Send pre-filtered schemes + user profile to OpenAI GPT-4:
     - Returns: match_score (0–100), reason, funding_estimate, subsidy_estimate
  5. Store top matches in scheme_matches collection
  6. Generate smart alerts (GST tip, Udyam tip, scheme suggestions)
        │
        ▼
GET /match/me  → Returns ranked matches to user
```

---

## CRM / Lead Pipeline

```
User books consultation
        │
        ▼
POST /consultations
  → Creates consultation record
  → Generates Jitsi Meet link (meet.jit.si/SaralFunding{uid})
  → Creates CRM lead (stage: "new")
  → Upserts GHL contact (if GHL configured)
  → Creates GHL opportunity
  → Sends push notification to user
  → Logs activity
        │
        ▼
Admin sees lead in CRM → Lead Detail page
Admin can:
  ├── Change lead stage (new → contacted → interested → approved → disbursed)
  │     → Syncs to GHL opportunity stage
  ├── Add notes + follow-up date
  ├── Assign scheme to user
  ├── Update scheme application stage
  ├── Verify / reject documents
  ├── Send targeted push notification
  └── View consultation history + activity timeline
```

---

## Document Management Flow

```
User uploads document
        │
        ▼
POST /documents/upload
  → File validated (type: PDF/JPG/PNG, size: ≤5MB)
  → Uploaded to Azure Blob Storage
  → Stored with status: "pending"
  → GHL contact gets note (if integrated)
        │
        ▼
Admin reviews in Documents tab or Lead Detail
Admin clicks Verify / Reject
        │
        ▼
POST /admin/documents/{id}/status
  → Status → "verified" or "rejected"
  → Push notification sent to user
```

---

## Database Collections

| Collection | Purpose |
|---|---|
| `users` | User accounts + profiles |
| `business_profiles` | Business details per user |
| `funding_assessments` | Funding assessment answers |
| `scheme_matches` | AI-computed scheme matches |
| `schemes` | All funding schemes |
| `banks` | All banks |
| `scheme_applications` | Admin-assigned scheme applications per user |
| `bank_assignments` | Admin-assigned banks per user |
| `documents` | Uploaded document metadata |
| `consultations` | Booked consultations |
| `leads` | CRM leads (created from consultations) |
| `notifications` | In-app notifications per user |
| `advisor_history` | AI advisor chat history per user |
| `readiness_scores` | Computed readiness scores |
| `audit_logs` | Immutable admin action log |
| `admin_config` | Admin-configurable settings |

---

## Security Architecture

| Concern | Approach |
|---|---|
| Auth | OTP-only login (no passwords), JWT access tokens (~15 min) |
| Token storage | Refresh tokens stored as bcrypt hashes in DB |
| Token rotation | Each refresh issues a new pair, old token revoked |
| File access | Azure SAS URLs with 5-minute expiry |
| Rate limiting | 5 OTP sends / 10 min per mobile, 10 verifies / 10 min |
| Anomaly detection | Alert if admin downloads >20 docs/hour |
| Data privacy | Account deactivation anonymizes all personal data (DPDP) |
| Audit trail | Every admin action recorded with IP + actor + timestamp |
| Headers | X-Content-Type-Options, X-Frame-Options, CSP, HSTS |

---

## External Integrations

| Service | Use Case | Mode |
|---|---|---|
| **MSG91** | OTP SMS delivery (DLT compliant) | Real / Mock (USE_MOCK_OTP=true) |
| **Azure Blob** | Document storage + SAS URL generation | Required for uploads |
| **OpenAI GPT-4** | Scheme matching + AI advisor chat | Optional (fallback if missing) |
| **GoHighLevel** | CRM contacts + opportunities + stage sync | Optional (mock mode if keys missing) |
| **Setu** | Account Aggregator — bank data consent (FI data) | Optional |
| **Jitsi Meet** | Video consultation meetings (auto room creation) | Free / No key needed |
| **Expo Push** | Mobile push notifications | Requires Expo project setup |
