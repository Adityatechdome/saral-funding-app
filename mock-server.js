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
    score: 92,
    interest_range: "8.4% – 14%",
    suggested_amount: 2500000,
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
    score: 85,
    interest_range: "10% – 18%",
    suggested_amount: 2000000,
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
    score: 78,
    interest_range: "8.7% – 14.5%",
    suggested_amount: 1500000,
  },
];

// ── In-memory state ─────────────────────────────────────────────────────────

const sessions = new Map(); // token → user
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
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
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
        supports: b.supports,
        why: b.why,
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
    return json(res, 200, { reply });
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
