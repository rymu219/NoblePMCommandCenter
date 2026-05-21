import type { Metadata } from "next";
import { Montserrat, Zilla_Slab } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "800"],
  display: "swap",
});

const zillaSlab = Zilla_Slab({
  variable: "--font-zilla-slab",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Noble PM Command Center",
  description:
    "Project command center for Noble Plastics. Programs, projects, time tracking, schedules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${zillaSlab.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-noble-black">
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
