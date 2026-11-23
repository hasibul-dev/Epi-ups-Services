import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPI UPS Enterprise Management System",
  description: "Enterprise management platform for EPI UPS (Bangladesh) Limited",
  icons: { icon: "/logo.svg" },
};

const themeScript = `try{var t=localStorage.getItem('epi-theme')||'dark';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
