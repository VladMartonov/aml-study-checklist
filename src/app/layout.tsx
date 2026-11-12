import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AML Study Checklist",
  description: "Keep track of your AML learning goals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1f33",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <div className="flex-1">{children}</div>
        <footer className="bg-navy-900 text-slate-300">
          <div className="mx-auto w-full max-w-2xl px-4 py-5 text-center text-sm sm:px-6">
            <p className="break-words">
              © 2026 AML Certification Centre. Built with Claude Code
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
