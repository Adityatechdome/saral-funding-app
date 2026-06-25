export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

export const CATEGORIES = ["General", "OBC", "SC", "ST", "Minority"];
export const GENDERS = ["Male", "Female", "Other"];
export const INDUSTRIES = ["Manufacturing", "Service", "Trading", "Agriculture"];
export const SCHEME_CATEGORIES = ["All", "Startup", "MSME", "Manufacturing", "Agriculture", "Women", "Students"];
export const CONSULT_TYPES = [
  "Funding Guidance",
  "Government Schemes",
  "Business Loan Consultation",
  "Subsidy Consultation",
];
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h <= 17; h++) {
    const minutes = h === 17 ? [0] : [0, 30];
    for (const m of minutes) {
      const displayH = h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const min = m === 0 ? "00" : "30";
      slots.push(`${displayH}:${min} ${ampm}`);
    }
  }
  return slots;
}
export const TIME_SLOTS = generateTimeSlots();
// 10:00 AM → 5:00 PM, every 30 min (15 slots)
