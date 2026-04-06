'use client';

import { useState, useEffect } from 'react';
import WalletAddress from './WalletAdress';
import QRCode from "react-qr-code";
import { useVoucherProgram} from '@/hooks/useVoucherProgram';
import { useWallets } from '@privy-io/react-auth/solana';
import VoucherCardLayout from '@/components/UI/VoucherCardLayout';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function UserView() {
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  const { fetchMyUserVouchers, getProgram, refundVoucher  } = useVoucherProgram();
  const { wallets, ready } = useWallets();

  const getVal = (val: any) => (val?.toNumber ? val.toNumber() : (val || 0));

  useEffect(() => {
    const load = async () => {
      if (ready && wallets.length > 0) {
        setIsLoading(true);
        try {
          const program = await getProgram();
          const userVouchers = await fetchMyUserVouchers();

          if (program && userVouchers) {
            const enriched = await Promise.all(userVouchers.map(async (v: any) => {
              try {
                //@ts-ignore
                const configData = await program.account.voucherConfig.fetch(v.account.config);
                
                if (!configData || !configData.name) return null;

                return { ...v, config: configData };
              } catch (err) {
                return null;
              }
            }));
            
            const cleanData = enriched.filter((v: any) => 
              v !== null && 
              getVal(v.account.remainingUnits) > 0
            );

            setMyVouchers(cleanData);
          }
        } catch (e) {
          console.error("Ошибка при синхронизации портфеля:", e);
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
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Мои активы</h2>
          <p className="text-slate-500 font-medium">Цифровые ваучеры, обеспеченные реальными активами</p>
        </div>
        <WalletAddress />
      </section>

      {/* MY VOUCHERS GRID */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-white uppercase  flex items-center gap-3">
            Активный портфель 
            <span className="text-[10px] bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 border border-indigo-500/20">
              {myVouchers.length}
            </span>
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
             [1, 2, 3].map(n => (
               <div key={n} className="h-[520px] bg-slate-900/40 rounded-[3rem] animate-pulse border border-slate-800" />
             ))
          ) : myVouchers.length === 0 ? (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
              <p className="text-slate-500 italic font-medium mb-6 text-sm">Ваше хранилище активов пока пусто.</p>
              <a href="/marketplace" className="px-8 py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                В маркетплейс
              </a>
            </div>
          ) : (
            myVouchers.map((v) => {
              const addr = v.publicKey.toBase58();
              const remaining = getVal(v.account.remainingUnits);
              const config = v.config;

              return (
                <VoucherCardLayout
                  key={addr}
                  name={config.name}
                  image={config.imageUrl}
                  description={config.description || "Описание отсутствует"}
                  statusBadge="● Owned"
                  price={(getVal(config.unitPrice) / 1e9).toFixed(3)}
                  documentHash={config.documentHash}
                  documentUrl={config.documentUrl}
                  
                  statsLeft={{ label: "Статус", value: "Верифицирован" }}
                  statsRight={{ label: "Осталось", value: `${remaining}` }}
                  progress={100}
                  
                  footerRight={{ 
                    label: "Истекает", 
                    value: new Date(getVal(config.expiryDate) * 1000).toLocaleDateString() 
                  }}
                  onRefund={async () => {
                    if (confirm("Вы уверены, что хотите вернуть этот ваучер и получить обратно свои SOL?")) {
                      try {
                        await refundVoucher(v.account.config.toBase58());
                        toast.success("Возврат средств выполнен!");
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                        toast.error("Возврат не удался");
                      }
                    }
                  }}
                  
                  actionButton={
                    <button 
                      onClick={() => setSelectedVoucher(addr)}
                      className="px-6 py-3 bg-white text-black rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95"
                    >
                      Use Voucher (QR)
                    </button>
                  }
                />
              );
            })
          )}

          {/* Add Asset Card */}
          {!isLoading && (
            <a href="/marketplace" className="border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-10 text-slate-600 hover:border-indigo-500/30 hover:text-indigo-400 transition-all cursor-pointer group min-h-[500px] bg-slate-900/5">
               <div className="text-5xl font-light mb-4 group-hover:scale-125 transition-transform">+</div>
               <p className="text-[10px] font-black uppercase tracking-widest text-center">Приобрести новый актив</p>
            </a>
          )}
        </div>
      </section>

      {/* QR MODAL */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setSelectedVoucher(null)}>
          <div 
            className="bg-[#0B1120] border border-slate-800 p-10 rounded-[3.5rem] text-center max-w-sm w-full relative shadow-2xl"
            onClick={e => e.stopPropagation()} 
          >
            <button 
              onClick={() => setSelectedVoucher(null)}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >✕</button>
            <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">Погасить актив</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-10 text-center">Предъявите этот код продавцу</p>
            
            <div className="bg-white p-6 rounded-[2.5rem] inline-block shadow-[0_0_50px_rgba(255,255,255,0.05)]">
              <QRCode value={selectedVoucher} size={180} />
            </div>
            
            <div className="mt-10 space-y-3">
               <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 rounded-2xl border border-slate-800 group">
                  <p className="text-[9px] font-mono text-indigo-400 break-all text-left pr-4 leading-relaxed select-text cursor-text">
                    {selectedVoucher}
                  </p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedVoucher);
                      toast.success("Address copied!");
                    }}
                    className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                    title="Copy Address"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
               </div>
               <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">Нажмите на значок, чтобы скопировать полный идентификатор</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}