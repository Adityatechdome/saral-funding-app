# Saral Funding

**Government funding discovery and application management platform for Indian MSMEs.**

Saral Funding helps small business owners discover relevant government schemes, prepare their applications, and track progress — all in one mobile app. Admins get a full CRM to manage leads from consultation booking to fund disbursal.

---

## Features at a Glance

**For Users**
- OTP-based login (no passwords)
- AI-powered scheme matching (GPT-4)
- 2-step onboarding with business assessment
- Browse, search, and filter 50+ government schemes
- Free consultation booking with auto-generated Jitsi Meet link
- Document upload and status tracking
- AI advisor chat ("Saathi")
- Funding readiness score with improvement tips
- Bank recommendations and comparison
- Push notifications + in-app notification inbox
- Account Aggregator integration (bank data via consent)
- 9 Indian language support

**For Admins**
- Full CRM: lead pipeline (New → Disbursed) with GoHighLevel sync
- Lead detail: documents, schemes, banks, notes, timeline, send notifications
- Document verification (Verify / Reject with reason)
- Scheme and bank management (create, assign, bulk-assign)
- Team management with role-based access
- Analytics dashboard + CSV exports
- Targeted and broadcast push notifications
- Consultation management with meeting links

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native 0.81 + Expo SDK + TypeScript |
| Routing | Expo Router (file-based) |
| Backend | Python 3.11 + FastAPI |
| Database | MongoDB (async via Motor) |
| Auth | OTP (MSG91) + JWT with refresh token rotation |
| Document Storage | Azure Blob Storage |
| AI / Matching | OpenAI GPT-4 |
| CRM | GoHighLevel (GHL) v2 API |
| Meetings | Jitsi Meet (free, no key required) |
| FinTech | Setu Account Aggregator |
| Push Notifications | Expo Push Notifications |

---

## Project Structure

```
saral-funding-app/
├── backend/          # FastAPI Python backend
├── frontend/         # React Native (Expo) mobile app
├── docs/             # Full documentation
│   ├── ARCHITECTURE.md   # System design, flows, data models
│   ├── FEATURES.md       # All user + admin features
│   └── API.md            # Complete API reference
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- MongoDB (local or Atlas)
- Expo Go app on your phone (for mobile testing)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/saral-funding-app.git
cd saral-funding-app
```

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# Start the backend
uvicorn server:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`
API docs (Swagger): `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Start Expo
npx expo start
```

Scan the QR code with Expo Go, or press `w` for web, `i` for iOS simulator, `a` for Android emulator.

---

### 4. Mock Backend (No Python Required)

For quick UI preview without the full backend:

```bash
# From project root
node mock-server.js

# In frontend/.env, set:
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# ── MongoDB ───────────────────────────────────────────────────────
MONGO_URL=mongodb://localhost:27017
DB_NAME=saral_funding

# ── Azure Blob Storage (document uploads) ─────────────────────────
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER=saral-documents

# ── MSG91 (OTP via SMS, DLT compliant) ────────────────────────────
MSG91_API_KEY=your_msg91_api_key
MSG91_TEMPLATE_ID=your_template_id
MSG91_SENDER_ID=YOURSD
MSG91_ENTITY_ID=your_entity_id
USE_MOCK_OTP=true              # true = OTP is always 123456 (dev mode)

# ── OpenAI (AI scheme matching + advisor chat) ─────────────────────
OPENAI_API_KEY=sk-...

# ── GoHighLevel CRM (optional) ────────────────────────────────────
GHL_API_KEY=pit-...            # Private Integration Token
GHL_LOCATION_ID=your_location_id
GHL_PIPELINE_NAME=Saral Funding Prospects

# ── Setu Account Aggregator (optional) ────────────────────────────
SETU_CLIENT_ID=your_client_id
SETU_CLIENT_SECRET=your_client_secret
SETU_BASE_URL=https://fiu-uat.setu.co

