# Saral Funding — Feature Documentation

Complete reference for all user-facing and admin-facing features.

---

## USER SIDE

### 1. Authentication

**Login with Mobile OTP**
- User enters 10-digit mobile number
- OTP sent via MSG91 SMS (or mock OTP `123456` in development)
- 6-digit OTP verified; JWT access + refresh token issued
- Rate limited: 5 OTP sends per 10 minutes
- Returning users skip onboarding directly to dashboard

---

### 2. Onboarding (2-Step)

**Step 1 — Personal Profile** (`/onboarding/profile`)
- Full name
- State (Indian state picker)
- District
- Gender (Male / Female / Other)
- Age
- Category (General / OBC / SC / ST / Minority)
- Language preference

**Step 2 — Business Details + Assessment** (`/onboarding/business`)
- Business stage (New / Existing)
- Industry (Manufacturing / Service / Trading / Agriculture)
- Funding required (₹ amount)
- Annual turnover (₹ amount)
- Number of employees
- GST registration status (toggle)
- Udyam registration status (toggle)
- Business location (state)
- Woman entrepreneur (toggle)
- Existing loans (toggle)

On submit: both `/business-profile` and `/funding-assessment` are called simultaneously. AI scheme matching is triggered automatically.

---

### 3. Home Dashboard (`/tabs/index`)

- Readiness score ring (0–100) with tips to improve
- Upcoming consultation card (tappable → shows meet link)
- Matched schemes summary (top 3 with score + funding estimate)
- Bank recommendations
- Smart alerts (GST tip, Udyam tip, scheme suggestions)
- Quick action buttons: Book Consultation, Upload Documents, View Schemes
- Admin-sent notifications viewable

**Consultation Meet Modal**
- Tap the upcoming consultation card
- See: consultation type, date, time, status
- Copy meeting link (Share sheet)
- Join meeting button (opens Jitsi Meet in browser)

---

### 4. Schemes Tab (`/tabs/schemes`)

- Browse all active government funding schemes
- Filter by category: All, Startup, MSME, Manufacturing, Agriculture, Women, Students
- Search by scheme name
- Each card shows: name, max funding (₹), match score (if computed), tags
- Tap → Scheme Detail with full eligibility, benefits, documents required, application process

**AI-Matched Schemes** (`/match/me`)
- Schemes ranked by AI match score (0–100)
- Reason for match shown (AI-generated)
- Funding estimate + subsidy estimate per scheme
- Re-compute button to refresh matches

---

### 5. Documents Tab (`/tabs/documents`)

**Upload Documents**
- Supported types: PAN Card, Aadhaar Card, Business Registration, GST Certificate, Udyam Certificate, Bank Statement, ITR, Cancelled Cheque, Address Proof, Passport Photo
- File formats: PDF, JPG, PNG (max 5 MB)
- Uploaded to Azure Blob Storage
- Status tracking: Pending → Verified / Rejected
- Rejection reason shown if rejected

**Document Status**
- Visual badge per document: Pending (yellow), Verified (green), Rejected (red)
- Rejected docs show reason with option to re-upload

---

### 6. AI Advisor Tab (`/tabs/advisor`)

- Free-form chat with AI advisor ("Saathi")
- Powered by OpenAI GPT-4
- Understands Indian MSME funding context
- Structured responses: recommended schemes, banks, required documents, action roadmap
- Chat history persisted per user
- Clear history option

---

### 7. Consultation Booking (`/booking`)

**Book a Free Consultation**
- Select consultation type: Funding Guidance, Government Schemes, Business Loan Consultation, Subsidy Consultation
- Pick date (date picker)
- Pick time slot (10:00 AM – 5:00 PM, every 30 min → 15 slots)
- On confirmation:
  - Booking saved
  - Jitsi Meet link auto-generated (`https://meet.jit.si/SaralFunding{uid}`)
  - CRM lead created automatically
  - GHL opportunity created (if configured)
  - Push notification sent to user

**Confirmation Screen**
- Booking details displayed with animation
- Meeting link card with:
  - Copy Link button (opens system share sheet)
  - Join Meeting button (opens Jitsi in browser)

---

### 8. Banks (`/banks`)

- Browse all partner banks
- Bank card shows: name, short name, logo placeholder
- Filter / search
- Bank Detail: products offered, eligibility, contact info
- Bank Comparison: select up to 3 banks, side-by-side comparison table
- Recommended Banks: AI-matched banks for the user's profile

