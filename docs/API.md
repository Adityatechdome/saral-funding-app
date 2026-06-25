# Saral Funding — API Reference

Base URL: `http://localhost:8000/api` (development) or your production domain.

All authenticated endpoints require: `Authorization: Bearer {access_token}`

---

## Authentication

### Send OTP
```
POST /auth/send-otp
Body: { "mobile": "9XXXXXXXXX" }
Response: { "ok": true }
Rate limit: 5 requests / 10 min per mobile
```

### Verify OTP
```
POST /auth/verify-otp
Body: { "mobile": "9XXXXXXXXX", "otp": "123456" }
Response: {
  "access_token": "...",
  "refresh_token": "...",
  "user": { id, mobile, role, onboarding_step, full_name, ... }
}
```

### Refresh Token
```
POST /auth/refresh
Body: { "refresh_token": "..." }
Response: { "access_token": "...", "refresh_token": "..." }
```

### Logout
```
POST /auth/logout
Body: { "refresh_token": "..." }
Response: { "ok": true }
```

### Get Current User
```
GET /auth/me
Response: { id, mobile, role, onboarding_step, full_name, state, ... }
```

---

## Onboarding

### Save Profile (Step 1)
```
POST /profile
Body: {
  "full_name": "str",
  "state": "str",
  "district": "str",
  "gender": "Male|Female|Other",
  "age": int,
  "category": "General|OBC|SC|ST|Minority"
}
Response: { "ok": true }
```

### Save Business Profile (Step 2)
```
POST /business-profile
Body: {
  "business_stage": "new|existing",
  "industry": "Manufacturing|Service|Trading|Agriculture",
  "funding_required": int,
  "annual_turnover": int,
  "employees": int,
  "gst_available": bool,
  "udyam_available": bool
}
Response: { "ok": true }
```

### Save Funding Assessment (Step 2, called with business-profile)
```
POST /funding-assessment
Body: {
  "business_type": "str",
  "funding_requirement": int,
  "business_location": "str",
  "existing_business": bool,
  "woman_entrepreneur": bool,
  "gst_registration": bool,
  "udyam_registration": bool,
  "existing_loans": bool
}
Response: { "ok": true }
Triggers: AI scheme matching computation
```

---

## Schemes

### List Schemes
```
GET /schemes?category=MSME&state=Maharashtra&search=mudra
Response: [ { id, name, max_funding, categories, states, tags, disabled }, ... ]
```

### Get Scheme Detail
```
GET /schemes/{scheme_id}
Response: { id, name, full_name, description, eligibility, benefits, max_funding,
            max_subsidy_percent, documents, process, categories, states, tags }
```

### Get AI-Matched Schemes
```
GET /match/me
Response: {
  matches: [
    { scheme_id, scheme_name, match_score, reason, funding_estimate, subsidy_estimate }
  ],
  computed_at: "iso8601"
}
```

### Recompute Matches
```
POST /match/recompute
Response: { "ok": true }
```

---

## Banks

### List Banks
```
GET /banks
Response: [ { id, name, short_name, type, eligibility, products }, ... ]
```

### Get Bank Detail
```
GET /banks/{bank_id}
Response: { id, name, short_name, type, eligibility, products, contact }
```

### Recommended Banks
```
GET /banks/recommend/me
Response: [ { bank_id, bank_name, reason, score }, ... ]
```

### Compare Banks
```
POST /banks/compare
Body: { "bank_ids": ["id1", "id2", "id3"] }
Response: { banks: [...], comparison_table: {...} }
```

---

## Documents

### Upload Document
```
POST /documents/upload
Content-Type: multipart/form-data
Form: { file: File, doc_type: "PAN Card|Aadhaar Card|..." }
Max size: 5 MB | Formats: PDF, JPG, PNG
Response: { id, doc_type, status: "pending", file_name, created_at }
```

### List My Documents
```
GET /documents/me
Response: [ { id, doc_type, status, file_name, created_at, reject_reason }, ... ]
```

### Delete Document
```
DELETE /documents/{doc_id}
Only allowed for pending documents
Response: { "ok": true }
```

### Download Document (user)
```
GET /documents/{doc_id}/download
Response: { "url": "https://azure...?sas=...&expires=5min" }
```

---

