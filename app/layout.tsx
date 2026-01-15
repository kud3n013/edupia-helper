import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Background } from "@/components/Background";
import { createClient } from "@/utils/supabase/server";
import { SmoothScrolling } from "@/components/SmoothScrolling";
import { FaviconManager } from "@/components/FaviconManager";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  subsets: ["vietnamese", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Edupia Helper",
  description: "A helper tool for Edupia teachers to generate feedback.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${beVietnamPro.variable} font-sans antialiased`}
      >
        <SmoothScrolling />
        <FaviconManager />
        <div className="flex min-h-screen relative pr-[var(--sidebar-width)] max-sm:flex-col max-sm:pr-0 max-sm:pb-[60px]">
          <Background />
          {/* Main Content Area */}
          <main className="flex-1 w-full py-8 md:pl-8 pr-4">
            {children}
          </main>
          <Sidebar isAuthenticated={isAuthenticated} />
        </div>
      </body>
    </html>
  );
}
