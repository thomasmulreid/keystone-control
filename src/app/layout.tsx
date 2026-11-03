import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keystone Control",
  description:
    "Two control panels on one commercetools project — what Keystone sees, and what each customer sees.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
