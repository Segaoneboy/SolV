import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PrivyProviderWrapper from '@/providers/PrivyProviderWrapper';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'SolV — RWA Vouchers',
  description: 'Покупай ваучеры на Solana через Google за 10 секунд',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: { background: '#0B1120', color: '#fff', border: '1px solid #1e293b' },
          }} 
        />
        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}