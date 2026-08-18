import type { Metadata } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "ASTU Stock Management System",
  description:
    "Web-based Stock Management System for Adama Science and Technology University — FIFO valuation, RBAC, audit logging, requisition workflow, and real-time inventory tracking.",
  icons: {
    icon: "/astu-logo.svg",
    apple: "/astu-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {/* Apply the saved theme before first paint. Defaults to light; only an
            explicit dark choice (stored by the toggle) switches to dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
        <Providers>
          {children}
          <SonnerToaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
