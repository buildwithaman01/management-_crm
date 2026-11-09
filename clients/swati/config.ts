import type { ClientConfig } from "@/types/client";

export const clientConfig: ClientConfig = {
  id: "swati",
  businessName: "Swati Home Tuition Bureau",
  shortName: "Swati HTB",
  logoPath: "/clients/swati/logo.png",
  faviconPath: "/clients/swati/favicon.ico",
  colors: {
    primary: "#1F4E79",
    secondary: "#E8EEF5",
    accent: "#F59E0B",
  },
  contact: {
    phone: "+919876543210",
    whatsapp: "+919876543210",
    email: "contact@swatituitions.com",
    city: "Patna",
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
