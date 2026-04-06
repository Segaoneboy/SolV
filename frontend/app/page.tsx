'use client';

import MarketplaceGrid from '@/components/MarketplaceGrid';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

const BusinessIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3 opacity-70">
    <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 21V7L13 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 21V11L13 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10V10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 14V14.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function LandingPage() {
  const router = useRouter();
  const { login, ready, authenticated } = usePrivy();

  const handleLogin = (role: 'user' | 'business') => {
    localStorage.setItem('solv_role', role);
    login();
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 font-sans relative overflow-hidden">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/15 blur-[160px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[5%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[140px] rounded-full animate-pulse-slow delay-1000"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <header className="flex justify-between items-center pb-12 border-b border-slate-900/50 mb-20">
           <div className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
             SolV
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Solana Devnet Ready</span>
           </div>
        </header>

        {/* HERO SECTION */}
        <section className="flex flex-col items-center justify-center text-center pb-32">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-medium tracking-wider uppercase backdrop-blur-sm">
            <span className="text-indigo-400">◆</span> Real World Assets on Solana
          </div>
          
          <h1 className="text-7xl md:text-[120px] font-black mb-10 tracking-tighter leading-[0.9] bg-gradient-to-b from-white via-white to-slate-600 bg-clip-text text-transparent">
            Сертификаты <br/> как надо
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-16 leading-relaxed">
            Революция в мире подарочных карт и услуг. Выпускай, покупай и используй RWA-ваучеры любимых заведений напрямую через блокчейн Solana.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center">
            {authenticated ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="group relative w-full sm:w-[400px] px-10 py-6 bg-indigo-600 rounded-[2.5rem] font-bold text-2xl transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-95"
              >
                Личный кабинет
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-white/50 group-hover:translate-x-1.5 transition-transform">→</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleLogin('user')}
                  className="group relative flex-1 px-10 py-6 bg-indigo-600 rounded-[2.5rem] font-bold text-2xl transition-all shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:scale-95"
                >
                  Я покупатель
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/50 group-hover:translate-x-1.5 transition-transform">→</span>
                </button>
                
                <button
                  onClick={() => handleLogin('business')}
                  className="group flex-1 flex items-center justify-center px-10 py-6 bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 rounded-[2.5rem] font-bold text-2xl text-white transition-all backdrop-blur-sm active:scale-95"
                >
                  <BusinessIcon />
                  Для бизнеса
                </button>
              </>
            )}
          </div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="max-w-7xl mx-auto px-8">
        <MarketplaceGrid limit={3} title="Последние ваучеры" />
        
        <div className="mt-12 text-center">
          <a href="/marketplace" className="text-indigo-400 font-black uppercase tracking-widest hover:text-white transition-colors">
            Смотреть все активы →
          </a>
        </div>
      </section>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite;
        }
        .delay-1000 { animation-delay: 2s; }
      `}</style>
    </main>
  );
}