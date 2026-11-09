import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--brand-primary, #1F4E79)",
          secondary: "var(--brand-secondary, #E8EEF5)",
          accent: "var(--brand-accent, #F59E0B)",
        },
        status: {
          success: {
            bg: "#DEF7EC",
            text: "#03543F",
            border: "#BCF0DA",
          },
          warning: {
            bg: "#FEF08A",
            text: "#713F12",
            border: "#FDE047",
          },
          info: {
            bg: "#E1EFFE",
            text: "#1E429F",
            border: "#BEE3F8",
          },
          danger: {
            bg: "#FDE8E8",
            text: "#9B1C1C",
            border: "#F8B4B4",
          },
          neutral: {
            bg: "#F3F4F6",
            text: "#374151",
            border: "#E5E7EB",
          },
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
