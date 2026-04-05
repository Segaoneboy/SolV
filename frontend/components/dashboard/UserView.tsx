'use client';

import { useState, useEffect } from 'react';
import WalletAddress from './WalletAdress';
import QRCode from "react-qr-code";
import { useVoucherProgram } from '@/hooks/useVoucherProgram';
import { useWallets } from '@privy-io/react-auth/solana';
import VoucherCardLayout from '@/components/UI/VoucherCardLayout';

export default function UserView() {
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { fetchMyUserVouchers, getProgram } = useVoucherProgram();
  const { wallets, ready } = useWallets();

  useEffect(() => {
    const load = async () => {
      if (ready && wallets.length > 0) {
        setIsLoading(true);
        try {
          const program = await getProgram();
          const userVouchers = await fetchMyUserVouchers();

          if (program && userVouchers && userVouchers.length > 0) {
            // 1. Фильтрация: проверяем на наличие юнитов (учитываем BN и обычные number)
            const activeOnly = userVouchers.filter(v => {
              const units = v.account.remainingUnits;
              const unitsNum = units?.toNumber ? units.toNumber() : (units || 0);
              return unitsNum > 0;
            });

            // 2. Обогащение данными конфига
            const enriched = await Promise.all(activeOnly.map(async (v: any) => {
              try {
                const configData = await program.account.voucherConfig.fetch(v.account.config);
                return { ...v, config: configData };
              } catch (err) {
                console.warn("Ошибка подгрузки конфига для ваучера:", err);
                return v;
              }
            }));
            
            setMyVouchers(enriched);
          } else {
            setMyVouchers([]);
          }
        } catch (e) {
          console.error("Ошибка при загрузке ваучеров:", e);
        } finally {
          setIsLoading(false);
        }
      }
    };
    load();
  }, [ready, wallets.length]);

  return (
    <div className="space-y-10 p-4">
      {/* HEADER */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Привет! 👋</h2>
          <p className="text-slate-500 font-medium">Твои цифровые активы в безопасности.</p>
        </div>
        <WalletAddress />
      </section>

      {/* MY VOUCHERS GRID */}
      <section>
        <h3 className="text-xl font-black text-white uppercase italic mb-6 flex items-center gap-3">
          Мои ваучеры 
          <span className="text-[10px] bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 border border-indigo-500/20">
            {myVouchers.length}
          </span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
             <div className="col-span-full py-20 text-center animate-pulse text-slate-500 uppercase font-black tracking-widest">
               Синхронизация активов...
             </div>
          ) : myVouchers.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem]">
              <p className="text-slate-500 italic font-medium">У тебя пока нет активных ваучеров.</p>
            </div>
          ) : (
            myVouchers.map((v) => {
              const addr = v.publicKey.toBase58();
              const remaining = v.account.remainingUnits.toString();
              const config = v.config;

              return (
                <VoucherCardLayout
                  key={addr}
                  name={config?.name || `Asset #${addr.slice(0, 4)}`}
                  image={config?.imageUrl || "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"}
                  statusBadge="● Owned"
                  price={config ? (config.unitPrice.toNumber() / 1e9).toFixed(3) : "---"}
                  statsLeft={{ label: "Status", value: "Verified" }}
                  statsRight={{ label: "Units Left", value: remaining }}
                  progress={100} 
                  footerLeft={{ label: "Asset ID", value: `${addr.slice(0, 4)}...${addr.slice(-4)}` }}
                  footerRight={{ label: "Type", value: "RWA NFT" }}
                  actionButton={
                    <button 
                      onClick={() => setSelectedVoucher(addr)}
                      className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl shadow-white/5"
                    >
                      Показать QR
                    </button>
                  }
                />
              );
            })
          )}

          <a href="/marketplace" className="border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-slate-600 hover:border-indigo-500/30 hover:text-indigo-400 transition-all cursor-pointer group min-h-[450px]">
             <div className="text-5xl mb-4 group-hover:scale-125 transition-transform">+</div>
             <p className="text-[10px] font-black uppercase tracking-widest text-center">Приобрести новый актив</p>
          </a>
        </div>
      </section>

      {/* MODAL ДЛЯ QR */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B1120] border border-indigo-500/30 p-12 rounded-[3.5rem] text-center max-w-sm w-full relative shadow-[0_0_100px_rgba(79,70,229,0.2)]">
            <button 
              onClick={() => setSelectedVoucher(null)}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >✕</button>
            <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">Ваш QR-код</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10 text-center">Предъявите для сканирования</p>
            <div className="bg-white p-8 rounded-[2.5rem] inline-block shadow-[0_0_60px_rgba(255,255,255,0.1)]">
              <QRCode value={selectedVoucher} size={200} viewBox={`0 0 256 256`} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
            </div>
            <p className="mt-10 text-[9px] font-mono text-indigo-400/50 break-all leading-relaxed">
              ID: {selectedVoucher}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}