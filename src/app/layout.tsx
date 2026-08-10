import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'HasaFlow — Visual Indic AI Pipeline Studio',
  description:
    'Build, execute, and monitor visual multi-node Indic speech and language pipelines using Sarvam AI APIs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 antialiased min-h-screen flex flex-col">
        <SessionProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
