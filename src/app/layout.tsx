import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getClientConfig } from "@/config/client-config";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const config = getClientConfig();
  return {
    title: {
      default: config.businessName,
      template: `%s | ${config.shortName}`,
    },
    description: `Official portal for ${config.businessName} - Connecting students with experienced home and online tutors.`,
    icons: {
      icon: config.faviconPath,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getClientConfig();

  return (
    <html
      lang="en"
      style={
        {
          "--brand-primary": config.colors.primary,
          "--brand-secondary": config.colors.secondary,
          "--brand-accent": config.colors.accent,
        } as React.CSSProperties
      }
    >
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
