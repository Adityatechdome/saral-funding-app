# Saral Funding V1.5 — Phase Implementation Plan

**Generated:** 2026-06-09  
**Codebase Analysis:** Complete  
**Approach:** Extend existing modules. No rebuilds. Backward compatible.

---

## Existing Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo 54 + Expo Router 6 |
| Backend | FastAPI + Python 3.x |
| Database | MongoDB (motor async driver) |
| Auth | Firebase Phone Auth / Mock OTP + Bearer tokens |
| AI | GPT-4o via emergentintegrations SDK |
| i18n | 9 languages (en, hi, gu, mr, bn, ta, te, kn, pa) |

---

## Pre-existing Features (PRESERVE ALL)

- ✅ Dashboard with readiness ring, scheme matches, quick actions
- ✅ AI Advisor (chat + structured strategy mode)
- ✅ Funding Assessment onboarding
- ✅ Government Schemes browse + detail
- ✅ Consultation Booking (date/time picker form)
- ✅ Bank Recommendations + Compare
- ✅ Multi-language support (9 languages)
- ✅ User & Business Profiles
- ✅ Admin dashboard (overview, users, schemes, consultations, leads, notifications, analytics)
- ✅ Role-based access (user, expert, manager, sales_executive, support_executive, super_admin)
- ✅ CRM leads pipeline (already exists in `/admin/leads`)
- ✅ All existing API endpoints

---

## PHASE 1 — Admin + CRM Enhancement

**Status:** Partially implemented. Admin pages + API endpoints exist but need enhancement.

### What exists:
- `/admin/` — 7 pages already built
- `/api/admin/*` — full CRUD for users, schemes, consultations, leads
- Roles: user, expert, manager, sales_executive, support_executive, super_admin
- Lead pipeline stages: new → closed (partially stored)
- Consultation tracking with status + assignment

### What to build:
1. **Granular role permissions middleware** (frontend route guards per role)
   - Current: only admin vs user check
   - Target: Expert sees only consultations; Sales sees only assigned leads
   - Files: `frontend/app/admin/_layout.tsx` — add role-based tab visibility

2. **Admin Dashboard metrics expansion**
   - Currently: 6 stat cards (users, admins, schemes, consultations, leads, chats)
   - Add: AI Advisor Usage count, Conversion Rate, Scheme Views, Bank Recommendation Views
   - Backend: `/api/admin/overview` — extend with new metric fields
   - File: `backend/server.py` (admin overview endpoint ~line 600)

3. **Charts for admin analytics**
   - Currently: text-only stats in `/admin/analytics`
   - Add: Daily Users chart, Consultation Trends, Lead Funnel, State-wise Users
   - Use `react-native-svg` (already installed) for charts
   - File: `frontend/app/admin/analytics.tsx`

4. **CRM Lead Detail view**
   - Currently: lead list with stage, no detail modal
   - Add: Full lead detail screen with user profile, funding req, consultation history, notes, timeline
   - File: `frontend/app/admin/leads.tsx` — add detail modal/screen

5. **Lead Activity Timeline**
   - Backend: extend lead schema with `activity_log: [{action, actor, ts, note}]`
   - Auto-log stage changes, note additions, assignment changes
   - File: `backend/server.py` (leads update endpoint)

**New files:**
- `frontend/app/admin/lead/[id].tsx` — Lead detail page
- `frontend/src/components/admin/ActivityTimeline.tsx`
- `frontend/src/components/admin/LeadFunnel.tsx`
- `frontend/src/components/admin/UserChart.tsx`

---

## PHASE 2 — Calendly Consultation System

**Status:** Not implemented. Current booking is a custom form UI.

### What exists:
- `frontend/app/booking.tsx` — custom date/time picker form
- `backend/server.py` POST `/api/consultations` — saves to MongoDB + creates lead

### What to build:
1. **Admin Calendly config** — Store Calendly URL, consultation types, durations
   - Backend: new collection `admin_config`, endpoint `GET/POST /api/admin/config`
   - Frontend: Config form in `/admin/settings` (new page)

2. **Calendly widget embed** in booking flow
   - Replace custom time-picker with Calendly inline widget
   - Use `react-native-webview` (already installed) to embed Calendly
   - Intercept `calendly.event_scheduled` postMessage
   - On event: POST to backend with event URI + invitee URI

3. **Calendly webhook handler** (backend)
   - New endpoint: `POST /api/webhooks/calendly`
   - Handle: `invitee.created`, `invitee.canceled`
   - Parse event → update consultation status + notify user

4. **Store Calendly fields** in consultations collection
   - Add: `calendly_event_id`, `calendly_event_uri`, `calendly_invitee_uri`, `calendly_join_url`
   - Existing: `status`, `date`, `time_slot` — preserve these

