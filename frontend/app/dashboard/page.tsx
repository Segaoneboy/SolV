'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import UserView from '@/components/dashboard/UserView';
import BusinessView from '@/components/dashboard/BusinessView';
import WalletAddress from '@/components/dashboard/WalletAdress';

export default function DashboardPage() {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();

  // 1. Защита роута: если юзер не залогинен, отправляем на главную
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  // Пока Privy инициализируется, показываем стильный лоадер
  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('solv_role') : 'user';
  const isAdmin = user?.email?.address === "твой@email.com" || userRole === 'business';

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/5 blur-[120px] rounded-full"></div>
      </div>
      {/* NAVIGATION BAR */}
      <header>
        <nav className="relative z-20 border-b border-slate-900/80 bg-[#020617]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            <div className="flex items-center gap-8">
              <span className="text-2xl font-black tracking-tighter text-white cursor-pointer" onClick={() => router.push('/')}>
                SolV
              </span>
              <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
                <button className="hover:text-white transition" onClick={() => router.push('/marketplace')}>Маркетплейс</button>
                <a className="hover:text-white transition" href='https://t.me/sega_oneboy'>Поддержка</a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Статус сети */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Devnet</span>
              </div>
              
              {/* Кнопка выхода */}
              <button 
                onClick={logout}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-xs font-bold transition-all active:scale-95"
              >
                Выйти
              </button>
            </div>
          </div>
        </nav>
      </header>
      

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {isAdmin ? <BusinessView /> : <UserView />}
      </main>

      {/* FOOTER / INFO */}
      <footer className="max-w-7xl mx-auto px-6 py-10 opacity-30 text-[10px] uppercase tracking-[0.2em] font-mono flex justify-between items-center">
        <span>© 2026 SolV Protocol</span>
        <span>Build on Solana</span>
      </footer>
    </div>
  );
}