# SARAL FUNDING — FULL-STACK AUDIT
**Version:** 1.0 MVP  
**Audit Date:** 2026-06-09  
**Auditor:** CTO / Lead Architect

---

## 1. CURRENT ARCHITECTURE

### Stack Overview
```
┌─────────────────────────────────────────────────┐
│  React Native / Expo (SDK 54)                   │
│  Expo Router (file-based, like Next.js)          │
│  React 19 · TypeScript 5.9                      │
│  No global state (component-level useState only) │
└────────────────────┬────────────────────────────┘
                     │ HTTPS REST (Bearer token)
┌────────────────────▼────────────────────────────┐
│  FastAPI 0.110  (Python 3.x)                    │
│  Motor (async MongoDB driver)                    │
│  Pydantic v2 · Uvicorn                          │
│  emergentintegrations → GPT-4o                  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  MongoDB  (single DB, 10 collections)           │
│  Firebase Phone Auth (optional, mock in dev)    │
└─────────────────────────────────────────────────┘
```

### Module Map
| Module | Location | Responsibility |
|---|---|---|
| API Server | `backend/server.py` (769 LOC) | All REST endpoints |
| AI Service | `backend/ai_service.py` | Scheme matching + advisor chat |
| Auth Service | `backend/auth_service.py` | Firebase / mock OTP |
| Bank Service | `backend/bank_service.py` | Bank recommendation engine |
| Readiness Service | `backend/readiness_service.py` | Funding readiness score |
| Alerts Service | `backend/alerts_service.py` | Smart notification rules |
| Analytics Service | `backend/analytics_service.py` | Admin analytics |
| Seed Data | `backend/schemes_seed.py` + `banks_seed.py` | 25+ schemes, 15+ banks |
| Frontend Routing | `frontend/app/` | Expo Router screens |
| Theme | `frontend/src/theme.ts` | Design tokens |
| API Client | `frontend/src/api.ts` | HTTP wrapper |
| i18n | `frontend/src/i18n.ts` | 9-language support |

### Navigation Structure
```
/ (splash) → /language → /login → /otp
  → /onboarding/profile → /onboarding/business → /onboarding/assessment
  → (tabs):
      Dashboard · Schemes · AI Advisor · Profile
  → scheme/[id] · bank/[id] · /booking · /banks · /banks-compare
  → /admin/* (role-gated)
```

---

## 2. EXISTING FEATURES

### ✅ Implemented & Working
- **Phone auth** — Mock OTP (dev) + Firebase Phone Auth (prod-ready)
- **9-language support** — EN, HI, GU, MR, BN, TA, TE, KN, PA
- **3-step onboarding** — Personal → Business → Assessment
- **Scheme matching** — Rule-based scoring + LLM reason generation (GPT-4o)
- **25+ government schemes** — PMEGP, Mudra, Stand-Up India, CGTMSE, ECLGS, PM Vishwakarma, Startup India, etc.
- **Funding readiness score** — 7-component 0-100 score with action items
- **AI Advisor (Chat)** — Free-form GPT-4o conversation with history
- **AI Advisor (Strategy)** — Structured funding roadmap (schemes, banks, docs, steps)
- **Bank recommendations** — Deterministic scoring for 15+ banks
- **Bank comparison** — Side-by-side view
- **Consultation booking** — Type + date + time slot selection
- **Smart alerts** — Rule-engine + notification inbox
- **Admin console** — Users, schemes, consultations, leads, analytics, CSV exports
- **Role-based access** — 6 roles (user, super_admin, manager, expert, sales_exec, support_exec)
- **CRM lead pipeline** — 8-stage lead tracking auto-created from consultations
- **Pull-to-refresh** — Dashboard + screens
- **Test IDs** — All interactive elements have testID for E2E automation
- **pytest backend tests** — Integration tests for auth, health

---

## 3. MISSING FEATURES

