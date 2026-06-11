# PRODUCT SIMPLIFICATION REPORT
## Saral Funding — Phase 0 Audit
**Date:** 2026-06-10  
**Auditor:** Claude Code  
**Scope:** Complete frontend, backend, and navigation audit  

---

## AUDIT SUMMARY

The app currently has **26 screens**, **4 tabs**, **~60 backend endpoints**, and **7 backend services**.  
The core user journey (onboard → assess → recommend → book → apply) is solid.  
However, several screens, flows, and UI elements add complexity without advancing that journey.

---

## 1. FEATURES TO KEEP

These features directly serve the funding journey. Keep them as-is or with minor polish.

### User Flows
| Screen / Feature | Path | Reason to Keep |
|---|---|---|
| Splash / Auth check | `app/index.tsx` | Required router entry point |
| Login (mobile + OTP) | `app/login.tsx`, `app/otp.tsx` | Core auth — no alternative |
| Language selector | `app/language.tsx` | MSME users across India need vernacular support |
| Onboarding — Profile | `app/onboarding/profile.tsx` | Required for readiness scoring |
| Onboarding — Business | `app/onboarding/business.tsx` | Required for scheme + bank matching |
| Onboarding — Assessment | `app/onboarding/assessment.tsx` | Required for funding assessment |
| Settings (language change + logout) | `app/settings.tsx` | Required utility |

### Core Logged-In Screens
| Screen / Feature | Path | Reason to Keep |
|---|---|---|
| Dashboard (Home tab) | `app/(tabs)/index.tsx` | Central hub — keep; trim bloat (see Section 3) |
| AI Advisor (Advisor tab) | `app/(tabs)/advisor.tsx` | Highest-value differentiator — chat + structured |
| Profile tab | `app/(tabs)/profile.tsx` | Required for editing profile/business data |
| Scheme detail | `app/scheme/[id].tsx` | Users need full scheme info before applying |
| Bank detail | `app/bank/[id].tsx` | Users need full bank info + match breakdown |
| Consultation booking | `app/booking.tsx` | Core revenue driver — keep |
| Notifications | `app/notifications.tsx` | Required for alerts and lead follow-up |
| Readiness score detail | `app/readiness.tsx` | Motivates users to complete profile; drives actions |

### Admin / CRM
| Screen / Feature | Path | Reason to Keep |
|---|---|---|
| Admin dashboard overview | `app/admin/index.tsx` | Required for ops visibility |
| Admin users list | `app/admin/users.tsx` | Core CRM — user lookup |
| Admin consultations | `app/admin/consultations.tsx` | Core CRM — follow-up queue |
| Admin leads pipeline | `app/admin/leads.tsx` | Core CRM — deal tracking |
| Admin lead detail | `app/admin/lead/[id].tsx` | Required for full lead context |
| Admin schemes management | `app/admin/schemes.tsx` | Enable/disable schemes; ops control |
| Admin config | `app/admin/settings.tsx` | Calendly URL + WhatsApp number — ops config |

### Backend Services
| Service | Reason to Keep |
|---|---|
| `auth_service.py` | Core auth |
| `bank_service.py` | Bank scoring — core feature |
| `readiness_service.py` | Score computation — core feature |
| `ai_service.py` | AI advisor — core differentiator |
| `analytics_service.py` | Admin ops visibility |
| `alerts_service.py` | Contextual nudges — drives completion |

---

## 2. FEATURES TO MERGE

These features overlap or split what should be a single coherent experience.

### 2A. Merge Schemes Tab → into Dashboard + Advisor

**Problem:**  
The **Schemes tab** (`app/(tabs)/schemes.tsx`) is a browsable catalogue. But:
- The Dashboard already shows top scheme matches
- The AI Advisor already explains and recommends schemes
- Users do not need to browse 25+ schemes; they need their 3–5 best matches

**Recommendation:**  
- Remove the Schemes tab from bottom navigation
- Keep scheme matches on the Dashboard (top 3, with "See all" → inline expanded list)
- Deep-link to `scheme/[id].tsx` from both Dashboard and Advisor
- The scheme *browser* becomes a secondary action, not a primary tab

**Impact:** Tab count drops from 4 to 3 usable tabs + Profile = cleaner nav

---

### 2B. Merge Banks List → into Dashboard + Funding Case

