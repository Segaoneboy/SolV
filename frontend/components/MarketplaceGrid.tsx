'use client';

import { toast } from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';
import { useVoucherProgram } from '@/hooks/useVoucherProgram';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import VoucherCardLayout from '@/components/UI/VoucherCardLayout';

interface MarketplaceGridProps {
  limit?: number; 
  title?: string;
}

export default function MarketplaceGrid({ limit, title }: MarketplaceGridProps) {


  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  
  const { fetchAllVoucherSeries, purchaseVoucher } = useVoucherProgram();
  const { ready, login } = usePrivy();
  const { wallets } = useWallets();
  const isLoaded = useRef(false);

  const getVal = (val: any) => (val?.toNumber ? val.toNumber() : (val || 0));

  const loadData = async (force = false) => {
    if (!force && isLoaded.current) return;

    try {
      setLoading(true);
      const data = await fetchAllVoucherSeries();
      if (data) {
        const activeOnly = data.filter((s: any) => 
          s.account.isActive && getVal(s.account.remainingUnits) > 0
        );
        setSeries(activeOnly);
      }
      isLoaded.current = true;
    } catch (e) {
      console.error("Marketplace load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => { isLoaded.current = false; };
  }, [ready, wallets.length]);

  const handleBuy = async (id: string) => {
    if (!ready) return;

    // Проверка кошелька перед покупкой
    if (wallets.length === 0) {
        toast('Connect your wallet to continue', { icon: '🔐' });
        login();
        return;
    }

    if (buyingId) return;
    setBuyingId(id);

    await toast.promise(
        purchaseVoucher(id),
        {
            loading: 'Preparing transaction...',
            success: (tx: any) => {
                loadData(true); 
                return `Success! Voucher purchased.`;
            },
            error: (err: any) => {
                const msg = err.message || "";
                
                if (msg.includes("closed") || msg.includes("rejected") || msg.includes("cancelled")) {
                    return "Purchase cancelled"; 
                }
                
                // Ошибка "уже куплено"
                if (msg.includes("already in use") || msg.includes("0x0")) {
                    return "You already own this voucher!";
                }

                return "Transaction failed. Please try again.";
            }
        },
        {
            style: {
                minWidth: '250px',
                borderRadius: '16px',
                background: '#0F172A',
                color: '#fff',
                border: '1px solid #1E293B'
            },
            success: { duration: 5000,  },
            error: { duration: 4000,  }
        }
    ).finally(() => {
        setBuyingId(null);
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(n => (
          <div key={n} className="h-[520px] bg-slate-900/40 rounded-[3rem] animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  const displayItems = limit ? series.slice(0, limit) : series;

  return (
    <div className="space-y-12">
      {title && (
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">{title}</h2>
      )}

      {displayItems.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
          <p className="text-slate-500 font-medium italic">Активных ваучеров RWA не найдено.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayItems.map((s) => {
            const data = s.account;
            const addr = s.publicKey.toBase58();
            const price = (getVal(data.unitPrice) / 1e9).toFixed(3);
            const rem = getVal(data.remainingUnits);
            const tot = getVal(data.totalUnits);

            return (
              <VoucherCardLayout
                key={addr}
                image={data.imageUrl}
                name={data.name}
                description={data.description || "No description provided"}
                statusBadge="● Available"
                price={price}
                statsLeft={{ label: "Price", value: "SOL" }}
                statsRight={{ label: "Stock", value: `${rem}/${tot}` }}
                progress={(rem / tot) * 100}
                
                // Передаем новые поля для юридической проверки
                documentHash={data.documentHash}
                documentUrl={data.documentUrl}
                
                footerRight={{ 
                  label: "Valid Until", 
                  value: new Date(getVal(data.expiryDate) * 1000).toLocaleDateString() 
                }}
                
                actionButton={
                  <button 
                    onClick={() => handleBuy(addr)}
                    disabled={!!buyingId}
                    className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg ${
                      buyingId === addr 
                      ? 'bg-slate-800 text-slate-500 animate-pulse cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-indigo-500 hover:text-white active:scale-95'
                    }`}
                  >
                    {buyingId === addr ? 'Wait...' : 'Buy Voucher'}
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}