## Consultations

### Book Consultation
```
POST /consultations
Body: {
  "consultation_type": "Funding Guidance|Government Schemes|...",
  "date": "YYYY-MM-DD",
  "time_slot": "10:00 AM"
}
Response: {
  id, consultation_type, date, time_slot, status: "new",
  meet_link: "https://meet.jit.si/SaralFunding{uid}"
}
Side effects: Creates CRM lead, GHL opportunity, push notification
```

### My Consultations
```
GET /consultations/me
Response: [ { id, consultation_type, date, time_slot, status, meet_link }, ... ]
```

---

## Notifications

### Register Push Token
```
POST /notifications/push-token
Body: { "token": "ExponentPushToken[...]" }
Response: { "ok": true }
```

### Get My Notifications
```
GET /notifications/me
Response: [
  { id, title, body, type, read, created_at }
]
Types: high_match | state_scheme | readiness | consultation_reminder | platform | reminder
```

### Mark Notification as Read
```
POST /notifications/{nid}/read
Response: { "ok": true }
```

---

## AI Advisor

### Send Message
```
POST /advisor/chat
Body: { "message": "What schemes are available for women entrepreneurs?" }
Response: {
  "reply": "str",
  "schemes": [...],
  "banks": [...],
  "documents": [...],
  "roadmap": [...]
}
```

### Get Chat History
```
GET /advisor/history
Response: [ { role: "user"|"assistant", content: "str", ts: "iso8601" }, ... ]
```

### Clear Chat History
```
DELETE /advisor/history
Response: { "ok": true }
```

---

## Readiness

### Get Readiness Score
```
GET /readiness/me
Response: {
  score: int,
  breakdown: { documents: int, gst: int, udyam: int, turnover: int, employees: int },
  gaps: [ { field: "str", tip: "str", points: int } ]
}
```

---

## My Applications & Banks

### My Scheme Applications
```
GET /my/scheme-applications
Response: [
  { id, scheme_id, scheme_name, bank_name, stage, stage_label, notes, created_at }
]
```

### My Bank Assignments
```
GET /my/bank-assignments
Response: [
  { id, bank_id, bank_name, bank_short_name, created_at }
]
```

---

## Admin — Overview

### Dashboard Metrics
```
GET /admin/overview
Response: {
  total_users, total_leads, total_consultations,
  total_documents, pending_documents, schemes_assigned
}
```

---

## Admin — Users

### List Users
```
GET /admin/users?page=1&limit=20&search=sai&state=Maharashtra&role=user
Response: { users: [...], total: int, page: int }
```

### Get User Detail
```
GET /admin/users/{uid}
Response: { user, business_profile, assessment, scheme_matches }
```

### Change User Role
```
POST /admin/users/{uid}/role
Body: { "role": "manager|expert|sales_executive|support_executive|user" }
Response: { "ok": true }
```

### Get User Documents
```
GET /admin/users/{uid}/documents
Response: [ { id, doc_type, status, file_name, created_at, reject_reason }, ... ]
```

### Admin Download Document
```
GET /admin/documents/{doc_id}/download
Audited (logged in audit_logs)
Response: { "url": "https://azure...?sas=...&expires=5min" }
```

### Update Document Status
```
POST /admin/documents/{doc_id}/status
Body: { "status": "verified|rejected", "reject_reason": "str (optional)" }
Response: { "ok": true }
Side effects: Push notification sent to user
```

---

## Admin — Leads & Consultations

### List Leads
```
GET /admin/leads?stage=new&search=sai
Response: [ { id, user, stage, consultation_type, notes, follow_up_date, ... }, ... ]
```

### Get Lead Detail
```
GET /admin/leads/{id}
Response: {
  id, stage, notes, follow_up_date,
  user: { full_name, mobile, state, category },
  business_profile: { industry, business_stage, annual_turnover, gst_available, udyam_available },
  assessment: { ... },
  consultations: [...],
  activity_log: [...]
}
```

### Update Lead (Stage / Notes)
```
POST /admin/leads/{id}
Body: { "stage": "new|contacted|...", "notes": "str", "follow_up_date": "YYYY-MM-DD" }
Response: { "ok": true }
Side effects: GHL opportunity stage synced, activity log entry added
```