# ── Auth ──────────────────────────────────────────────────────────
SUPER_ADMIN_MOBILE=9000000000  # This mobile becomes super_admin on first login
JWT_SECRET=your_random_secret_key
```

### Frontend (`frontend/.env`)

```bash
# Backend URL — use mock server or real FastAPI
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## First-Time Admin Setup

1. Start backend with `SUPER_ADMIN_MOBILE=9XXXXXXXXX` set in `.env`
2. Login with that mobile number in the app
3. The user is automatically promoted to `super_admin` on first login
4. Access the admin panel (bottom nav → Admin tab, visible only to admins)
5. Use Team section to invite other admins/team members

---

## Documentation

| Doc | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, auth flow, DB schema, integrations |
| [Features](docs/FEATURES.md) | Complete user and admin feature reference |
| [API Reference](docs/API.md) | All REST endpoints with request/response examples |

---

## Key Business Flows

### User Journey
```
Register → Onboarding (2 steps) → AI matches schemes →
Browse schemes → Book consultation → Upload documents →
Track application → Get funded
```

### Admin Journey
```
Lead comes in (from consultation booking) →
Admin reviews in CRM → Assigns scheme + bank →
Verifies documents → Updates stage →
Scheme approved → Disbursal
```

### GHL CRM Sync
```
Consultation booked → Lead created in Saral →
GHL contact upserted → GHL opportunity created →
Stage changes in Saral → Synced to GHL pipeline
```

---

## API Overview

All endpoints are under `/api/`. Full reference: [docs/API.md](docs/API.md)

| Group | Base Path |
|---|---|
| Auth | `/api/auth/...` |
| User Onboarding | `/api/profile`, `/api/business-profile`, `/api/funding-assessment` |
| Schemes | `/api/schemes/...`, `/api/match/me` |
| Banks | `/api/banks/...` |
| Documents | `/api/documents/...` |
| Consultations | `/api/consultations/...` |
| AI Advisor | `/api/advisor/...` |
| Readiness | `/api/readiness/me` |
| Notifications | `/api/notifications/...` |
| Admin — CRM | `/api/admin/leads/...`, `/api/admin/consultations/...` |
| Admin — Users | `/api/admin/users/...` |
| Admin — Schemes | `/api/admin/schemes/...` |
| Admin — Documents | `/api/admin/documents/...` |
| Admin — Analytics | `/api/admin/analytics`, `/api/admin/exports/...` |

---

## External Services

| Service | Purpose | Required? |
|---|---|---|
| MongoDB | Primary database | **Required** |
| Azure Blob Storage | Document file storage | Required for uploads |
| MSG91 | OTP via SMS | Optional (`USE_MOCK_OTP=true` for dev) |
| OpenAI | Scheme matching + AI advisor | Optional (fallback active) |
| GoHighLevel | CRM pipeline sync | Optional (mock mode if keys missing) |
| Setu | Account Aggregator (bank data) | Optional |
| Jitsi Meet | Video consultation links | Free, no setup needed |
| Expo Push | Mobile push notifications | Requires Expo project |

---

## Roles

| Role | Access |
|---|---|
| `user` | Regular app user |
| `super_admin` | Full admin access including team + config |
| `manager` | CRM, documents, schemes, banks |
| `expert` | Leads, documents, scheme assignments |
| `sales_executive` | Leads + notifications |
| `support_executive` | Leads + document verification |

---

## Development Notes

- **Mock OTP**: Set `USE_MOCK_OTP=true` in backend `.env`. OTP is always `123456`.
- **Mock backend**: Run `node mock-server.js` for UI preview without Python/MongoDB.
- **Branch**: Development happens on `sai-dev` branch.
- **GHL mock mode**: If `GHL_API_KEY` or `GHL_LOCATION_ID` is missing, GHL calls are logged but not sent.
- **Jitsi**: Meeting links are auto-generated on consultation booking. No API key needed.

---

## License

Private — Techdome Solutions Private Limited. All rights reserved.