**Problem:**  
`app/banks.tsx` (bank list with scores) and `app/bank/[id].tsx` (bank detail) are accessed only via dashboard "Top Bank" widget or a manual navigate. There is no primary navigation entry point for banks.

**Recommendation:**  
- Keep `bank/[id].tsx` — it's a high-value detail screen
- Merge `banks.tsx` into a "Funding Case" section on the Dashboard (show top 3 banks, "View all" expands the list inline or as a modal sheet)
- Or: create a **Funding Case** tab (Section 4) that consolidates scheme matches + bank recommendations + readiness

---

### 2C. Merge Banks Compare → Simplify or Remove

**Problem:**  
`app/banks-compare.tsx` adds a side-by-side comparison matrix. This is a power-user feature that most MSME users (low digital literacy) will not use or understand.

**Recommendation:**  
- Defer until post-MVP validation shows users actually want comparison (check analytics)
- If keeping: move "compare" into the bank detail screen as a secondary action, not a standalone route

---

### 2D. Merge Advisor Modes (Chat + Structured) into One Flow

**Problem:**  
The Advisor has two modes — free-form chat and structured (roadmap) output. The UI toggles between them. This adds cognitive load.

**Recommendation:**  
- Default to chat (conversational)
- Trigger structured output automatically when the user completes a "give me a plan" type message (already partially implemented)
- Remove the explicit mode toggle button; let the AI decide when to show structured vs. conversational response
- Simplifies the UI significantly

---

### 2E. Merge Setu AA Link Bank → into Onboarding or Readiness Actions

**Problem:**  
`app/link-bank.tsx` is a standalone screen with no persistent navigation entry. It's only reachable via a Dashboard CTA card.

**Recommendation:**  
- Keep the screen
- Also surface it as an action item inside **Readiness** score detail (`app/readiness.tsx`) — "Link your bank account → +15 points"
- And surface it as a step in onboarding for returning users who skipped it
- Do NOT add it to the bottom nav

---

## 3. FEATURES TO REMOVE

These features add complexity, visual clutter, or maintenance burden without advancing the funding journey.

### 3A. REMOVE: Admin Analytics Screen (Defer to Phase 2)

**Screen:** `app/admin/analytics.tsx`  
**Endpoints:** `GET /api/admin/analytics` (7 sub-aggregations)  
**Problem:**  
- Renders charts for popular schemes, state distribution, daily trends, consultation trends
- Beautiful but **none of this helps close a lead today**
- `analytics_service.py` computes 6 aggregation queries on every page load
- Maintenance cost: high. Revenue impact: zero at current scale

**Recommendation:** Remove from admin nav. Keep the endpoint but don't surface the UI. Add back in Phase 2 when there are 500+ users to analyze.

---

### 3B. REMOVE: Admin Notifications Broadcast Screen

**Screen:** `app/admin/notifications.tsx`  
**Endpoint:** `POST /api/admin/notifications`  
**Problem:**  
- Sends broadcast push notifications
- FCM (Firebase Cloud Messaging) is **not implemented** — backend calls a stub
- Screen exists but does nothing in production
- Notification broadcast without segmentation is noise, not value

**Recommendation:** Remove from admin nav entirely. When real push infra is ready, add back with segmentation controls.

---

### 3C. REMOVE: Admin Schemes Management Screen (Replace with Seed File)

**Screen:** `app/admin/schemes.tsx`  
**Endpoints:** Multiple scheme CRUD endpoints  
**Problem:**  
- Allows admin to enable/disable/create schemes via UI
- In practice, schemes are seeded from `banks_seed.py` / `schemes_seed.py`
- No admin today actively manages this in prod; it's ops overhead
- Risk: admin accidentally disabling core schemes

**Recommendation:** Remove from admin nav. Manage schemes via seed file + deploy. Add back only when there are dedicated scheme managers on the team.

---

### 3D. REMOVE: Language Selector as a Separate Screen

**Screen:** `app/language.tsx`  
**Problem:**  
- Full-screen language picker shown during onboarding
- Only 1 language (English) is actually implemented in the app copy
- Hindi/Gujarati/etc. labels are present but the app content is English-only
- Creates a false promise to users

**Recommendation:** Remove as a standalone onboarding step. Move language preference to **Settings** only (already exists there). When multi-language content is actually built, add it back to onboarding.

---

### 3E. REMOVE: Saathi from Booking Confirmation

