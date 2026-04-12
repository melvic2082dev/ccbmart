import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCB Mart - He thong quan ly",
  description: "CCB Mart Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