---

### 9. Readiness Assessment (`/readiness`)

- Funding readiness score (0–100)
- Breakdown by category: Documents, GST, Udyam, Turnover, Employees
- Gap analysis: what's missing and how to fix it
- Tips: "Register GST to unlock 15+ more schemes"
- Link to apply on government portals

---

### 10. My Applications (`/my-applications`)

- List of all scheme applications assigned by admin
- Each application shows: scheme name, bank (if assigned), current stage
- Stage labels: Call Done, Docs Submitted, Scheme Identified, Application Filed, Under Review, Approved, Disbursed, Rejected
- Visual progress indicator per application

---

### 11. My Bank Assignments (`/my/bank-assignments`)

- Banks assigned by admin to this user
- Full bank detail: name, type, eligibility

---

### 12. Notifications (`/notifications`)

- In-app notification inbox
- Unread count badge on bell icon
- Notification types with distinct icons:
  - **High Match** — Target icon, green (scheme matched >80%)
  - **State Scheme** — Building icon, blue (state-specific scheme found)
  - **Readiness** — Zap icon, yellow (readiness tip)
  - **Consultation Reminder** — Bell icon, purple
  - **Platform** — Bell icon, indigo (admin-sent message)
  - **Reminder** — Bell icon, purple
- Mark individual as read (tap)
- Mark All Read button
- Time display: "5m ago", "2h ago", "3d ago", date for older

---

### 13. Settings (`/settings`)

- Language preference (9 Indian languages supported)
- Account deactivation (DPDP-compliant data anonymization)
- Logout

---

### 14. Account Aggregator (`/link-bank`)

- Consent-based financial data sharing via Setu
- Links user's bank accounts
- Enriches business profile with real turnover data
- Improves scheme match accuracy

---

## ADMIN SIDE

All admin screens are accessible only to users with roles: `super_admin`, `manager`, `expert`, `sales_executive`, `support_executive`.

---

### 1. Admin Dashboard (`/admin/index`)

**Overview Metrics (real-time)**
- Total users registered
- Total active leads
- Total consultations booked
- Total documents uploaded
- Documents pending verification
- Schemes assigned count

**Quick Navigation**
- Leads, Consultations, Documents, Users, Schemes, Banks, Analytics, Team, Notifications, Settings

---

### 2. CRM Leads (`/admin/leads`)

**Lead List**
- All leads from consultation bookings
- Filter by stage: All, New, Contacted, Interested, Documentation, Submitted, Approved, Disbursed, Closed
- Each card: user name, mobile, state, stage pill, consultation type, follow-up date
- Tap → Lead Detail

---

### 3. Lead Detail (`/admin/lead/[id]`)

The most feature-rich screen. Full 360° view of a user/lead.

**Header Card**
- User name, mobile, lead stage pill, consultation type tag
- Edit button → opens Update Lead sheet

**User Profile Section**
- State, Category, Mobile, Funding Required

**Business Profile Section**
- Industry, Business Stage, Annual Turnover, GST status, Udyam status

**Uploaded Documents Section**
- All documents the user has uploaded
- Status badge: Pending / Verified / Rejected
- View button → opens document via Azure SAS URL (in browser)
- Verify / Reject buttons for pending docs

**Scheme Applications Section**
- All schemes assigned to this user by admin
- Stage per application (Call Done → Disbursed)
- Stage button → opens stage update sheet with note field
- Remove (trash) button
- `+ Assign Scheme` button → select from all schemes + optional bank + note

**Assigned Banks Section**
- Banks linked to this user

**Notes & Follow-up Section**
- Admin notes about the lead
- Follow-up date

**Send Notification Section**
- Quick template chips: KYC Pending, PAN Missing, Aadhaar Missing, Application Update, Call Scheduled
- Custom title input
- Custom message body input
- Send Notification button → delivers push notification only to this user

**Consultation History Section**
- All consultations booked by this user
- Type, date, time, status

**Activity Timeline Section**
- Immutable log of all actions on this lead
- Events: Lead Created, Stage Changed, Note Added, Follow-up Set
- Actor name + timestamp per event

