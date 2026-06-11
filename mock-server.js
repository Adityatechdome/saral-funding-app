/**
 * Saral Funding — lightweight mock API server (Node.js built-ins only).
 * Mirrors every endpoint the frontend calls so all screens are previewable
 * without a running Python/MongoDB backend.
 *
 * Start: node mock-server.js
 * Port : 3001  (set EXPO_PUBLIC_BACKEND_URL=http://localhost:3001 in frontend/.env)
 */
const http = require("http");

const PORT = 3001;

// ── Seed data ────────────────────────────────────────────────────────────────

const DEMO_USER = {
  id: "demo-user-001",
  mobile: "9999999999",
  language: "en",
  full_name: "Rajesh Kumar",
  state: "Gujarat",
  district: "Surat",
  gender: "Male",
  age: 32,
  category: "General",
  onboarding_step: "done",
  role: "super_admin",
};

const SCHEMES = [
  {
    id: "pmegp",
    name: "PMEGP",
    full_name: "Prime Minister's Employment Generation Programme",
    description: "Credit-linked subsidy programme for setting up micro enterprises in non-farm sector.",
    eligibility: ["Any Indian citizen above 18 years", "VIII standard pass for projects above ₹10 lakh", "Self-Help Groups and Charitable Trusts also eligible"],
    benefits: ["Subsidy up to 35% for general category", "Subsidy up to 25% for urban areas", "No income ceiling for beneficiaries"],
    documents: ["Aadhaar Card", "PAN Card", "Educational Certificate", "Project Report", "Passport size photographs"],
    process: "1. Apply online at kviconline.gov.in\n2. District office scrutiny\n3. Bank sanction\n4. Training completion\n5. Subsidy disbursement",
    max_funding: 5000000,
    max_subsidy_percent: 35,
    categories: ["MSME", "Manufacturing", "Women"],
    states: ["All India"],
    tags: ["new_business", "women", "sc_st"],
    disabled: false,
  },
  {
    id: "mudra-shishu",
    name: "Mudra Loan — Shishu",
    full_name: "Pradhan Mantri Mudra Yojana (Shishu)",
    description: "Micro loans up to ₹50,000 for micro and small enterprises at concessional rates.",
    eligibility: ["Non-corporate, non-farm small or micro enterprises", "Existing businesses looking to expand", "New ventures in manufacturing, trading, services"],
    benefits: ["Loans up to ₹50,000", "No collateral required", "Low interest rates", "Repayment tenure up to 5 years"],
    documents: ["Identity proof", "Address proof", "Business plan", "Quotation for machinery"],
    process: "Apply at nearest bank branch or NBFC with completed Mudra application form.",
    max_funding: 50000,
    max_subsidy_percent: 0,
    categories: ["MSME", "Micro"],
    states: ["All India"],
    tags: ["no_collateral", "existing_business"],
    disabled: false,
  },
  {
    id: "stand-up-india",
    name: "Stand-Up India",
    full_name: "Stand-Up India Scheme",
    description: "Bank loans between ₹10 lakh and ₹1 crore for SC/ST and women entrepreneurs.",
    eligibility: ["SC/ST and/or Women entrepreneurs", "Above 18 years of age", "Borrower should not be in default with any bank"],
    benefits: ["Loans from ₹10 lakh to ₹1 crore", "Composite loan for greenfield enterprise", "Repayment up to 7 years"],
    documents: ["Identity proof", "Address proof", "Caste certificate (for SC/ST)", "Project report"],
    process: "Apply via standupmitra.in or visit nearest bank branch.",
    max_funding: 10000000,
    max_subsidy_percent: 0,
    categories: ["Women", "SC/ST"],
    states: ["All India"],
    tags: ["women", "sc_st", "new_business"],
    disabled: false,
  },
  {
    id: "cgtmse",
    name: "CGTMSE",
    full_name: "Credit Guarantee Fund Trust for Micro and Small Enterprises",
    description: "Collateral-free loans for MSMEs with credit guarantee cover from the government.",
    eligibility: ["New and existing micro and small enterprises", "Must be registered under Udyam", "Both manufacturing and service sectors"],
    benefits: ["Loans up to ₹5 crore without collateral", "85% guarantee cover for micro enterprises", "Reduced NPA burden on banks"],
    documents: ["Udyam Registration Certificate", "Business plan", "Last 3 years ITR (if existing)", "Bank statements"],
    process: "Apply through member lending institutions (MLIs) empanelled with CGTMSE.",
    max_funding: 50000000,
    max_subsidy_percent: 0,
    categories: ["MSME", "Manufacturing"],
    states: ["All India"],
    tags: ["no_collateral", "udyam", "existing_business"],
    disabled: false,
  },
  {
    id: "pm-vishwakarma",
    name: "PM Vishwakarma",
    full_name: "PM Vishwakarma Scheme",
    description: "Support for traditional artisans and craftspeople with skill training and collateral-free credit.",
    eligibility: ["18 traditional trades covered (e.g. blacksmith, potter, carpenter)", "Self-employed artisan or craftsperson", "Not a government employee"],
    benefits: ["₹15,000 toolkit incentive", "Credit support up to ₹3 lakh at 5% interest", "Skill training with stipend of ₹500/day"],
    documents: ["Aadhaar Card", "Mobile linked to Aadhaar", "Bank account details", "Trade proof"],
    process: "Register on pmvishwakarma.gov.in via CSC centre.",
    max_funding: 300000,
    max_subsidy_percent: 0,
    categories: ["Artisan", "Micro"],
    states: ["All India"],
    tags: ["new_business", "existing_business"],
    disabled: false,
  },
];