### List Consultations
```
GET /admin/consultations?status=new
Response: [ { id, user, consultation_type, date, time_slot, status, notes, meet_link }, ... ]
```

### Update Consultation Status
```
POST /admin/consultations/{cid}
Body: { "status": "called|follow_up|interested|submitted|approved|closed", "notes": "str" }
Response: { "ok": true }
```

---

## Admin — Scheme Applications

### Assign Scheme to User
```
POST /admin/users/{uid}/scheme-applications
Body: { "scheme_id": "str", "scheme_name": "str", "bank_id": "str|null", "bank_name": "str|null", "notes": "str" }
Response: { "ok": true }
```

### Get User's Scheme Applications
```
GET /admin/users/{uid}/scheme-applications
Response: [ { id, scheme_id, scheme_name, bank_name, stage, stage_label, notes }, ... ]
```

### Update Application Stage
```
PATCH /admin/scheme-applications/{app_id}/stage
Body: { "stage": "call_done|documents_submitted|...|disbursed|rejected", "note": "str" }
Response: { "ok": true }
```

### Delete Scheme Application
```
DELETE /admin/scheme-applications/{app_id}
Response: { "ok": true }
```

---

## Admin — Schemes

### List All Schemes (Admin)
```
GET /admin/schemes
Response: [ { id, name, disabled, categories, states, documents }, ... ]
```

### Create Scheme
```
POST /admin/schemes
Body: {
  "name": "str",
  "full_name": "str",
  "description": "str",
  "categories": ["MSME", "Women"],
  "max_funding": int,
  "max_subsidy_percent": int,
  "documents": ["PAN Card", "GST Certificate"],
  "states": ["All India"] or ["Maharashtra", "Gujarat"],
  "tags": ["subsidy", "startup"]
}
Response: { "id": "scheme-slug", "ok": true }
```

### Enable / Disable Scheme
```
POST /admin/schemes/{sid}/disable
POST /admin/schemes/{sid}/enable
Response: { "ok": true }
```

### Assign Scheme to Users (Bulk)
```
POST /admin/schemes/{sid}/assign
Body: { "user_ids": ["uid1", "uid2"] }
Response: { "ok": true, "assigned": int }
```

---

## Admin — Banks

### Create Bank
```
POST /admin/banks
Body: { "name": "str", "short_name": "str", "type": "str", "eligibility": "str", "products": "str" }
Response: { "id": "bank-uuid", "ok": true }
```

### Assign Bank to Users (Bulk)
```
POST /admin/banks/{bid}/assign
Body: { "user_ids": ["uid1", "uid2"] }
Response: { "ok": true }
```

### Delete Bank Assignment
```
DELETE /admin/bank-assignments/{assignment_id}
Response: { "ok": true }
```

---

## Admin — Notifications

### Send Notification
```
POST /admin/notifications
Body: {
  "title": "str (max 80 chars)",
  "body": "str (max 300 chars)",
  "type": "platform|high_match|reminder|state_scheme",
  "target_user_ids": ["uid1", "uid2"]  // omit for broadcast to all users
}
Response: { "ok": true, "sent": int }
```

---

## Admin — Analytics & Exports

### Analytics
```
GET /admin/analytics
Response: {
  lead_stages: { new: int, contacted: int, ... },
  popular_schemes: [ { scheme_name, count } ],
  state_distribution: [ { state, count } ],
  consultation_trends: [ { type, count } ]
}
```

### Export CSVs
```
GET /admin/exports/users.csv
GET /admin/exports/leads.csv
GET /admin/exports/consultations.csv
GET /admin/exports/schemes.csv
```

---

## Admin — Config

### Get Config
```
GET /admin/config
Response: { calendly_url, whatsapp_number, app_name, ... }
```

### Update Config
```
POST /admin/config
Body: { "calendly_url": "str", "whatsapp_number": "str" }
Response: { "ok": true }
```

---

## Error Format

All errors return:
```json
{
  "detail": "Human-readable error message"
}
```

Common HTTP status codes:
- `200` — Success
- `400` — Bad request / validation error
- `401` — Unauthorized (invalid / expired token)
- `403` — Forbidden (insufficient role)
- `404` — Not found
- `429` — Rate limit exceeded
- `500` — Internal server error