### Critical for Play Store (P0)
| # | Feature | Impact |
|---|---|---|
| 1 | **Push Notifications (FCM)** | Alerts are generated but never pushed to device; inbox only |
| 2 | **App Privacy Policy & Terms screen** | Required by Play Store policy |
| 3 | **Document upload** | Advisor tells users to prepare docs but there's no upload mechanism |
| 4 | **Offline error state** | No graceful handling of no-internet scenario |
| 5 | **Empty state illustrations** | No data states are plain text only |
| 6 | **App Icon + Splash in production quality** | Current icon is a placeholder "S" square |
| 7 | **Firebase Phone Auth fully enabled** | Currently mock-only; Firebase SDK not wired in frontend |

### High-Value Missing (P1)
| # | Feature | Impact |
|---|---|---|
| 8 | **Scheme saved/bookmarked list** | Users can't save interesting schemes |
| 9 | **Applied schemes tracker** | No way to mark a scheme as "applied" |
| 10 | **Profile edit after onboarding** | Profile is view-only post-onboarding |
| 11 | **Bank application deeplink/redirect** | Bank card leads nowhere actionable |
| 12 | **Progress tracker for applications** | No loan/scheme application status |
| 13 | **Share scheme** | Can't share a scheme card with someone |
| 14 | **Consultation reschedule/cancel** | Booked consultations can't be modified by user |
| 15 | **Notification preferences** | No granular notification control |

### Revenue/Monetization Missing (P2)
| # | Feature | Impact |
|---|---|---|
| 16 | **Loan application funnel** | No in-app bank application form |
| 17 | **Premium tier / Pro features** | No monetization layer |
| 18 | **Referral system** | No viral growth mechanic |
| 19 | **Document checklist PDF export** | High-value convenience feature |
| 20 | **Callback request flow** | Users can't request a callback beyond booking |

---

## 4. TECHNICAL DEBT

### Backend
| Issue | Severity | File |
|---|---|---|
| `server.py` is 769 LOC — single monolith file | HIGH | `server.py` |
| No API versioning (`/api/v1/`) | MEDIUM | `server.py` |
| Hardcoded mock OTP code `"123456"` | HIGH | `auth_service.py` |
| No rate limiting on OTP endpoint | HIGH | `server.py` |
| No input sanitization beyond Pydantic validation | MEDIUM | `server.py` |
| `motor` (async) + `pymongo` (sync) both imported | LOW | `requirements.txt` |
| `pandas`/`numpy` imported but only used for CSV export | LOW | `requirements.txt` |
| No pagination on `/schemes`, `/users`, `/leads` list endpoints | MEDIUM | `server.py` |
| No request timeout configuration | MEDIUM | `server.py` |
| LLM errors silently fall back without logging to ops | MEDIUM | `ai_service.py` |
| No API response caching (readiness, matches recomputed on every request) | MEDIUM | `server.py` |
| `EMERGENT_LLM_KEY` env var silently empty if not set | HIGH | `ai_service.py` |
| No database indexes defined — full collection scans | HIGH | `server.py` |
| Admin role check is a simple string set comparison — no middleware | MEDIUM | `server.py` |

### Frontend
| Issue | Severity | File |
|---|---|---|
| No global state management — prop drilling risk at scale | MEDIUM | Architecture |
| Auth token stored in AsyncStorage on web (not secure) | HIGH | `storage/index.web.ts` |
| No error boundary components | HIGH | Architecture |
| API errors are swallowed with `.catch(() => [])` pattern | HIGH | Multiple screens |
| No loading skeletons — just spinners | MEDIUM | All screens |
| `any` type used extensively — 50+ instances | MEDIUM | All screens |
| No form validation library — manual string checks | LOW | Onboarding |
| Emoji used as icons throughout (no consistent icon system) | MEDIUM | All screens |
| No accessibility (a11y) attributes (`accessibilityLabel`, `accessibilityRole`) | HIGH | All screens |
| `useFocusEffect` triggers full reload on every tab switch | MEDIUM | Dashboard |
| No image caching strategy | LOW | App-wide |
| `.env` not documented | LOW | Root |