const BANKS = [
  {
    id: "sbi",
    name: "State Bank of India",
    short_name: "SBI",
    type: "Public",
    interest_min: 8.4,
    interest_max: 14.0,
    max_funding: 50000000,
    processing_fee_percent: 0.5,
    min_credit_score: 650,
    min_turnover: 0,
    collateral_required: false,
    supports: ["PMEGP", "Mudra", "CGTMSE", "Stand-Up India"],
    industries: ["Manufacturing", "Services", "Agriculture", "Retail"],
    states: ["All India"],
    description: "India's largest public sector bank with the widest reach across rural and urban areas.",
    why: "Highest loan limits, lowest interest rates, and strong government scheme support make SBI the ideal partner for MSME funding.",
    why_reasons: [
      "Funding need ₹25,00,000 is within SBI max of ₹5,00,00,000",
      "GST + Udyam registered — preferred by public banks",
      "Stand-Up India eligibility for woman/SC/ST entrepreneurs",
    ],
    match_breakdown: [
      { factor: "Funding fit", delta: 12, note: "Your need ₹25,00,000 is within limit" },
      { factor: "Industry match", delta: 8, note: "Manufacturing is a supported sector" },
      { factor: "Geographic reach", delta: 5, note: "Bank operates in your state" },
      { factor: "Registration status", delta: 10, note: "GST + Udyam both present" },
      { factor: "Collateral", delta: 6, note: "Collateral-free loan available" },
    ],
    score: 92,
    interest_range: "8.4% – 14%",
    suggested_amount: 2500000,
    processing_time_days: 21,
  },
  {
    id: "hdfc",
    name: "HDFC Bank",
    short_name: "HDFC",
    type: "Private",
    interest_min: 10.0,
    interest_max: 18.0,
    max_funding: 40000000,
    processing_fee_percent: 1.0,
    min_credit_score: 700,
    min_turnover: 500000,
    collateral_required: false,
    supports: ["CGTMSE", "Mudra"],
    industries: ["Services", "Manufacturing", "Retail", "Technology"],
    states: ["All India"],
    description: "India's leading private sector bank known for fast processing and digital-first services.",
    why: "Fast loan processing (3-5 days) and dedicated MSME relationship managers make HDFC ideal for time-sensitive funding needs.",
    why_reasons: [
      "GST + Udyam registered — preferred by private banks",
      "Collateral-free business loan available",
      "Manufacturing is supported by HDFC",
    ],
    match_breakdown: [
      { factor: "Funding fit", delta: 12, note: "Your need is within limit" },
      { factor: "Industry match", delta: 8, note: "Manufacturing is a supported sector" },
      { factor: "Registration status", delta: 10, note: "GST + Udyam both present" },
      { factor: "Collateral", delta: 6, note: "Collateral-free loan available" },
      { factor: "Business vintage", delta: 8, note: "Established business meets private bank criteria" },
    ],
    score: 85,
    interest_range: "10% – 18%",
    suggested_amount: 2000000,
    processing_time_days: 10,
  },
  {
    id: "bob",
    name: "Bank of Baroda",
    short_name: "BoB",
    type: "Public",
    interest_min: 8.7,
    interest_max: 14.5,
    max_funding: 30000000,
    processing_fee_percent: 0.5,
    min_credit_score: 650,
    min_turnover: 0,
    collateral_required: false,
    supports: ["PMEGP", "Mudra", "CGTMSE"],
    industries: ["Manufacturing", "Agriculture", "Services"],
    states: ["All India"],
    description: "Major public sector bank with strong presence in Gujarat and western India.",
    why: "Strong MSME portfolio and expertise in Gujarat-specific state government schemes.",
    why_reasons: [
      "Funding need is within BoB's ₹3 Cr limit",
      "Strong MSME focus in Gujarat and western India",
      "PMEGP and Mudra scheme eligibility confirmed",
    ],
    match_breakdown: [
      { factor: "Funding fit", delta: 12, note: "Your need is within limit" },
      { factor: "Geographic reach", delta: 5, note: "Strong Gujarat presence" },
      { factor: "Registration status", delta: 4, note: "Udyam registered" },
      { factor: "Collateral", delta: 6, note: "Collateral-free loan available" },
      { factor: "Industry match", delta: 0, note: "Manufacturing is broadly supported" },
    ],
    score: 78,
    interest_range: "8.7% – 14.5%",
    suggested_amount: 1500000,
    processing_time_days: 21,
  },
];

