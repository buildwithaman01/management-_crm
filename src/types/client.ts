import { z } from "zod";

export const ClientConfigSchema = z.object({
  id: z.string().min(1),
  businessName: z.string().min(1),
  shortName: z.string().min(1),
  logoPath: z.string().default("/logo.png"),
  faviconPath: z.string().default("/favicon.ico"),
  colors: z.object({
    primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
    secondary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
    accent: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  }),
  contact: z.object({
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string().email().or(z.literal("")),
    city: z.string().min(1),
  }),
  locale: z.object({
    countryCode: z.string().default("+91"),
    currency: z.string().default("INR"),
    currencySymbol: z.string().default("₹"),
    feeUnit: z.enum(["month", "hour"]).default("month"),
    timezone: z.string().default("Asia/Kolkata"),
    languages: z.array(z.string()).default(["en", "hi"]),
  }),
  features: z.object({
    smartMatching: z.boolean().default(true),
    assignments: z.boolean().default(true),
    followups: z.boolean().default(true),
    payments: z.boolean().default(false),
    advancedAnalytics: z.boolean().default(true),
  }),
  tutorFields: z
    .record(
      z.object({
        enabled: z.boolean().optional(),
        requiredAt: z.enum(["submit", "verify", "optional"]).optional(),
        showOnPublicForm: z.boolean().optional(),
        sensitive: z.boolean().optional(),
      })
    )
    .optional()
    .default({}),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
