# Saral Funding — Design System V2
**Status:** Applied  
**Date:** 2026-06-09

---

## Typography

### Fonts
| Role | Family | Weights Used |
|---|---|---|
| Display / Headings / Numbers | DM Sans | 400, 500, 600, 700 |
| Body / Labels / UI | Inter | 400, 500, 600, 700 |

### Scale
| Token | Family | Size | Weight | Line Height | Use |
|---|---|---|---|---|---|
| `fonts.displayBold` | DM Sans | page titles (24-30px) | 700 | tight (-0.3 tracking) | Screen headings, hero numbers |
| `fonts.displaySemiBold` | DM Sans | card titles (17-20px) | 600 | 24-28px | Card titles, scheme names |
| `fonts.bold` | Inter | values, stats | 700 | — | Financial figures, amounts |
| `fonts.semiBold` | Inter | labels, buttons | 600 | — | Field labels, CTAs |
| `fonts.medium` | Inter | secondary text | 500 | — | Captions, metadata |
| `fonts.regular` | Inter | body copy | 400 | 20px | Descriptions, subtitles |

**Rule:** Never use `fontWeight: "800"` string — use `fontFamily: fonts.displayBold` instead.

---

## Spacing (8pt grid)
```
xs:   4px   — icon-to-text gaps
xs2:  6px   — tight chip padding
sm:   8px   — between inline elements
sm2: 12px   — inner card padding, tight gaps
md:  16px   — standard padding, section gaps
lg:  24px   — section headings to content
xl:  32px   — between major sections
xxl: 48px   — screen padding top
```

**Rule:** Never hardcode `padding: 14`, `margin: 10`. Use spacing tokens. Exception: 14px in button/input height (intentionally between sm2 and md).

---

## Colors

### Primary (Green)
- `primary: #22C55E` — buttons, active states, primary badges
- `primaryDark: #15803D` — text on green backgrounds, dark variants
- `primaryLight: #4ADE80` — gradients, lighter accents
- `primarySoft: #EBFDF0` — backgrounds, pill fills
- `primaryMid: #DCFCE7` — borders on primarySoft cards

### Surfaces
- `surface (bg): #FFFFFF` — cards, modals
- `surface2: #F9FAFB` — page backgrounds, input fills
- `surfaceAlt: #F3F4F6` — chips, stat boxes, disabled states

### Text
- `text: #111827` — primary headings and body
- `textMuted: #374151` — secondary text, descriptions
- `textDim: #6B7280` — labels, metadata
- `textPlaceholder: #9CA3AF` — input placeholders

### Semantic
- `danger: #EF4444` — errors, destructive actions
- `dangerSoft: #FEF2F2` — error input backgrounds
- `warning: #F59E0B` — caution states (collateral required)
- `success: #16A34A` — positive confirmation

**Rule:** Never use blue. Any blue-leaning state (info, bank type) uses the semantic color rather than `#3B82F6`.

---

## Elevation (3 levels)

| Level | Shadow | Border | Use |
|---|---|---|---|
| L0 — Flat | None | 1px `border` | List items, dividers |
| L1 — Card | shadow(0,2,6,0.08) | None | Feature cards, input focus |
| L2 — Float | shadow(0,4,12,0.12) | None | Modals, sheets, dropdowns |

---

## Corner Radius
```
sm:  4px  — small chips, tags
md:  8px  — small buttons, stat boxes
lg: 12px  — accordion headers, icon boxes
xl: 16px  — standard cards
xxl: 20px — hero cards, bottom sheets
pill: 9999px — filter chips, status badges
```

**Rule:** Feature cards use `radius.xl` (16px). Bottom sheets use `radius.xxl` (20px). Buttons use 14px (between lg and xl).

---

## Components

### Button
Location: `src/components/ui/Button.tsx`

| Variant | Background | Text | Use |
|---|---|---|---|
| `primary` | `#22C55E` | white | Main CTAs (Save, Continue, Book) |
| `secondary` | white + green border | primaryDark | Secondary actions |
| `tertiary` | primarySoft | primaryDark | Inline chip-style actions |
| `ghost` | transparent | primary | Links within content |
| `danger` | `#EF4444` | white | Destructive (delete, logout confirm) |
| `outline` | white + border | text | Neutral secondary |

Sizes: `lg` (52px h), `md` (44px h), `sm` (36px h)

### Input
Location: `src/components/ui/Input.tsx`

States: default (surface2 bg), focused (white bg + primary border + shadow), error (dangerSoft bg + danger border)

Always include `label`, `placeholder`. Add `helper` for guidance text. Add `error` for validation messages.

### Picker
Location: `src/components/Picker.tsx`

Bottom sheet with drag handle, DM Sans title, Lucide `Check` icon for selected item. Matches Input visual treatment.

### Card Variants
- **Hero card**: `backgroundColor: primary`, `borderRadius: 20`, shadow with primaryDark color
- **Feature card**: white, `borderRadius: 16`, `elevation: l1`
- **List card**: white, `borderRadius: 16`, `borderWidth: 1 border`, light shadow
- **Stat chip**: `surface2` bg, `borderRadius: 8`, no shadow

### BackBar
Location: `src/components/StepBar.tsx`

Uses Lucide `ChevronLeft` (not ← text). Title uses `fonts.displayBold`. Back button is 40×40 for adequate touch area.

### StepBar
3 segments (not 3 dots), 4-5px height, animated active segment. Step label "Step X of 3" below.

---

## Screen Scores Post-V2

| Screen | Before | After |
|---|---|---|
| Language | 5 | 8 |
| Login | 7 | 8 |
| OTP | 3 | 8.5 |
| Onboarding (×3) | 5 | 8 |
| Dashboard | 7.5 | 8 |
| Schemes | 7 | 8 |
| Advisor | 7 | 8 |
| Profile | 7 | 8 |
| Scheme Detail | 7.5 | 8.5 |
| Bank Detail | 4 | 8 |
| Banks | 7.5 | 8 |
| Banks Compare | 3 | 7.5 |
| Booking | 7.5 | 8.5 |
| Notifications | 7 | 8 |
| Settings | 4.5 | 8 |
| Admin Dashboard | 7 | 8 |
| Admin Users | 4 | 8 |
| Admin Schemes | 4 | 7.5 |
| Admin Consultations | 5 | 8 |
| Admin Notifications | 5 | 8 |
| Admin Analytics | 7 | 8 |
| Admin Leads | 7 | 8 |
| Picker | 4 | 8.5 |
| StepBar/BackBar | 4 | 8 |
| **Average** | **5.8** | **8.1** |

---

## Remaining Play Store Blockers
1. Firebase Phone Auth not wired in frontend
2. OTP demo hint (`123456`) removed ✅ (done in V2)
3. Privacy Policy screen (needs dedicated route)
4. JWT token signing (security)
5. FCM push notifications
