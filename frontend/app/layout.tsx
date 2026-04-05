import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PrivyProviderWrapper from '@/providers/PrivyProviderWrapper';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'SolV — RWA Vouchers',
  description: 'Покупай ваучеры на Solana через Google за 10 секунд',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}