**Update Lead Sheet (Edit)**
- Notes text input
- Follow-up date (YYYY-MM-DD)
- Stage chips: New → Closed
- Save Changes button → syncs stage to GHL

---

### 4. Consultations (`/admin/consultations`)

**Consultation List**
- Filter by status: All, New, Called, Follow Up, Interested, Submitted, Approved, Closed
- Each card: user name, mobile, consultation type, date + time, status pill, notes preview

**Consultation Detail Sheet**
- Notes input (editable)
- Meeting link card (if Jitsi link was generated):
  - Copy Link button
  - Join Meeting button (opens Jitsi)
- Status update chips
- Tap any status chip to save instantly

---

### 5. Documents (`/admin/documents`)

**Document List (Grouped by User)**
- Tabs: All, Pending, Verified, Rejected
- Documents grouped by user
- Tap user → see all their documents

**Per-User Document View**
- Each document: type, upload date, status badge, view link
- Pending docs: Verify (green) + Reject (red) buttons
- Reject → modal to enter rejection reason
- View → opens Azure SAS URL in browser

---

### 6. Users (`/admin/users`)

- Full user list with search and filter
- Filter by role, state, onboarding step
- User card: name, mobile, state, category, role badge, joined date
- Export users as CSV
- Tap → User Detail

**User Detail (`/admin/user/[id]`)**
- Full profile: personal + business + assessment
- Role management: change user role
- Documents uploaded
- Scheme applications
- Bank assignments
- Recommendations (admin can add scheme/bank suggestions)

---

### 7. Schemes (`/admin/schemes`)

**Scheme List**
- All schemes (active + disabled)
- Search by name
- Category filter chips
- Each card: name, max funding, state coverage, document count

**Create Scheme**
- Modal form with:
  - Name
  - Full name
  - Description
  - Category (multi-select chip picker)
  - Max funding (₹)
  - Max subsidy (%)
  - Documents Required (multi-select chip picker — 10 options)
  - States (multi-select chip picker — all Indian states + "All India")
  - Tags

**Scheme Detail (`/admin/scheme/[id]`)**
- All scheme info
- Assigned users list
- Bulk assign to selected users

**Enable / Disable Scheme**
- Toggle to show/hide scheme from users

---

### 8. Banks (`/admin/banks`)

**Bank List**
- All banks
- Create new bank (modal): name, short name, type, eligibility, products

**Bank Detail (`/admin/bank/[id]`)**
- Full bank info
- Assigned users
- Bulk assign to users

---

### 9. Analytics (`/admin/analytics`)

- Lead stage distribution (bar chart)
- Popular schemes (ranked by assignment count)
- State-wise user distribution
- Consultation trends (by type)
- Export reports: Users CSV, Leads CSV, Consultations CSV, Schemes CSV

---

### 10. Notifications (`/admin/notifications`)

**Broadcast Notifications**
- Send to ALL users or specific users
- Notification types: Platform Update, Scheme Match, Reminder, Recommendation
- Title (80 char limit) + Body (300 char limit) with character counters
- Live preview of how notification appears
- Success feedback showing delivery count

**Targeted Notifications**
- From Lead Detail → Send Notification section
- Pre-built templates for common messages
- Custom title + body
- Delivered only to that specific user

---

### 11. Team (`/admin/team`)

- List all team members
- Invite new team member (by mobile number)
- Assign role: manager, expert, sales_executive, support_executive
- Remove team member

---

### 12. Settings (`/admin/settings`)

- Calendly URL (for consultation booking link)
- WhatsApp business number
- App name / branding config
- GHL integration status
- OTP mode toggle (mock vs real)

---

## Role Permissions

| Feature | super_admin | manager | expert | sales_executive | support_executive |
|---|---|---|---|---|---|
| View leads | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update lead stage | ✓ | ✓ | ✓ | ✓ | — |
| Verify documents | ✓ | ✓ | ✓ | — | ✓ |
| Assign schemes | ✓ | ✓ | ✓ | — | — |
| Create/edit schemes | ✓ | ✓ | — | — | — |
| Manage banks | ✓ | ✓ | — | — | — |
| Send notifications | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage team | ✓ | — | — | — | — |
| Change user roles | ✓ | — | — | — | — |
| View audit logs | ✓ | — | — | — | — |
| Export CSV reports | ✓ | ✓ | — | — | — |
| Admin config | ✓ | — | — | — | — |
