'use client';

import { useState, useEffect, useRef } from 'react';
import { useVoucherProgram } from '@/hooks/useVoucherProgram';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import VoucherCardLayout from '@/components/UI/VoucherCardLayout';

interface MarketplaceGridProps {
  limit?: number; // Опционально: сколько карточек показать (например, 3 для главной)
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
        // ЖЕСТКАЯ ФИЛЬТРАЦИЯ: только активные и с юнитами > 0
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
    // 1. Если Privy еще не готов, ничего не делаем
    if (!ready) return;

    // 2. Если кошелька НЕТ (юзер гость) — сразу вызываем окно логина
    if (wallets.length === 0) {
        console.log("Гость пытается купить, открываем Privy...");
        login();
        return;
    }

    // 3. Если кошелек есть, идем дальше
    if (buyingId) return;
    setBuyingId(id);

    try {
        const tx = await purchaseVoucher(id);
        alert(`Успех! Транзакция: ${tx.slice(0, 8)}...`);
        await loadData(true); 
    } catch (e: any) {
        console.error("Purchase error:", e);

        // 4. Перехватываем ту самую ошибку из ReadOnly режима
        if (e.message?.includes("Необходимо подключить кошелек")) {
        login();
        } else if (e.message?.includes("already in use")) {
        alert("У вас уже есть этот ваучер!");
        } else {
        alert("Ошибка при покупке: " + (e.message || "Неизвестная ошибка"));
        }
    } finally {
        setBuyingId(null);
    }
    };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(n => (
          <div key={n} className="h-[480px] bg-slate-900/40 rounded-[3rem] animate-pulse border border-slate-800" />
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
          <p className="text-slate-500 font-medium italic">Нет доступных активов на продажу.</p>
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
                description={data.description || "No description"}
                statusBadge="● Available"
                price={price}
                statsLeft={{ label: "Price", value: "SOL" }}
                statsRight={{ label: "Stock", value: `${rem}/${tot}` }}
                progress={(rem / tot) * 100}
                footerLeft={{ label: "Asset ID", value: addr.slice(0, 8) }}
                footerRight={{ label: "Type", value: "RWA NFT" }}
                actionButton={
                  <button 
                    onClick={() => handleBuy(addr)}
                    disabled={!!buyingId}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                      buyingId === addr 
                      ? 'bg-slate-800 text-slate-500 animate-pulse' 
                      : 'bg-white text-black hover:bg-indigo-500 hover:text-white shadow-xl shadow-white/5 active:scale-95'
                    }`}
                  >
                    {buyingId === addr ? 'Processing...' : 'Buy Voucher'}
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