# SARAL FUNDING V2 — PRODUCT ROADMAP
**Date:** 2026-06-09  
**Goal:** Transform MVP into a premium, Play Store-ready fintech application  
**Design Benchmark:** Quality comparable to Groww / Zerodha / Navi — original Saral Funding identity

---

## RANKING METHODOLOGY

Each improvement is scored on:
- **Revenue Impact (R):** 1–5 (5 = direct revenue driver)
- **User Impact (U):** 1–5 (5 = affects every user every session)
- **Effort (E):** S / M / L / XL (S = <1 day, M = 1-3 days, L = 3-7 days, XL = 1+ week)
- **Priority:** (R + U) / Effort weight → P0 / P1 / P2 / P3

---

## PHASE 0 — PLAY STORE LAUNCH BLOCKERS
*Must complete before any public release. Est: 5–7 days total.*

| # | Improvement | R | U | Effort | Why Now |
|---|---|---|---|---|---|
| 0.1 | **Disable mock OTP; wire Firebase Phone Auth in frontend** | 5 | 5 | M | Security critical — current `123456` code is a backdoor |
| 0.2 | **OTP rate limiting** (max 3 attempts / 10 min per mobile) | 5 | 4 | S | Prevent SMS bombing |
| 0.3 | **JWT token signing + expiry** (replace UUID as token) | 5 | 4 | M | Current tokens never expire and aren't signed |
| 0.4 | **Privacy Policy + Terms of Service screens** | 3 | 3 | S | Play Store requirement — hard reject without these |
| 0.5 | **Production app icon + splash screen** | 2 | 5 | S | Store listing quality; first impression |
| 0.6 | **Offline / no-internet error state** | 2 | 5 | S | App currently crashes silently with no backend |
| 0.7 | **MongoDB indexes** (`user_id`, `mobile`, `scheme_id`) | 4 | 4 | S | Without indexes, every query is a full scan |
| 0.8 | **Push notifications (FCM)** | 4 | 5 | L | Alerts exist in DB but never delivered to device |
| 0.9 | **CORS lock-down** (replace `*` with production domain) | 3 | 1 | S | Security hygiene |
| 0.10 | **Set `EXPO_PUBLIC_BACKEND_URL` + document `.env`** | 3 | 5 | S | App crashes with no backend URL |

---

## PHASE 1 — UI PREMIUM UPGRADE (Highest User Impact)
*Transform visual quality to fintech-grade. Est: 8–12 days.*