---

## 5. SECURITY ISSUES

| # | Issue | Severity | Details |
|---|---|---|---|
| S1 | **Mock OTP hardcoded to `123456`** | CRITICAL | Any mobile number can log in with this code in production |
| S2 | **No OTP rate limiting** | CRITICAL | `/auth/send-otp` has no rate limit — SMS bombing risk |
| S3 | **Token is just `user.id` (UUID)** | HIGH | Bearer token = MongoDB document ID. No expiry, no signing |
| S4 | **No token expiration** | HIGH | Tokens never expire; compromised tokens are permanent |
| S5 | **Auth token on web in localStorage** | HIGH | XSS-accessible; should use httpOnly cookies for web |
| S6 | **No HTTPS enforcement** | HIGH | Backend doesn't force HTTPS redirect |
| S7 | **CORS allows all origins** | MEDIUM | `CORSMiddleware(allow_origins=["*"])` |
| S8 | **Admin endpoints only check role string** | MEDIUM | No middleware audit logging for admin actions |
| S9 | **No request size limits** | MEDIUM | Large payloads to `/advisor/chat` could cause DoS |
| S10 | **`FIREBASE_SERVICE_ACCOUNT_JSON` in env string** | MEDIUM | Private key material in environment variable — should use file reference |
| S11 | **No SQL/NoSQL injection protection beyond Pydantic** | LOW | MongoDB queries use `{field: value}` pattern — safe, but unaudited |
| S12 | **LLM prompt injection via advisor chat** | MEDIUM | User input injected directly into system prompt via history |

---

## 6. PERFORMANCE ISSUES

| # | Issue | Impact |
|---|---|---|
| P1 | **Dashboard makes 6 parallel API calls on every focus** | HIGH — 6 round-trips on tab switch |
| P2 | **No pagination** — all schemes loaded in one request | MEDIUM — scales poorly |
| P3 | **`match_schemes_with_llm` called synchronously in request thread** | HIGH — LLM call blocks API response for 3-8s |
| P4 | **No Redis/cache layer** — readiness + match computed fresh every request | MEDIUM |
| P5 | **No MongoDB indexes** — `user_id`, `mobile` lookups are full scans | HIGH at scale |
| P6 | **`ai_conversations` stores entire history as document** — grows unbounded | MEDIUM |
| P7 | **Scheme list with no virtual scrolling** | MEDIUM — 25+ items, all rendered |
| P8 | **No image optimization** | LOW — splash/icon not optimized |
| P9 | **Bundle not split** — entire app loads upfront | LOW — Expo default |
| P10 | **Re-render on every keystroke in scheme search** — no debounce | MEDIUM |

---

## 7. UI ISSUES

