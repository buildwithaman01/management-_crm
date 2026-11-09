import type { ClientConfig } from "@/types/client";

export const clientConfig: ClientConfig = {
  id: "_template",
  businessName: "Template Home Tuition Bureau",
  shortName: "Template HTB",
  logoPath: "/clients/_template/logo.png",
  faviconPath: "/clients/_template/favicon.ico",
  colors: {
    primary: "#1E3A8A",
    secondary: "#EFF6FF",
    accent: "#F59E0B",
  },
  contact: {
    phone: "+919876500000",
    whatsapp: "+919876500000",
    email: "contact@templatebureau.com",
    city: "City",
  },
  locale: {
    countryCode: "+91",
    currency: "INR",
    currencySymbol: "₹",
    feeUnit: "month",
    timezone: "Asia/Kolkata",
    languages: ["en", "hi"],
  },
  features: {
    smartMatching: true,
    assignments: true,
    followups: true,
    payments: false,
    advancedAnalytics: true,
  },
  tutorFields: {},
};
