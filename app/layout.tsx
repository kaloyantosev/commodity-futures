import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Commodity Futures Platform | Market Intelligence',
  description: 'Institutional-grade commodity futures analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0e1a] min-h-screen text-white antialiased">
        <Header />
        <div className="bg-[#0a0e1a] min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