### Critical UI Problems
| # | Screen | Issue |
|---|---|---|
| U1 | All screens | **Emoji used as all icons** — inconsistent rendering across Android OEM, looks amateur |
| U2 | Dashboard | **Green hero card (#22C55E) with white text** — score readable but supporting stats ("Eligible Funding", "Estimated Subsidy") use low-contrast label text (#DCFCE7 on green) |
| U3 | All screens | **No custom font** — system default font (Roboto/San Francisco) — no premium feel |
| U4 | Login | **Logo is a green square with "S"** — not a real brand mark |
| U5 | Dashboard | **No visual hierarchy between card types** — readiness, alerts, bank, CTAs all look identical |
| U6 | Schemes | **Search input fires API on every character** — no debounce, jumpy UX |
| U7 | Advisor | **Chat bubbles lack timestamps** — can't tell when conversation happened |
| U8 | Advisor | **Structured roadmap card is styled same as chat bubbles** — premium feature looks plain |
| U9 | Profile | **Avatar is just first initial in green circle** — placeholder, not premium |
| U10 | Booking | **Confirmation screen has no animation** — just a static checkmark |
| U11 | All screens | **Tab bar uses emoji labels (🏠, 📋, 🤖, 👤)** — looks like a prototype |
| U12 | Onboarding | **Step progress bar is very thin (3px)** — easy to miss |
| U13 | All screens | **No haptic feedback on primary actions** — dead touch feel |
| U14 | All screens | **Loading state is a centered spinner** — no skeleton screens |
| U15 | Banks | **No visual differentiation between Public/Private banks** |
| U16 | Scheme detail | **Plain scrollable text** — eligibility/benefits/documents not formatted as scannable lists |
| U17 | Dashboard | **Alerts widget uses small 8px dot** — unnoticeable |
| U18 | All screens | **Card shadows are too subtle (opacity 0.05)** — cards feel flat on Android |
| U19 | Booking | **Date strip uses only day number + weekday** — month name missing (ambiguous) |
| U20 | Profile | **Last row in card has bottom border cut off** — visual bug |

### Typography Issues
- Only system fonts (no Inter, Poppins, or DM Sans)
- Mixed `fontWeight` values (700, 800, 600) without a clear type scale rationale
- Line height only set on `body` style — headings have no `lineHeight`
- Caption text at 11px is below WCAG minimum readable size on small phones

### Spacing Inconsistencies
- Inline `padding: spacing.md` mixed with hard-coded `padding: 12`, `padding: 24`
- `marginBottom: 12` and `marginBottom: spacing.md` (= 16) used interchangeably
- Header padding varies between screens (8, 12, 16)

### Color System Gaps
- `warning: "#F59E0B"` defined but never used
- No `success` color separate from `primary`
- No surface hierarchy for dark-mode readiness
- `surfaceAlt: "#F3F4F6"` used as both background AND card background

---

## 8. PLAY STORE READINESS ASSESSMENT

### Blockers (Must fix before submission)
| # | Blocker | Category |
|---|---|---|
| B1 | **Firebase Phone Auth not connected in frontend** | Functionality |
| B2 | **Mock OTP `123456` shipped to production** | Security |
| B3 | **No Privacy Policy screen / URL in app** | Policy requirement |
| B4 | **No Terms of Service screen** | Policy requirement |
| B5 | **App icon is a placeholder "S" square** | Store listing quality |
| B6 | **Splash screen needs production design** | Store listing quality |
| B7 | **No deep link / intent filter config in `app.json`** | Functionality |
| B8 | **Push notifications (FCM) not integrated** | Core feature promise |
| B9 | **No offline / no-internet error handling** | UX requirement |
| B10 | **`EXPO_PUBLIC_BACKEND_URL` not set** — app crashes with no backend | Config |

### Ready ✅
- Expo 54 build system (EAS Build)
- React Native screens + gesture handler configured
- Safe area handling on iOS/Android
- testID coverage for Play Store QA team
- 9-language support
- Dynamic font scaling (RN default)
- 48dp touch targets on primary actions

### Yellow Flags (Fix before launch, not blocking submission)
- No app rating prompt after first consultation booking
- No onboarding skip option for returning users
- No "what's new" / changelog screen
- No analytics SDK (PostHog, Mixpanel, Firebase Analytics)
- No crash reporting (Sentry, Crashlytics)
- No A/B test framework

---

## SUMMARY SCORECARD

| Dimension | Score | Comment |
|---|---|---|
| Architecture | 6/10 | Clean separation, but monolith server.py |
| Security | 3/10 | Mock OTP in prod, no token expiry, CORS wildcard |
| Performance | 5/10 | No caching, no DB indexes, LLM blocks thread |
| UI/UX | 4/10 | Functional but not premium; emoji icons, no custom font |
| Feature Completeness | 6/10 | Core loop works; missing push notifs, doc upload, profile edit |
| Play Store Readiness | 3/10 | 10 hard blockers before submission |
| Code Quality | 6/10 | Clean patterns, but heavy `any` types and swallowed errors |
| **Overall** | **4.7/10** | **Strong MVP foundation; needs focused hardening** |
