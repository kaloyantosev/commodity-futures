import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-[#0c0c0e] min-h-screen text-white antialiased">
        <Header />
        <div className="bg-[#0c0c0e] min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