**Component usage:** `app/booking.tsx` — Saathi "celebrating" expression  
**Problem:**  
- Celebration mascot on a professional consultation booking confirmation feels mismatched
- This is a B2B / financial context, not Duolingo
- A simple checkmark + confirmation details is more professional and trustworthy

**Recommendation:** Replace with a clean CheckCircle icon + confirmation card (no mascot). Reserve Saathi for advisory/guidance contexts only.

---

### 3F. REMOVE: Saathi from Empty States (Advisor only)

**Problem:**  
Saathi currently appears or is imported in:
- `advisor.tsx` — Typing indicator (thinking) ✅ Keep
- `advisor.tsx` — Empty state (explaining) ✅ Keep  
- `booking.tsx` — Celebrating on confirmation ❌ Remove (see 3E)

**Rule going forward:** Saathi = Advisor screen only. Do not add to any new screens.

---

### 3G. REMOVE: CSV Exports from Admin

**Endpoints:** `GET /api/admin/exports/users.csv`, `/leads.csv`, `/consultations.csv`, `/schemes.csv`  
**Problem:**  
- These endpoints exist in the backend but are **not surfaced in any admin UI screen**
- Not linked from any admin page; unreachable without API knowledge
- Creates maintenance surface (CSV generation code) with zero current usage

**Recommendation:** Remove the endpoints for now. If needed later, a single "Export leads" button on the leads screen is sufficient.

---

## 4. FEATURES TO DEFER

These are good ideas that are not ready and distract from shipping the core product.

### 4A. DEFER: Setu Account Aggregator (AA) Integration

**Files:** `backend/setu_service.py`, `app/link-bank.tsx`, AA endpoints  
**Why defer:**  
- Requires paid Setu credentials (sandbox has rate limits; production requires RBI FIP approval)
- WebView-based consent flow is fragile on mobile (deep link redirects may not work on all devices)
- The financial data enrichment is valuable but optional — readiness score works without it
- Risk vs. reward: high complexity, medium value at early stage

**Defer to:** Phase 3, when onboarding completion rate is >60% and there is a validated need for auto-fill.  
**Until then:** Keep the mock endpoints. Hide the Dashboard CTA. Preserve the code for activation later.

---

### 4B. DEFER: Bank Comparison Screen

**File:** `app/banks-compare.tsx`  
**Why defer:**  
- No user research confirms MSME users want to compare banks side-by-side
- The bank recommendation engine already ranks and explains best matches
- Adds UI complexity for a feature that may never be used

**Defer to:** Phase 4, after analytics show users clicking "compare" repeatedly.

---

### 4C. DEFER: Admin Analytics Dashboard