**New files:**
- `frontend/app/admin/settings.tsx` — Admin config (Calendly URL, WhatsApp number, etc.)
- `backend/calendly_service.py` — Calendly webhook handling

**Modified files:**
- `frontend/app/booking.tsx` — Add Calendly WebView embed option
- `backend/server.py` — Extend consultations schema + add webhook endpoint

---

## PHASE 3 — Email System (Resend)

**Status:** Not implemented. No email integration exists.

### What to build:
1. **Resend SDK integration** — `resend` Python package
   - Config: `RESEND_API_KEY` env var
   - File: `backend/email_service.py` (new)

2. **6 HTML email templates**
   - `consultation_confirmation.html`
   - `consultation_reminder.html`
   - `funding_opportunity_found.html`
   - `document_request.html`
   - `funding_readiness_update.html`
   - `lead_status_update.html`
   - Style: Saral Funding red (#D62828) header, clean financial branding
   - Location: `backend/templates/email/`

3. **Email trigger points**
   - Consultation booked → confirmation email
   - 24h before consultation → reminder (cron/scheduled task)
   - New scheme match → funding opportunity email
   - Lead status updated → lead status email

4. **Email tracking**
   - Resend webhooks: `email.sent`, `email.opened`, `email.clicked`
   - Endpoint: `POST /api/webhooks/resend`
   - Store in `email_logs` collection

**New files:**
- `backend/email_service.py`
- `backend/templates/email/*.html` (6 templates)

**Modified files:**
- `backend/server.py` — Call email_service on consultation booking, lead updates

---

## PHASE 4 — Push Notifications (Firebase Cloud Messaging)

**Status:** Notification system exists (in-app). No push notifications.

### What exists:
- MongoDB `notifications` collection
- `GET /api/notifications/me` — in-app notification list
- `POST /api/admin/notifications` — broadcast (stored only, not pushed)
- `frontend/app/notifications.tsx` — notification list screen

### What to build:
1. **FCM token registration** (frontend)
   - Install `expo-notifications` + `@react-native-firebase/messaging`
   - Request permission on app load
   - POST token to backend: `POST /api/users/fcm-token`

2. **FCM send service** (backend)
   - `backend/notification_service.py` (extend existing or new)
   - `send_push(user_ids, title, body, data)` using Firebase Admin SDK
   - `firebase-admin` Python package

3. **Push triggers** — 6 event types:
   - Consultation reminder (24h before)
   - Funding alert (new scheme match)
   - New scheme match
   - Document request
   - Profile completion reminder
   - Bank recommendation available

4. **Notification analytics** in admin
   - Track: sent, delivered (via FCM response), opened (deep-link tracking)
   - New admin metrics card

**New files:**
- `backend/notification_service.py`
- `frontend/src/hooks/usePushNotifications.ts`

**Modified files:**
- `backend/server.py` — Add FCM token endpoint, call push on events
- `frontend/app/_layout.tsx` — Initialize FCM on app load

---

## PHASE 5 — Document Vault (AWS S3)

**Status:** Not implemented. No document upload exists.

### What to build:
1. **Backend document API**
   - `POST /api/documents/upload` — presigned S3 URL generation
   - `GET /api/documents/me` — list user documents
   - `DELETE /api/documents/{doc_id}` — delete document
   - `POST /api/documents/{doc_id}/replace` — replace document
   - `POST /api/admin/documents/{doc_id}/review` — admin: verify/reject/request update
   - MongoDB collection: `documents`

2. **S3 integration**
   - `backend/storage_service.py` — presigned URL generation, delete
   - Env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`

3. **Document schema**
   ```
   {
     id, user_id, category (personal/business/funding),
     type (aadhaar/pan/gst/udyam/itr/bank_statement/...),
     filename, s3_key, s3_url (presigned, expires),
     status (pending/verified/rejected/needs_update),
     admin_comment, uploaded_at, reviewed_at, reviewed_by
   }
   ```

4. **Frontend Document Vault screen**
   - 3 sections: Personal, Business, Funding
   - Each document card: status badge, upload/replace button, preview/download
   - Image/PDF preview using `expo-image` + WebView
   - Upload using `expo-document-picker` + direct S3 upload

5. **Admin document review** — extend existing admin UI

**New files:**
- `backend/storage_service.py`
- `frontend/app/documents.tsx` — Document Vault screen
- `frontend/src/components/DocumentCard.tsx`

**Modified files:**
- `frontend/app/(tabs)/_layout.tsx` — Add Documents tab or link from profile
- `backend/server.py` — Add document endpoints

---

## PHASE 6 — WhatsApp Integration

**Status:** Not implemented.

### What to build:
1. **Floating WhatsApp button** (frontend)
   - Fixed position overlay on all main screens
   - Tap → open WhatsApp with pre-filled message
   - Use `Linking.openURL('https://wa.me/{number}?text={template}')`

2. **Admin configurable number**
   - Store in `admin_config` collection (shared with Calendly config)
   - Frontend admin settings page

3. **WhatsApp message templates** (pre-filled URL params):
   - Chat With Expert: "Hi, I need help with funding for my business."
   - Funding Assistance: "Hi, I'd like to know about funding options for {industry}."
   - Consultation Help: "Hi, I need help with my consultation booking."
   - Document Help: "Hi, I need help with document submission."

4. **Interaction tracking**
   - `POST /api/whatsapp/track` — store last_contacted, increment interaction_count
   - Field on user: `whatsapp_last_contacted`, `whatsapp_interaction_count`

**New files:**
- `frontend/src/components/WhatsAppButton.tsx`
- `frontend/src/components/WhatsAppMenu.tsx`

**Modified files:**
- `frontend/app/(tabs)/_layout.tsx` — Render WhatsApp button overlay
- `backend/server.py` — Add tracking endpoint, extend admin_config

---

## PHASE 7 — Saathi Mascot System

**Status:** Not implemented. No mascot exists.

### What to build:
1. **SVG Saathi illustration system** — 5 expression variants:
   - `happy` — profile complete, success states
   - `thinking` — AI processing, loading
   - `explaining` — funding advisor, scheme details
   - `celebrating` — consultation booked, milestone reached
   - `reviewing_documents` — document vault, document request

2. **Saathi component** — configurable React Native component
   - Props: `expression`, `message`, `size`
   - Renders SVG + speech bubble with message

3. **Integration points:**
   - Onboarding welcome screens
   - Dashboard empty state (before assessment)
   - Funding Assessment completion
   - Consultation success screen
   - Document upload success
   - Funding Readiness card
   - AI Advisor empty state

**New files:**
- `frontend/src/components/Saathi/index.tsx` — Main component
- `frontend/src/components/Saathi/expressions/happy.tsx`
- `frontend/src/components/Saathi/expressions/thinking.tsx`
- `frontend/src/components/Saathi/expressions/explaining.tsx`
- `frontend/src/components/Saathi/expressions/celebrating.tsx`
- `frontend/src/components/Saathi/expressions/reviewing_documents.tsx`

---

## PHASE 8 — AI Advisor V2

**Status:** Functional (chat + structured). Needs UX upgrade.

### What exists:
- Chat mode + Strategy mode in `frontend/app/(tabs)/advisor.tsx`
- GPT-4o backend in `backend/ai_service.py`
- Message history stored in MongoDB

### What to build:
1. **Suggested questions** — 6 contextual prompts on empty state
2. **Follow-up question chips** — after each AI response
3. **Rich response cards** — scheme cards, bank cards inline in chat
4. **Structured response viewer** — expandable sections (Summary, Schemes, Banks, Docs, Roadmap)
5. **Action buttons** inline — "Book Consultation", "View Scheme", "Compare Banks"
6. **Source references** — footnotes in responses
7. **Image/PDF upload prep** — UI placeholder, `expo-image-picker` integration stub
8. **Backend conversation memory** — extend to last 20 messages (currently 12)

**Modified files:**
- `frontend/app/(tabs)/advisor.tsx` — Full UX overhaul
- `backend/ai_service.py` — Extend history window, add follow-up suggestion generation

---

## PHASE 9 — Funding Readiness Score

**Status:** Partially implemented. Score exists (0-100), basic display in dashboard.

### What exists:
- `GET /api/readiness/me` — returns score, breakdown, action_items
- `ReadinessRing.tsx` component — SVG ring chart
- Score factors: profile, business, assessment completion flags

### What to build:
1. **Enhanced score factors** — add document upload completeness to scoring
2. **Funding Capacity estimate** — display "₹X – ₹Y likely eligible"
3. **Approval Probability** — percentage per scheme
4. **Dedicated Readiness screen** — expanded view with factor breakdown
5. **Improvement suggestions** — actionable cards with CTA

**New files:**
- `frontend/app/readiness.tsx` — Full readiness detail screen

**Modified files:**
- `backend/server.py` — Extend readiness endpoint with capacity estimate, approval probability
- `frontend/app/(tabs)/index.tsx` — Link readiness ring → readiness screen

---

## PHASE 10 — Bank Recommendation Engine

**Status:** Partially implemented. Bank list + recommendations exist.

### What exists:
- `GET /api/banks/recommend/me` — scored recommendations (score 1-5)
- `frontend/app/banks.tsx`, `bank/[id].tsx` — list + detail screens
- Bank data: SBI, BOB, Canara, PNB, Union, Indian, HDFC, ICICI, Axis (in seed)

### What to build:
1. **Enhanced match scoring** — detailed breakdown in bank detail
2. **"Why Recommended" explanation** — LLM-generated reason per bank
3. **Match score display** — percentage match card
4. **Collateral requirement flag** — prominent display
5. **Processing time estimate** — per bank
6. **Interest range refinement** — based on user profile (CIBIL proxy from turnover/GST)

**Modified files:**
- `backend/server.py` — Extend bank recommendation response
- `frontend/app/bank/[id].tsx` — Add match score, why recommended section

---

## PHASE 11 — Micro Interactions

**Status:** Basic. Some skeleton loaders exist in `SkeletonLoader.tsx`.

### What to build:
1. **Button haptic feedback** — `expo-haptics` (already installed) on all primary buttons
2. **Skeleton loaders** — extend existing `SkeletonLoader.tsx` for all loading states
3. **Progress animations** — readiness score count-up animation on mount
4. **AI typing animation** — 3-dot typing indicator (already partially exists)
5. **Success states** — animated checkmark on form submissions
6. **Funding score animation** — ring fill animation on readiness screen

**Modified files:**
- `frontend/src/components/ui/Button.tsx` — Add haptic feedback
- `frontend/src/components/ReadinessRing.tsx` — Add fill animation
- `frontend/src/components/SkeletonLoader.tsx` — More variants

---

## PHASE 12 — Illustration System

**Status:** No custom illustrations. Uses only icons.

### What to build:
1. **Saathi-based screen illustrations** (SVG):
   - Onboarding welcome (Saathi with ledger)
   - Dashboard hero (empty state before assessment)
   - Consultation Success (Saathi celebrating)
   - Document Upload Success (Saathi reviewing folder)
   - Funding Recommendations (Saathi pointing to schemes)

2. **Consistent newspaper illustration style** — black ink, pen-and-ink, crosshatch, red (#D62828) accents only

**New files:**
- `frontend/assets/illustrations/saathi-*.svg`
- `frontend/src/components/illustrations/` — one component per screen

---

## Production Readiness Documents

- `SECURITY_AUDIT.md` — auth, RBAC, file security, API hardening
- `PRODUCTION_CHECKLIST.md` — env vars, monitoring, deployment checks
- `DEPLOYMENT_GUIDE.md` — step-by-step deploy (Expo EAS + FastAPI + MongoDB Atlas)

---

## Implementation Order (Priority Sequence)

```
Phase 1   Admin + CRM Enhancement        (Extend existing)
Phase 9   Funding Readiness Score        (Extend existing /api/readiness)
Phase 10  Bank Recommendation Engine     (Extend existing /api/banks/recommend)
Phase 7   Saathi Mascot System           (New SVGs, no backend)
Phase 8   AI Advisor V2                  (Extend existing advisor)
Phase 11  Micro Interactions             (Polish existing components)
Phase 12  Illustration System            (New assets)
Phase 6   WhatsApp Integration           (Simple Linking, no external API)
Phase 2   Calendly Consultation          (Replace booking WebView)
Phase 3   Email System (Resend)          (New backend service)
Phase 4   Push Notifications (FCM)       (New backend + frontend service)
Phase 5   Document Vault (S3)            (New backend + frontend)
```

---

## New Dependencies Required

### Backend (Python)
```
resend                  # Email via Resend API
firebase-admin          # FCM push notifications
boto3                   # Already installed — AWS S3
```

### Frontend (npm)
```
expo-notifications      # FCM token registration + handling
expo-document-picker    # Document upload file selection
expo-image-picker       # AI image upload (Phase 8 prep)
```

---

## Database Schema Extensions

### users (extend)
```
fcm_token: Optional[str]
whatsapp_last_contacted: Optional[datetime]
whatsapp_interaction_count: int = 0
email: Optional[str]
```

### consultations (extend)
```
calendly_event_id: Optional[str]
calendly_event_uri: Optional[str]
calendly_invitee_uri: Optional[str]
calendly_join_url: Optional[str]
```

### leads (extend)
```
activity_log: List[{action, actor, ts, note}]
```

### New collections
```
documents           # Document vault
admin_config        # Calendly URL, WhatsApp number, etc.
email_logs          # Resend email tracking
notification_logs   # FCM push tracking
```

---

## API Endpoints to Add

```
# Admin Config
GET/POST  /api/admin/config

# Calendly
POST      /api/webhooks/calendly

# Email
POST      /api/webhooks/resend

# FCM
POST      /api/users/fcm-token

# Documents
POST      /api/documents/upload
GET       /api/documents/me
DELETE    /api/documents/{id}
POST      /api/documents/{id}/replace
POST      /api/admin/documents/{id}/review

# WhatsApp Tracking
POST      /api/whatsapp/track
```
