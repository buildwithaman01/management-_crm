import type { ClientConfig } from "@/types/client";

export const clientConfig: ClientConfig = {
  id: "swati",
  businessName: "Aman Home Tution Beauro",
  shortName: "Aman Home Tution Beauro",
  logoPath: "/clients/swati/logo.png",
  faviconPath: "/clients/swati/favicon.ico",
  colors: {
    primary: "#1F4E79",
    secondary: "#E8EEF5",
    accent: "#F59E0B",
  },
  contact: {
    phone: "062992 86072",
    whatsapp: "062992 86072",
    email: "aman.kalpra.11@gmail.com",
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