Constraint: Green (#22C55E) branding · White backgrounds · Black typography · No blue · No copy of Groww/Zerodha/Navi

### 1A. Foundation (Do First)

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 1.1 | **Custom font system** | 2 | 5 | S | Add DM Sans (numbers) + Inter (body). Load via `expo-font`. Replace all system fonts. Single biggest premium-feel upgrade. |
| 1.2 | **Replace all emoji icons with Lucide icons** | 2 | 5 | M | `lucide-react-native` already installed. Tabs, cards, actions — all emoji replaced. Consistent weight and color. |
| 1.3 | **Consistent spacing system** | 2 | 4 | S | Audit all hard-coded `padding: 12/14/24` and replace with `spacing.*` tokens. Add `spacing.xs2 = 2`, `spacing.sm2 = 6`. |
| 1.4 | **Skeleton loading screens** | 2 | 5 | M | Replace all `<ActivityIndicator>` with shimmer skeletons for dashboard, schemes, advisor. Eliminates jarring spinner flash. |
| 1.5 | **Error boundary + empty state components** | 2 | 5 | M | Global error boundary. Per-screen empty states with illustration + CTA instead of plain text. |

### 1B. Dashboard Redesign

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 1.6 | **Readiness Score hero card** | 3 | 5 | M | Replace flat green card with arc/donut progress ring. Score animates from 0 on load. Stats below with clear label contrast. |
| 1.7 | **Card visual hierarchy system** | 2 | 5 | M | 3 card levels: Primary (elevated, 12px radius, stronger shadow), Secondary (standard), Tertiary (flat/muted). Not all cards look the same. |
| 1.8 | **Tab bar redesign** | 2 | 5 | S | Remove emoji from tab labels. Use Lucide icons with label below. Active tab: filled icon + primary color. Subtle top indicator. |
| 1.9 | **Dashboard header with greeting** | 2 | 4 | S | Time-aware greeting ("Good morning, Rajesh"). Notification bell with proper badge count. Clean 56dp header. |
| 1.10 | **Smart Alerts redesign** | 3 | 4 | S | Alert items with type icon (🎯 scheme, 🏦 bank, ⚡ urgent). Color-coded left border. Swipe-to-dismiss. |

### 1C. Scheme Discovery Redesign

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 1.11 | **Debounced search** (300ms) | 2 | 4 | S | Stop firing API on every keystroke. Add search icon inside input. |
| 1.12 | **Scheme card with match score badge** | 3 | 5 | S | If scheme is in user's matches, show match % badge on card. Visual priority indicator. |
| 1.13 | **Category chips with icons** | 1 | 4 | S | MSME → icon + label. Agriculture → 🌾 → Lucide leaf icon. |
| 1.14 | **Scheme detail page upgrade** | 3 | 5 | M | Replace plain text sections with accordion cards. Eligibility as checklist. Documents as chips. Process as numbered timeline. |
| 1.15 | **Save scheme button** | 3 | 5 | M | Bookmark icon on every scheme card. Saved schemes section in Profile. |

### 1D. AI Advisor Upgrade

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 1.16 | **Chat message timestamps** | 1 | 4 | S | Add relative timestamp ("2 min ago") to each message bubble. |
| 1.17 | **Typing indicator animation** | 1 | 4 | S | Three-dot bounce animation while advisor thinks. Replaces static "Advisor is thinking…" text. |
| 1.18 | **Structured roadmap card upgrade** | 4 | 5 | M | Premium card design for Strategy mode. Section headers with icons. Scheme/bank items as tappable cards (navigate to detail). Progress-style roadmap. |
| 1.19 | **Suggestion chips refresh** | 2 | 4 | S | Rotate suggestion chips based on user profile (woman → show "Schemes for women entrepreneurs"). |
| 1.20 | **Chat history persistence indicator** | 1 | 3 | S | Show "Conversation from [date]" when loading history. |

### 1E. Consultation Booking Upgrade

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 1.21 | **Date strip with month name** | 1 | 4 | S | "Mon 9 Jun" — currently shows only day number + weekday. Ambiguous. |
| 1.22 | **Confirmation animation** | 2 | 4 | S | Lottie or React Native Reanimated checkmark animation on booking confirmation. |
| 1.23 | **My Bookings view in Profile** | 3 | 4 | M | List of user's consultations with status. Currently only visible on admin side. |
| 1.24 | **Cancel / Reschedule flow** | 3 | 4 | M | Allow user to cancel up to 1hr before slot. Admin is notified. |

### 1F. Profile + Auth Polish

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 1.25 | **Profile edit mode** | 3 | 5 | M | Allow editing name, district, age after onboarding. Business profile editable. Triggers match recompute. |
| 1.26 | **Login screen premium polish** | 2 | 5 | S | Real logomark (SVG). Tagline. "Trusted by X entrepreneurs" social proof line. |
| 1.27 | **Onboarding step indicator** | 1 | 4 | S | Thicker, animated step bar (6px, animated fill). Step title below ("Step 1 of 3: Your Profile"). |
| 1.28 | **Language screen redesign** | 1 | 4 | S | 3×3 grid of language cards with flag/script sample. Currently a flat list. |

---

## PHASE 2 — ARCHITECTURE IMPROVEMENTS
*Reduce tech debt, improve reliability. Est: 6–9 days.*

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 2.1 | **Split `server.py` into routers** | 2 | 1 | M | `routers/auth.py`, `routers/schemes.py`, `routers/advisor.py`, `routers/admin.py`. FastAPI `include_router`. |
| 2.2 | **Add Zustand for global state** | 2 | 3 | M | Auth state, user profile, language → global store. Eliminates per-screen refetches. |
| 2.3 | **API response caching** (Redis or in-memory TTL) | 3 | 4 | M | Cache readiness score (5 min TTL), scheme matches (until profile changes), bank recs (30 min). |
| 2.4 | **Async LLM with background task** | 3 | 5 | M | Move `match_schemes_with_llm` to FastAPI `BackgroundTask`. Return immediately; frontend polls. |
| 2.5 | **Pagination on list endpoints** | 2 | 3 | S | `?page=1&limit=20` on `/schemes`, `/admin/users`, `/admin/leads`. |
| 2.6 | **TypeScript `any` audit** | 1 | 2 | M | Replace `any` with proper interfaces. Prevents runtime surprises. |
| 2.7 | **Error boundary components** | 2 | 4 | S | Wrap each tab with an `ErrorBoundary`. Show "Something went wrong" + retry. |
| 2.8 | **API versioning** (`/api/v1/`) | 2 | 1 | S | Future-proof before growing the client base. |
| 2.9 | **Sentry crash reporting** | 3 | 4 | S | Frontend + backend. Essential for post-launch ops. |
| 2.10 | **Analytics SDK** (Firebase Analytics / PostHog) | 3 | 2 | S | Track screen views, scheme clicks, advisor usage, booking funnel. |

---

## PHASE 3 — SECURITY HARDENING
*Non-negotiable before any production user data. Est: 3–4 days.*

| # | Improvement | R | U | Effort | Details |
|---|---|---|---|---|---|
| 3.1 | **JWT tokens with HS256 signing + 7-day expiry** | 5 | 4 | S | Replace UUID-as-token. Add `python-jose` (already in requirements). |
| 3.2 | **OTP rate limiting middleware** | 5 | 3 | S | `slowapi` or custom Redis counter. 3 OTPs per mobile per 10 min. |
| 3.3 | **Token refresh flow** | 3 | 3 | M | Refresh token (30-day) + access token (24h). Frontend auto-refresh. |
| 3.4 | **Admin action audit log** | 3 | 1 | S | Log every admin write action to `admin_audit` collection. |
| 3.5 | **Request size limit** on advisor chat | 2 | 1 | S | 4KB max on message body. FastAPI `Request` body limit. |
| 3.6 | **LLM prompt injection defense** | 3 | 2 | S | Strip user messages of system-instruction-like patterns before injection into context. |

---

## PHASE 4 — MONETIZATION OPPORTUNITIES
*Build the revenue engine.*

| # | Opportunity | Revenue Model | R | Effort | Details |
|---|---|---|---|---|---|
| 4.1 | **Bank lead referral** | Revenue share per loan disbursed | 5 | L | "Apply Now" button on bank card → Bank partner form. Affiliate tracking. |
| 4.2 | **Premium AI Advisor (Pro)** | ₹199/month subscription | 5 | L | Basic: 5 strategy queries/month. Pro: Unlimited + document checklist PDF + priority consultation. |
| 4.3 | **Consultation fee** | ₹299–₹999 per session | 4 | M | Currently "Free" — add paid expert tier. Free = automated, Paid = human expert. |
| 4.4 | **Document preparation service** | ₹499–₹1999 per service | 4 | L | "We'll prepare your Udyam / GST application" as in-app service. |
| 4.5 | **Scheme application assistance** | Commission per approved application | 5 | XL | Guided, human-assisted application submission for PMEGP, Mudra etc. |
| 4.6 | **B2B: CA / Consultant white-label** | SaaS ₹2999/month | 3 | XL | Admin console white-labelled for CAs to manage their client applications. |
| 4.7 | **Referral program** | ₹100 per referred user who books | 3 | M | "Refer a friend" → both get a free consultation credit. |

---

## PHASE 5 — PLAY STORE GROWTH FEATURES

| # | Feature | R | U | Effort |
|---|---|---|---|---|
| 5.1 | **App rating prompt** after first successful consultation | 4 | 3 | S |
| 5.2 | **Share scheme as image** (card shareable to WhatsApp) | 3 | 4 | M |
| 5.3 | **WhatsApp Business API for consultation reminders** | 4 | 4 | L |
| 5.4 | **Loan EMI calculator** widget on bank cards | 3 | 4 | S |
| 5.5 | **News feed** — government scheme announcements | 2 | 3 | L |
| 5.6 | **Vernacular voice input** for AI advisor | 3 | 4 | XL |
| 5.7 | **Document upload & checklist** | 4 | 5 | L |

---

## IMPLEMENTATION SEQUENCE (RECOMMENDED)

```
Week 1: Phase 0 — All launch blockers
         + Phase 1A — Foundation (fonts, icons, spacing, skeletons)

Week 2: Phase 1B + 1C — Dashboard + Schemes redesign
         + Phase 3 — Security hardening (parallel work)

Week 3: Phase 1D + 1E + 1F — Advisor, Booking, Profile
         + Phase 2.1-2.5 — Core architecture improvements

Week 4: Phase 2.6-2.10 — Code quality + observability
         Play Store submission preparation

Month 2: Phase 4 — Monetization (bank referrals first — highest ROI)
Month 3: Phase 5 — Growth features
```

---

## DESIGN SYSTEM FOR V2

### Typography Scale (DM Sans + Inter)
```
Display: DM Sans 32/40px, weight 800, tracking -0.5
H1:      DM Sans 24/32px, weight 700, tracking -0.3
H2:      DM Sans 20/28px, weight 700
H3:      Inter 18/24px, weight 600
Body Lg: Inter 16/24px, weight 400
Body:    Inter 14/20px, weight 400
Caption: Inter 12/16px, weight 500, uppercase, tracking +0.5
Micro:   Inter 11/16px, weight 500
```

### Color Additions Needed
```javascript
// Add to theme.ts:
colors.primaryLight = "#4ADE80"    // lighter green for gradients
colors.success = "#16A34A"         // success states (distinct from primary)
colors.surface1 = "#FFFFFF"        // cards
colors.surface2 = "#F9FAFB"        // page backgrounds
colors.surface3 = "#F3F4F6"        // subtle fills
colors.textPrimary = "#111827"     // main text (slightly warmer than pure black)
colors.textSecondary = "#6B7280"   // secondary
colors.textTertiary = "#9CA3AF"    // placeholders
```

### Elevation System
```
Level 0 (flat):    no shadow, border: 1px #E5E7EB
Level 1 (card):    shadow(0,1,3, 0.08) + border: none
Level 2 (modal):   shadow(0,4,12, 0.12)
Level 3 (drawer):  shadow(0,8,24, 0.16)
```

### Component Specifications
- **Button heights:** Primary 52dp, Secondary 44dp, Small 36dp
- **Input height:** 52dp minimum
- **Card radius:** 16px for feature cards, 12px for list cards, 8px for chips
- **Tab bar height:** 68dp (with safe area)
- **Bottom sheet**: 24px top radius

---

## SUCCESS METRICS FOR V2

| Metric | Current (MVP) | V2 Target |
|---|---|---|
| Play Store rating | N/A (not listed) | ≥4.2 in first month |
| Onboarding completion rate | Unknown | ≥70% |
| D7 retention | Unknown | ≥40% |
| Advisor session rate | Unknown | ≥30% of active users/week |
| Consultation booking rate | Unknown | ≥15% of active users |
| Crash-free session rate | Unknown | ≥99.5% |
| App Store approval | Blocked | ✅ Approved |

---

*Next step: Review and approve this roadmap. Then begin Phase 0 immediately.*
