import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketScholar - Forensic Market Intelligence',
  description: 'Institutional forensic intelligence for the modern research desk. Audit institutional theses and see the truth.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-base text-ink-900">{children}</body>
    </html>
  );
}
