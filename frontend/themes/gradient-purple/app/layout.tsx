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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