// ── In-memory state ─────────────────────────────────────────────────────────

const sessions = new Map(); // token → user
const setuConsents = new Map(); // consentId → { status, user_id, created_at }
const userDocuments = []; // { id, user_id, doc_type, status, created_at }
const adminRecommendations = new Map(); // user_id → { schemes, banks, note, created_at }
const consultations = [];
const notifications = [
  {
    id: "notif-001",
    user_id: DEMO_USER.id,
    title: "High Match: PMEGP Scheme",
    body: "You have a 91% match with PMEGP. You could get up to ₹50L in funding with 35% subsidy.",
    type: "high_match",
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "notif-002",
    user_id: DEMO_USER.id,
    title: "Register on Udyam to unlock more schemes",
    body: "Udyam registration opens 8 additional schemes including CGTMSE collateral-free loans up to ₹5 crore.",
    type: "readiness",
    read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const chatHistory = new Map(); // token → messages[]

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function getToken(req) {
  const auth = req.headers["authorization"] || "";
  return auth.replace("Bearer ", "").trim();
}

function getUser(req) {
  const token = getToken(req);
  return sessions.get(token) || null;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] || "";

      // Multipart form-data — extract text fields only (skip file bytes)
      if (contentType.includes("multipart/form-data")) {
        const boundary = contentType.split("boundary=")[1];
        if (boundary) {
          const result = {};
          const text = raw.toString("latin1");
          const parts = text.split(`--${boundary}`);
          for (const part of parts) {
            const nameMatch = part.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
            if (!nameMatch) continue;
            const fieldName = nameMatch[1];
            // Value is after the blank line (\r\n\r\n)
            const valueStart = part.indexOf("\r\n\r\n");
            if (valueStart === -1) continue;
            const rawValue = part.slice(valueStart + 4);
            // Strip trailing \r\n--
            const value = rawValue.replace(/\r\n--$/, "").trim();
            // For file fields, just store the original filename from Content-Disposition
            const filenameMatch = part.match(/filename="([^"]+)"/i);
            if (filenameMatch) {
              result[fieldName] = { filename: filenameMatch[1] };
            } else {
              result[fieldName] = value;
            }
          }
          return resolve(result);
        }
        return resolve({});
      }

      // Regular JSON body
      try { resolve(JSON.parse(raw.toString() || "{}")); }
      catch { resolve({}); }
    });
  });
}

