# Saral Funding — Product Requirements (V1)

AI-powered government funding discovery + lead-management platform for Indian entrepreneurs / MSMEs / startups / farmers / women entrepreneurs / shopkeepers. Phase A V1 ships a mobile-first app with in-app admin module.

## Stack
- **Mobile**: React Native (Expo Router 6, SDK 54), TypeScript
- **Backend**: FastAPI + Motor (MongoDB)
- **AI**: GPT-4o via Emergent Universal LLM key (`emergentintegrations`)
- **Auth**: Firebase Phone Auth scaffolded (`auth_service.py`). Mock OTP (`123456`) active until `FIREBASE_SERVICE_ACCOUNT_JSON` is set + native build generated.
- **Vector DB**: Deferred (Phase B). Current matching = rule-based + GPT-4o reasoning over schemes/banks JSON.
- **Admin**: In-app screens under `/admin` (role-gated). Not a separate Next.js portal.

## Mobile (18 screens)
Splash, Language (9 langs), Login, OTP, Personal Profile, Business Profile, Funding Assessment, Dashboard (Readiness hero + action items + Smart Alerts + Bank rec + 3 scheme matches), Schemes list + chips, Scheme detail, Banks list (`/banks`), Bank detail (`/bank/[id]`), Bank compare (`/banks-compare`), AI Advisor (Chat + Strategy modes with structured roadmap card), Consultation Booking, Notifications, Profile, Settings.

## Admin (in-app, role-gated)
`/admin` dashboard with operations stats + 6 module tiles:
- `/admin/users` (search, role/state filter, CSV export)
- `/admin/schemes` (list + enable/disable toggle, add/update via API)
- `/admin/consultations` (status filter + status update + notes)
- `/admin/leads` (CRM pipeline: new → contacted → interested → documentation → submitted → approved → disbursed → closed)
- `/admin/notifications` (broadcast send)
- `/admin/analytics` (popular schemes, state distribution, lead pipeline, consultation status)

## Backend Endpoints (`/api`, all bearer-auth except `/auth/*`)
**User-facing**
- Auth: `send-otp`, `verify-otp` (mock), `firebase-verify` (when enabled), `me`
- Onboarding: `profile`, `business-profile`, `funding-assessment`
- Discovery: `schemes`, `schemes/{id}`, `match/me`, `match/recompute`
- Banks: `banks`, `banks/{id}`, `banks/recommend/me`, `banks/compare`
- Readiness: `readiness/me` (0–100 score + breakdown + actions)
- Alerts: `alerts/evaluate` (rule engine, dedupe by key)
- Advisor: `advisor/chat`, `advisor/structured`, `advisor/history` (GET/DELETE)
- Consultations: `consultations`, `consultations/me` (auto-creates lead)
- Notifications: `notifications/me`, `notifications/{id}/read`
- Language: `language`

**Admin (`/api/admin/*`, RBAC: any admin role; super_admin only where noted)**
- `overview`, `users` (list/detail), `users/{uid}/role` *(super_admin)*, `schemes` (list/create/update/enable/disable/delete *(super_admin)*), `consultations` (list/update), `leads` (list/update), `notifications` (broadcast), `analytics`
- Exports: `exports/users.csv`, `leads.csv`, `consultations.csv`, `schemes.csv`

## Seed data
- 11 government schemes (PMEGP, Mudra, Stand-Up India, CGTMSE, PM Vishwakarma, PM SVANidhi, Startup India, SIDBI SMILE, Gujarat/MP/Maharashtra MSME)
- 9 banks (SBI, BoB, Canara, PNB, Union, Indian Bank, HDFC, ICICI, Axis)
- 1 super admin user (`9000000000` / OTP `123456`)

## Readiness Score breakdown (out of 100)
Profile completion 15 + Business profile 15 + GST 15 + Udyam 15 + Vintage/Turnover 20 + Assessment 10 + Documentation 10.

## Bank Recommendation factors
Funding fit, industry, state, GST + Udyam (private bank gating), turnover, collateral preference, woman/SC-ST bonuses for public banks.

## Future-Ready Architecture (not yet built — Phase B/C)
- Qdrant RAG pipeline (`/api/rag/*` reserved)
- DPR / Business Plan Generator
- Document Vault + OCR
- Payment Gateway (Stripe/Razorpay) for premium consultations
- Real Firebase phone OTP (drop in `FIREBASE_SERVICE_ACCOUNT_JSON` + native build)
- Push notifications via Emergent platform
- Expert dashboard split-out (`/admin/experts/*` reserved)

## Brand
Green `#22C55E` / dark green `#15803D` / black / white. No blue, no gradients, no glassmorphism. Existing UI preserved; V1 adds widgets without redesign.
