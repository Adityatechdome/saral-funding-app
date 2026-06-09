export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
];

type Dict = Record<string, Record<string, string>>;

const T: Dict = {
  en: {
    choose_language: "Choose Your Preferred Language",
    continue: "Continue",
    welcome: "Welcome to Saral Funding",
    tagline: "Discover government schemes you're eligible for",
    enter_mobile: "Enter your mobile number",
    mobile_placeholder: "10-digit mobile number",
    send_otp: "Send OTP",
    enter_otp: "Enter the 6-digit OTP",
    verify: "Verify",
    otp_hint: "Use 123456 (MVP demo)",
    personal_profile: "Personal Profile",
    business_profile: "Business Profile",
    funding_assessment: "Funding Assessment",
    full_name: "Full Name",
    state: "State",
    district: "District",
    gender: "Gender",
    age: "Age",
    category: "Category",
    save: "Save & Continue",
    dashboard: "Dashboard",
    schemes: "Schemes",
    advisor: "Advisor",
    profile: "Profile",
    readiness: "Funding Readiness",
    eligible_funding: "Eligible Funding",
    eligible_subsidy: "Estimated Subsidy",
    recommended: "Recommended for you",
    view_all: "View all",
    search_schemes: "Search schemes",
    book_consultation: "Book Free Consultation",
    notifications: "Notifications",
    settings: "Settings",
    logout: "Logout",
    ask_anything: "Ask anything about funding…",
    send: "Send",
  },
  hi: {
    choose_language: "अपनी पसंदीदा भाषा चुनें",
    continue: "जारी रखें",
    welcome: "सरल फंडिंग में आपका स्वागत है",
    tagline: "उन सरकारी योजनाओं को खोजें जिनके लिए आप पात्र हैं",
    enter_mobile: "अपना मोबाइल नंबर दर्ज करें",
    mobile_placeholder: "10 अंकों का मोबाइल नंबर",
    send_otp: "OTP भेजें",
    enter_otp: "6 अंकों का OTP दर्ज करें",
    verify: "सत्यापित करें",
    otp_hint: "123456 का प्रयोग करें (डेमो)",
    personal_profile: "व्यक्तिगत प्रोफ़ाइल",
    business_profile: "व्यवसाय प्रोफ़ाइल",
    funding_assessment: "फंडिंग मूल्यांकन",
    full_name: "पूरा नाम",
    state: "राज्य",
    district: "ज़िला",
    gender: "लिंग",
    age: "आयु",
    category: "श्रेणी",
    save: "सहेजें और जारी रखें",
    dashboard: "डैशबोर्ड",
    schemes: "योजनाएँ",
    advisor: "सलाहकार",
    profile: "प्रोफ़ाइल",
    readiness: "फंडिंग तत्परता",
    eligible_funding: "पात्र फंडिंग",
    eligible_subsidy: "अनुमानित सब्सिडी",
    recommended: "आपके लिए सुझाई गई",
    view_all: "सभी देखें",
    search_schemes: "योजनाएँ खोजें",
    book_consultation: "मुफ़्त परामर्श बुक करें",
    notifications: "सूचनाएँ",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
    ask_anything: "फंडिंग के बारे में कुछ भी पूछें…",
    send: "भेजें",
  },
};

import { storage } from "./utils/storage";

let currentLang = "en";

export async function loadLang() {
  currentLang = (await storage.getItem<string>("lang", "en")) || "en";
}

export function getLang(): string {
  return currentLang;
}

export async function setLang(code: string) {
  currentLang = code;
  await storage.setItem("lang", code);
}

export function t(key: string): string {
  const dict = T[currentLang] || T.en;
  return dict[key] || T.en[key] || key;
}