**File:** `app/admin/analytics.tsx`  
(Already listed in Remove — noting here to clarify it's "defer not delete" from the backend)  
**Keep:** The `analytics_service.py` and endpoints (cheap to maintain)  
**Remove:** The admin UI navigation entry only

---

### 4D. DEFER: Multi-Language Content

**Feature:** Language selector, translated content  
**Why defer:**  
- App copy is 100% English today
- Full localization requires copy review, translation, RTL handling, font loading
- Language selector creates false promise

**Defer to:** Phase 5 after core product-market fit is validated.

---

### 4E. DEFER: Push Notifications (FCM)

**Endpoint:** `POST /api/admin/notifications`  
**Why defer:**  
- Firebase Cloud Messaging not wired up in the mobile app
- No device token registration flow exists
- Backend stub does nothing

**Defer to:** Phase 3 when mobile app is in production with real device installs.

---

## 5. NAVIGATION RECOMMENDATION

### Current State (4 tabs):
```
Home | Schemes | Advisor | Profile
```

### Target State (3 functional tabs + Profile):
```
Home | Funding Case | Advisor | Profile
```

#### What changes:
| Tab | Action |
|---|---|
| **Home** | Keep. Trim dashboard to: Readiness Ring, Top 3 Schemes, Top Bank, Next Consultation, Link Bank CTA (if not linked), Alerts. Remove action items list (move to Readiness screen). |
| **Schemes** (current) | **Remove as a tab.** Scheme browsing folds into Home (top matches) and Advisor (recommendations). |
| **Funding Case** (new) | **New tab** combining: Readiness breakdown + action items + Bank recommendations + Scheme matches + Document checklist. This is the user's active funding file — everything needed to prepare and apply. |
| **Advisor** | Keep. Simplify UI — remove mode toggle, default to chat, auto-trigger structured output. |
| **Profile** | Keep. Add link to Settings. |

---

## 6. DASHBOARD AUDIT

Every current dashboard section tested against: **"Does this help the user get funding faster?"**

| Section | Current | Decision | Reason |
|---|---|---|---|
| Readiness Ring (hero card) | ✅ Present | **Keep** | Core motivator — drives profile completion |
| Improve Your Score actions | ✅ Present | **Move** | Move to Readiness screen; too much on home |
| Link Bank Account CTA | ✅ Present | **Defer / hide** | Setu not production-ready (see 4A) |
| Bank Linked badge | ✅ Present | **Keep if linked** | Good trust signal once AA active |
| Smart Alerts | ✅ Present | **Keep (max 2)** | Valuable nudges; limit to 2 on dashboard |
| Top Bank Match | ✅ Present | **Keep** | High value — single best bank recommendation |
| Next Consultation | ✅ Present | **Keep** | Drives re-engagement |
| Top Scheme Matches | ✅ Present | **Keep (top 3 only)** | Core value prop |
| Scheme detail chevrons | ✅ Present | **Keep** | Navigation to detail |
| Admin shortcut button | ✅ Present | **Keep (admin role only)** | Ops access |

---

## 7. SAATHI USAGE AUDIT

| Screen | Current Usage | Decision |
|---|---|---|
| `advisor.tsx` — typing indicator | Thinking expression | ✅ Keep |
| `advisor.tsx` — empty state | Explaining expression | ✅ Keep |
| `booking.tsx` — confirmation | Celebrating expression | ❌ Remove — replace with CheckCircle |
| Future screens | Any new usage | ❌ Do not add |

---

## 8. ADMIN NAVIGATION AUDIT

### Current admin nav items:
Overview · Users · Consultations · Leads · Schemes · Notifications · Analytics · Settings

### Recommended admin nav:
| Item | Decision | Reason |
|---|---|---|
| Overview | ✅ Keep | At-a-glance ops |
| Users | ✅ Keep | Core CRM |
| Consultations | ✅ Keep | Core CRM |
| Leads | ✅ Keep | Core CRM |
| Schemes | ❌ Remove from nav | Managed via seed; not daily ops |
| Notifications broadcast | ❌ Remove | FCM not implemented |
| Analytics | ❌ Remove from nav | Defer to Phase 2 |
| Settings | ✅ Keep | Calendly + WhatsApp config |

---

## 9. IMPLEMENTATION PRIORITY

Once this report is approved, recommended execution order:

| Phase | Action | Impact |
|---|---|---|
| **0A** | Remove Schemes tab; fold into Dashboard top-3 + Advisor | Reduces nav complexity immediately |
| **0B** | Create Funding Case tab (readiness + banks + scheme matches + docs) | Clarifies user journey |
| **0C** | Replace Saathi on booking confirmation with CheckCircle | Professional tone |
| **0D** | Remove Analytics, Notifications broadcast, Schemes CRUD from admin nav | Cleans up admin |
| **0E** | Hide Link Bank CTA from dashboard until Setu is production-ready | Removes broken flow |
| **0F** | Remove Language screen from onboarding | Removes false promise |
| **Phase 1** | Build Funding Case tab | Core product improvement |
| **Phase 2** | Analytics dashboard (when 500+ users) | Ops intelligence |
| **Phase 3** | Setu AA + Push notifications | Automation |

---

## 10. WHAT THIS APP SHOULD FEEL LIKE

> A professional funding advisory platform — like having a CA and a bank manager in your pocket.

**NOT:**
- A fintech experiment with 10 tabs
- A gamified learning app (no mascot on every screen)
- A feature showcase (bank comparison, analytics, CSV exports)
- A prototype (fake language support, unimplemented push notifications)

**The single user journey this app must nail:**

```
User opens app
    ↓
Onboards in 3 steps (5 minutes)
    ↓
Sees their readiness score + top 3 schemes + best bank
    ↓
Books a consultation (or asks Advisor a question)
    ↓
Admin picks up the lead
    ↓
User uploads documents (Phase 1 — Document Vault)
    ↓
Funding application submitted
    ↓
Approval + Disbursement
    ↓
Revenue
```

Everything in the app either accelerates this journey or it doesn't belong here.

---

*This report is a recommendation only. No code has been changed. Await approval before implementation.*