// ── Router ───────────────────────────────────────────────────────────────────

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api/, "");
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    return res.end();
  }

  const body = ["POST", "PUT", "PATCH"].includes(method) ? await readBody(req) : {};

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === "/auth/send-otp" && method === "POST") {
    return json(res, 200, { ok: true, mock_code: "123456" });
  }

  if (path === "/auth/verify-otp" && method === "POST") {
    if (body.code !== "123456") return json(res, 400, { detail: "Invalid OTP" });
    const user = { ...DEMO_USER, mobile: body.mobile || DEMO_USER.mobile };
    const token = `mock-token-${Date.now()}`;
    sessions.set(token, user);
    return json(res, 200, { token, user });
  }

  if (path === "/auth/me" && method === "GET") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    return json(res, 200, user);
  }

  // ── Profile / Onboarding ─────────────────────────────────────────────────
  if (path === "/profile" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    Object.assign(user, body, { onboarding_step: "business" });
    return json(res, 200, user);
  }

  if (path === "/business-profile" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    user.onboarding_step = "assessment";
    return json(res, 200, { ok: true });
  }

  if (path === "/business-profile" && method === "GET") {
    return json(res, 200, {
      user_id: DEMO_USER.id,
      business_stage: "existing",
      industry: "Manufacturing",
      funding_required: 2500000,
      annual_turnover: 5000000,
      employees: 12,
      gst_available: true,
      udyam_available: false,
    });
  }

  if (path === "/funding-assessment" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    user.onboarding_step = "done";
    return json(res, 200, { ok: true });
  }

  if (path === "/funding-assessment" && method === "GET") {
    return json(res, 200, {
      user_id: DEMO_USER.id,
      business_type: "Manufacturing",
      funding_requirement: 2500000,
      business_location: "Gujarat",
      existing_business: true,
      woman_entrepreneur: false,
      gst_registration: true,
      udyam_registration: false,
      existing_loans: false,
    });
  }

  // ── Schemes ───────────────────────────────────────────────────────────────
  if (path === "/schemes" && method === "GET") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const cat = url.searchParams.get("category") || "";
    let result = SCHEMES.filter((s) => !s.disabled);
    if (q) result = result.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    if (cat && cat !== "All") result = result.filter((s) => s.categories.includes(cat));
    return json(res, 200, result);
  }

  if (path.startsWith("/schemes/") && method === "GET") {
    const id = path.split("/")[2];
    const scheme = SCHEMES.find((s) => s.id === id);
    if (!scheme) return json(res, 404, { detail: "Not found" });
    return json(res, 200, scheme);
  }

  // ── Matches ───────────────────────────────────────────────────────────────
  if (path === "/match/me" && method === "GET") {
    return json(res, 200, {
      matches: [
        { scheme_id: "pmegp", name: "PMEGP", score: 91, funding_estimate: 5000000, subsidy_estimate: 1750000, reason: "Excellent match — existing manufacturing business in Gujarat with GST registration qualifies for maximum 35% subsidy." },
        { scheme_id: "cgtmse", name: "CGTMSE", score: 87, funding_estimate: 25000000, subsidy_estimate: 0, reason: "Your GST registration and business vintage make you eligible for collateral-free credit guarantee up to ₹5 crore." },
        { scheme_id: "mudra-shishu", name: "Mudra Loan", score: 76, funding_estimate: 1000000, subsidy_estimate: 0, reason: "Quick working capital loan at low rates — ideal for immediate operational needs without collateral." },
      ],
      funding_estimate: 31000000,
      subsidy_estimate: 1750000,
      readiness_score: 68,
    });
  }

  if (path === "/match/recompute" && method === "POST") {
    return json(res, 200, { ok: true });
  }

  // ── Readiness ─────────────────────────────────────────────────────────────
  if (path === "/readiness/me" && method === "GET") {
    return json(res, 200, {
      score: 68,
      max: 100,
      score_label: "Good",
      funding_capacity: { min: 500000, max: 5000000 },
      approval_probability: 72,
      breakdown: [
        { label: "Profile completion", score: 15, max: 15 },
        { label: "Business profile", score: 15, max: 15 },
        { label: "GST registration", score: 15, max: 15 },
        { label: "Udyam registration", score: 0, max: 15 },
        { label: "Business vintage & turnover", score: 14, max: 20 },
        { label: "Assessment complete", score: 10, max: 10 },
        { label: "Documentation readiness", score: 8, max: 10 },
      ],
      actions: [
        { title: "Get Udyam Registration", detail: "Free, takes 10 minutes at udyamregistration.gov.in. Required for CGTMSE and most MSME subsidies.", weight: "+15", cta: "udyam", priority: "high" },
        { title: "Build turnover history", detail: "₹10L+ annual turnover unlocks unsecured loans from private banks.", weight: "+6", cta: "business", priority: "medium" },
        { title: "Prepare core documents", detail: "PAN, Aadhaar, GST/Udyam certificate, last 6 months bank statements, ITR.", weight: "+2", cta: "documents", priority: "medium" },
      ],
    });
  }

  // ── Banks ─────────────────────────────────────────────────────────────────
  if (path === "/banks" && method === "GET") {
    return json(res, 200, BANKS);
  }

  if (path === "/banks/recommend/me" && method === "GET") {
    const processingDays = { Public: 21, Private: 10, NBFC: 7, MFI: 5 };
    return json(res, 200, {
      recommendations: BANKS.map((b) => ({
        bank_id: b.id,
        name: b.name,
        short_name: b.short_name,
        type: b.type,
        score: b.score,
        interest_range: b.interest_range,
        suggested_amount: b.suggested_amount,
        collateral_required: b.collateral_required,
        processing_time_days: processingDays[b.type] || 14,
        supports: b.supports,
        why: b.why,
        why_reasons: b.why_reasons || [],
        description: b.description,
      })),
    });
  }

  if (path === "/banks/compare" && method === "POST") {
    const ids = body.ids || [];
    const result = BANKS.filter((b) => ids.includes(b.id));
    return json(res, 200, { banks: result });
  }

  if (path.startsWith("/banks/") && !path.includes("recommend") && !path.includes("compare") && method === "GET") {
    const id = path.split("/")[2];
    const bank = BANKS.find((b) => b.id === id);
    if (!bank) return json(res, 404, { detail: "Not found" });
    return json(res, 200, bank);
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (path === "/alerts/evaluate" && method === "POST") {
    return json(res, 200, { new_alerts: [] });
  }

  // ── Consultations ─────────────────────────────────────────────────────────
  if (path === "/consultations" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const consultation = {
      id: `consult-${Date.now()}`,
      user_id: user.id,
      consultation_type: body.consultation_type,
      date: body.date,
      time_slot: body.time_slot,
      notes: body.notes || "",
      status: "new",
      created_at: new Date().toISOString(),
    };
    consultations.push(consultation);
    return json(res, 200, consultation);
  }

  if (path === "/consultations/me" && method === "GET") {
    return json(res, 200, consultations);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  if (path === "/notifications/me" && method === "GET") {
    return json(res, 200, notifications);
  }

  if (path.startsWith("/notifications/") && path.endsWith("/read") && method === "POST") {
    const id = path.split("/")[2];
    const n = notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return json(res, 200, { ok: true });
  }

  // ── AI Advisor ────────────────────────────────────────────────────────────
  if (path === "/advisor/chat" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const token = getToken(req);
    if (!chatHistory.has(token)) chatHistory.set(token, []);
    const history = chatHistory.get(token);
    history.push({ role: "user", content: body.message, ts: Date.now() });
    const reply = getMockAdvisorReply(body.message);
    history.push({ role: "assistant", content: reply, ts: Date.now() });
    const lower = (body.message || "").toLowerCase();
    const follow_ups = lower.includes("pmegp") || lower.includes("subsidy")
      ? ["How to apply for PMEGP?", "What's the subsidy %?", "Documents needed?"]
      : lower.includes("loan") || lower.includes("bank")
      ? ["What is the interest rate?", "Which bank is best?", "Collateral required?"]
      : lower.includes("gst") || lower.includes("udyam")
      ? ["How to register GST?", "Is Udyam free?", "Impact on loan eligibility?"]
      : ["Tell me more", "Which schemes apply to me?", "Book a consultation?"];
    return json(res, 200, { reply, follow_ups });
  }

  if (path === "/advisor/structured" && method === "POST") {
    return json(res, 200, {
      summary: "Based on your manufacturing business in Gujarat with GST registration, you have strong eligibility for PMEGP and CGTMSE. Your funding need of ₹25 lakh is well-matched to available schemes.",
      schemes: [
        { name: "PMEGP", why: "Best fit for your manufacturing profile — 35% subsidy on ₹50L loan", estimated_funding: 5000000, estimated_subsidy: 1750000 },
        { name: "CGTMSE", why: "Collateral-free guarantee covers your full ₹25L requirement", estimated_funding: 2500000, estimated_subsidy: 0 },
      ],
      banks: [
        { name: "State Bank of India", why: "Lowest interest rates for MSME loans + PMEGP nodal bank", interest_range: "8.4% – 14%" },
        { name: "HDFC Bank", why: "Fastest processing (3-5 days) for working capital needs", interest_range: "10% – 18%" },
      ],
      documents: ["Aadhaar Card", "PAN Card", "GST Certificate", "Project Report", "Last 6 months bank statements", "Udyam Registration (recommended)"],
      roadmap: ["Register on Udyam portal to unlock CGTMSE guarantee", "Prepare detailed project report with cost breakdown", "Apply for PMEGP through KVIC district office", "Simultaneously apply at SBI for CGTMSE-backed loan", "Complete skill training requirement for PMEGP disbursement"],
      next_steps: ["Get Udyam registration at udyamregistration.gov.in (free, 10 mins)", "Download PMEGP application from kviconline.gov.in", "Book a free consultation with our advisor for document guidance"],
      why: "Your combination of existing business + GST registration + Gujarat location gives you access to state-level subsidies on top of central schemes, potentially doubling your effective subsidy.",
    });
  }

  if (path === "/advisor/history" && method === "GET") {
    const token = getToken(req);
    return json(res, 200, { messages: chatHistory.get(token) || [] });
  }

  if (path === "/advisor/history" && method === "DELETE") {
    const token = getToken(req);
    chatHistory.delete(token);
    return json(res, 200, { ok: true });
  }

  // ── Language ──────────────────────────────────────────────────────────────
  if (path === "/language" && method === "POST") {
    return json(res, 200, { ok: true });
  }

  // ── Setu Account Aggregator ───────────────────────────────────────────────
  if (path === "/setu/aa/status" && method === "GET") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    // Check if this user has an active consent
    let linked = false;
    for (const [, c] of setuConsents) {
      if (c.user_id === user.id && c.status === "ACTIVE") { linked = true; break; }
    }
    return json(res, 200, { aa_linked: linked, aa_status: linked ? "ACTIVE" : null });
  }

  if (path === "/setu/aa/consent" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const consentId = `mock-consent-${Date.now()}`;
    // Store pending consent in sessions map so status can be polled
    setuConsents.set(consentId, { status: "PENDING", user_id: user.id, created_at: new Date().toISOString() });
    return json(res, 200, {
      consent_id: consentId,
      // In real flow this is a Setu-hosted URL; for mock we send back to our redirect
      consent_url: `http://localhost:3001/setu/aa/mock-flow?id=${consentId}`,
      status: "PENDING",
    });
  }

  if (path.startsWith("/setu/aa/consent/") && path.endsWith("/status") && method === "GET") {
    const consentId = path.split("/")[4];
    const consent = setuConsents.get(consentId);
    if (!consent) return json(res, 404, { detail: "Consent not found" });
    return json(res, 200, { consent_id: consentId, status: consent.status });
  }

  // Mock UI page — user "approves" here in the WebView
  if (path.startsWith("/setu/aa/mock-flow") && method === "GET") {
    const urlObj = new URL(`http://localhost:3001${req.url}`);
    const consentId = urlObj.searchParams.get("id");
    const consent = consentId && setuConsents.get(consentId);
    if (!consent) {
      res.writeHead(404, { "Content-Type": "text/html" });
      return res.end("<h2>Consent not found</h2>");
    }
    // Auto-approve after 2 seconds (simulate user tapping "Allow" in AA app)
    setTimeout(() => {
      if (setuConsents.has(consentId)) {
        setuConsents.get(consentId).status = "ACTIVE";
      }
    }, 2000);
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#F0FDF4; }
    .card { background:#fff; border-radius:16px; padding:32px; max-width:360px; text-align:center; box-shadow:0 4px 24px rgba(0,0,0,0.1); }
    h2 { color:#166534; margin-bottom:8px; }
    p { color:#6B7280; font-size:14px; line-height:1.6; }
    .bank { background:#DCFCE7; border-radius:8px; padding:12px; margin:16px 0; font-size:13px; color:#166534; }
    .btn { background:#16A34A; color:#fff; border:none; border-radius:12px; padding:14px 32px; font-size:16px; cursor:pointer; width:100%; margin-top:8px; }
    .deny { background:#F3F4F6; color:#374151; margin-top:8px; }
    .spinner { display:none; font-size:13px; color:#16A34A; margin-top:16px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:48px; margin-bottom:8px;">🏦</div>
    <h2>Link Your Bank Account</h2>
    <p>Saral Funding wants to access your bank statements to assess your loan eligibility.</p>
    <div class="bank">
      <strong>Data requested:</strong><br>
      Bank statements • Last 12 months<br>
      Savings / Current accounts
    </div>
    <p style="font-size:12px; color:#9CA3AF;">Your data is protected under RBI's Account Aggregator framework. You can revoke access anytime.</p>
    <button class="btn" onclick="approve()">Allow Access</button>
    <button class="btn deny" onclick="deny()">Deny</button>
    <div class="spinner" id="spinner">Processing consent… redirecting back to app</div>
  </div>
  <script>
    function approve() {
      document.querySelector('.btn').disabled = true;
      document.getElementById('spinner').style.display = 'block';
      // Tell mock server to mark as ACTIVE
      fetch('/setu/aa/mock-approve?id=${consentId}', { method: 'POST' });
      setTimeout(() => {
        window.location.href = 'saral://setu-redirect?consent_id=${consentId}&status=ACTIVE';
      }, 1500);
    }
    function deny() {
      fetch('/setu/aa/mock-approve?id=${consentId}&denied=1', { method: 'POST' });
      window.location.href = 'saral://setu-redirect?consent_id=${consentId}&status=REJECTED';
    }
  </script>
</body>
</html>`);
  }

  if (path.startsWith("/setu/aa/mock-approve") && method === "POST") {
    const urlObj = new URL(`http://localhost:3001${req.url}`);
    const consentId = urlObj.searchParams.get("id");
    const denied = urlObj.searchParams.get("denied") === "1";
    if (consentId && setuConsents.has(consentId)) {
      setuConsents.get(consentId).status = denied ? "REJECTED" : "ACTIVE";
    }
    return json(res, 200, { ok: true });
  }

  if (path.startsWith("/setu/aa/data/") && method === "GET") {
    const consentId = path.split("/")[4];
    const consent = setuConsents.get(consentId);
    if (!consent) return json(res, 404, { detail: "Consent not found" });
    if (consent.status !== "ACTIVE") return json(res, 400, { detail: "Consent not yet active" });
    // Mock AA financial data — realistic MSME bank statement summary
    return json(res, 200, {
      consent_id: consentId,
      financial_profile: {
        monthly_avg_balance: 187500,
        avg_monthly_credits: 423000,
        avg_monthly_debits: 385000,
        estimated_annual_turnover: 5076000,
        num_accounts: 2,
        has_salary: false,
        has_business_credits: true,
        data_months: 12,
      },
      accounts: [
        { name: "SBI Current Account", number: "****4521", balance: 285000, type: "CURRENT" },
        { name: "HDFC Savings Account", number: "****8843", balance: 90000, type: "SAVINGS" },
      ],
    });
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  // GET /documents/me — list current user's docs
  if (path === "/documents/me" && method === "GET") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const docs = userDocuments.filter((d) => d.user_id === user.id);
    return json(res, 200, docs);
  }

  // POST /documents/upload — supports both multipart/form-data and JSON (backward compat)
  if (path === "/documents/upload" && method === "POST") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });

    // body.doc_type may be a string (JSON) or a string extracted from multipart
    const doc_type = typeof body.doc_type === "string" ? body.doc_type : null;
    if (!doc_type) return json(res, 400, { detail: "doc_type required" });

    // Derive filename: from picked file if multipart, else synthesize
    const uploadedFile = body.file;
    const file_name =
      uploadedFile && uploadedFile.filename
        ? uploadedFile.filename
        : `${doc_type.replace(/\s+/g, "_").toLowerCase()}.pdf`;

    const slug = doc_type.replace(/\s+/g, "-").toLowerCase();
    const docId = `doc-${Date.now()}`;
    const fake_blob_url = `https://saralstorage.blob.core.windows.net/saral-documents/users/${user.id}/${slug}-${docId}.pdf`;

    const doc = {
      id: docId,
      user_id: user.id,
      doc_type,
      status: "pending",
      created_at: new Date().toISOString(),
      file_name,
      blob_url: fake_blob_url,   // stored internally
    };
    userDocuments.push(doc);
    // Don't expose blob_url to the client — return only safe fields
    const { blob_url: _bv, ...safeDoc } = doc;
    return json(res, 200, safeDoc);
  }

  // GET /documents/:id/download — user: returns a fake SAS URL
  if (path.match(/^\/documents\/[^/]+\/download$/) && method === "GET") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const docId = path.split("/")[2];
    const doc = userDocuments.find((d) => d.id === docId && d.user_id === user.id);
    if (!doc) return json(res, 404, { detail: "Document not found" });
    const fake_sas = doc.blob_url
      ? `${doc.blob_url}?sv=2023-01-03&se=${new Date(Date.now() + 3600000).toISOString()}&sr=b&sp=r&sig=mock`
      : `https://saralstorage.blob.core.windows.net/saral-documents/mock/${docId}.pdf?sv=2023-01-03&sig=mock`;
    return json(res, 200, { url: fake_sas, expires_in: 3600 });
  }

  // GET /admin/documents/:id/download — admin: returns a fake SAS URL
  if (path.match(/^\/admin\/documents\/[^/]+\/download$/) && method === "GET") {
    const docId = path.split("/")[3];
    const doc = userDocuments.find((d) => d.id === docId);
    if (!doc) return json(res, 404, { detail: "Document not found" });
    const fake_sas = doc.blob_url
      ? `${doc.blob_url}?sv=2023-01-03&se=${new Date(Date.now() + 3600000).toISOString()}&sr=b&sp=r&sig=mock`
      : `https://saralstorage.blob.core.windows.net/saral-documents/mock/${docId}.pdf?sv=2023-01-03&sig=mock`;
    return json(res, 200, { url: fake_sas, expires_in: 3600 });
  }

  // DELETE /documents/:id — delete a pending doc
  if (path.match(/^\/documents\/[^/]+$/) && method === "DELETE") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const docId = path.split("/")[2];
    const idx = userDocuments.findIndex((d) => d.id === docId && d.user_id === user.id);
    if (idx === -1) return json(res, 404, { detail: "Document not found" });
    if (userDocuments[idx].status !== "pending") return json(res, 400, { detail: "Only pending docs can be deleted" });
    userDocuments.splice(idx, 1);
    return json(res, 200, { ok: true });
  }

  // GET /admin/leads/:id — lead detail (uses user id as lead id in mock)
  if (path.match(/^\/admin\/leads\/[^/]+$/) && method === "GET") {
    const lid = path.split("/").pop();
    return json(res, 200, {
      id: lid, user_id: lid,
      full_name: "Rajesh Kumar", mobile: "9999999999", state: "Gujarat", district: "Surat",
      business_stage: "existing", industry: "Manufacturing", funding_required: 2500000,
      annual_turnover: 1500000, employees: 12, gst_available: true, udyam_available: false,
      stage: "documentation", notes: "Interested in PMEGP scheme", assigned_to: "Advisor 1",
      created_at: new Date().toISOString(),
      scheme_matches: [
        { id: "pmegp", name: "PMEGP", score: 91 },
        { id: "cgtmse", name: "CGTMSE", score: 87 },
        { id: "mudra-shishu", name: "Mudra Loan", score: 76 },
      ],
    });
  }

  // GET /admin/users/:uid/documents — admin view user docs
  if (path.match(/^\/admin\/users\/[^/]+\/documents$/) && method === "GET") {
    const parts = path.split("/");
    const uid = parts[3];
    const docs = userDocuments.filter((d) => d.user_id === uid);
    // Seed a few mock docs if none exist
    if (docs.length === 0) {
      const seeded = [
        { id: `doc-seed-1-${uid}`, user_id: uid, doc_type: "Aadhaar Card", status: "verified", created_at: new Date(Date.now() - 86400000 * 3).toISOString(), file_name: "aadhaar.pdf" },
        { id: `doc-seed-2-${uid}`, user_id: uid, doc_type: "PAN Card", status: "pending", created_at: new Date(Date.now() - 86400000).toISOString(), file_name: "pan.pdf" },
        { id: `doc-seed-3-${uid}`, user_id: uid, doc_type: "GST Certificate", status: "pending", created_at: new Date().toISOString(), file_name: "gst.pdf" },
      ];
      seeded.forEach((d) => userDocuments.push(d));
      return json(res, 200, seeded);
    }
    return json(res, 200, docs);
  }

  // POST /admin/documents/:docId/status — verify or reject
  if (path.match(/^\/admin\/documents\/[^/]+\/status$/) && method === "POST") {
    const docId = path.split("/")[3];
    const { status } = body;
    if (!["verified", "rejected"].includes(status)) return json(res, 400, { detail: "status must be verified or rejected" });
    const doc = userDocuments.find((d) => d.id === docId);
    if (!doc) return json(res, 404, { detail: "Document not found" });
    doc.status = status;
    return json(res, 200, doc);
  }

  // ── Admin Recommendations ──────────────────────────────────────────────────

  // POST /admin/users/:uid/recommendations — save recs
  if (path.match(/^\/admin\/users\/[^/]+\/recommendations$/) && method === "POST") {
    const parts = path.split("/");
    const uid = parts[3];
    const rec = {
      user_id: uid,
      schemes: body.schemes || [],
      banks: body.banks || [],
      note: body.note || "",
      created_at: new Date().toISOString(),
    };
    adminRecommendations.set(uid, rec);
    return json(res, 200, rec);
  }

  // GET /admin/users/:uid/recommendations — get saved recs
  if (path.match(/^\/admin\/users\/[^/]+\/recommendations$/) && method === "GET") {
    const uid = path.split("/")[3];
    const rec = adminRecommendations.get(uid) || null;
    if (!rec) return json(res, 404, { detail: "No recommendations yet" });
    return json(res, 200, rec);
  }

  // GET /recommendations/me — user fetches their own admin recs
  if (path === "/recommendations/me" && method === "GET") {
    const user = getUser(req);
    if (!user) return json(res, 401, { detail: "Unauthorized" });
    const rec = adminRecommendations.get(user.id) || null;
    if (!rec) return json(res, 404, { detail: "No recommendations yet" });
    return json(res, 200, rec);
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  console.log(`[mock] 404 — ${method} ${path}`);
  return json(res, 404, { detail: `Mock: no handler for ${method} ${path}` });
}

// ── Simple advisor replies ────────────────────────────────────────────────────

function getMockAdvisorReply(message) {
  const m = message.toLowerCase();
  if (m.includes("pmegp")) return "PMEGP (Prime Minister's Employment Generation Programme) offers subsidies up to 35% for general category and 25% for urban areas. With your GST registration, you can apply for up to ₹50 lakh. The application is online at kviconline.gov.in — I recommend starting there.";
  if (m.includes("woman") || m.includes("women")) return "Women entrepreneurs have access to Stand-Up India (₹10L–₹1Cr), PMEGP (additional 10% subsidy), and Stree Shakti package from SBI at 0.5% concession. You also qualify for Udyogini scheme in Karnataka and Mahila Udyam Nidhi in Punjab/Maharashtra.";
  if (m.includes("gujarat")) return "Gujarat has excellent state-level schemes on top of central programmes: iNDEXTb (industrial development), GSFC loan (agriculture processing), and district-level GGRC subsidies. Combined with PMEGP, a Gujarat manufacturer can effectively get 40-45% subsidy on equipment costs.";
  if (m.includes("mudra")) return "Mudra loans come in 3 tiers: Shishu (up to ₹50K), Kishor (₹50K–₹5L), and Tarun (₹5L–₹10L). There's no collateral required and the application is at any bank branch. For your ₹25L need, you'd want CGTMSE or PMEGP instead — Mudra works best for initial working capital.";
  if (m.includes("manufacture") || m.includes("steel") || m.includes("fabricat")) return "For manufacturing businesses, PMEGP + CGTMSE is the optimal combo. PMEGP gives you 25-35% subsidy on the project cost, and CGTMSE provides collateral-free guarantee so the bank takes less risk. SBI and Bank of Baroda are the best nodal banks for both schemes in Gujarat.";
  return "Good question! Based on your business profile — manufacturing in Gujarat with GST registration — your top options are PMEGP (up to ₹50L with 35% subsidy) and CGTMSE (collateral-free guarantee up to ₹5Cr). I'd suggest booking a free consultation for a personalised document checklist. What specific aspect would you like to explore further?";
}

// ── Start ─────────────────────────────────────────────────────────────────────

const server = http.createServer(handle);
server.listen(PORT, () => {
  console.log(`\n✅  Saral Funding mock API running at http://localhost:${PORT}`);
  console.log(`   All API endpoints are mocked — no MongoDB or Python needed.`);
  console.log(`   Demo OTP: 123456\n`);
});
