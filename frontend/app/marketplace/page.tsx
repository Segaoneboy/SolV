"use client"
import MarketplaceGrid from '@/components/MarketplaceGrid';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Используй Link вместо router.push для ссылок
import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';

export default function MarketplaceView() {
  const router = useRouter();
  const { logout, ready, authenticated } = usePrivy();

  // Защита роута: если не авторизован — на выход
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  if (!ready) return null; // Или красивый скелетон загрузки

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* HEADER / NAV — Лучше вынести в отдельный компонент */}
      <header className="sticky top-0 z-50 border-b border-slate-900/80 bg-[#020617]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black tracking-tighter text-white">
              SolV
            </Link>
            <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
              <Link href="/marketplace" className="hover:text-white transition">Маркетплейс</Link>
              <a className="hover:text-white transition" href='https://t.me/sega_oneboy' target="_blank" rel="noopener noreferrer">
                Поддержка
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Devnet</span>
            </div>
            
            <button 
              onClick={logout}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-xs font-bold transition-all active:scale-95 text-white"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-black text-white  uppercase tracking-tighter">
            Маркетплейс 
          </h1>
          <p className="text-slate-500 font-medium">Просматривайте и приобретайте ваучеры, обеспеченные активами реального мира (RWA).</p>
        </div>

        <MarketplaceGrid />
      </main>
    </div>
  );
}