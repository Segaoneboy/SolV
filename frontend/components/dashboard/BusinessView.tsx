'use client';

import { useState, useEffect } from 'react';
import WalletAddress from './WalletAdress';
import { useVoucherProgram } from '@/hooks/useVoucherProgram';
import { useWallets } from '@privy-io/react-auth/solana';
import RedeemTerminal from "@/components/dashboard/RedeemTerminal";
import VoucherCardLayout from '../UI/VoucherCardLayout';

export default function BusinessView() {
  const [isMinting, setIsMinting] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]); // Здесь храним ВСЕ серии для статистики
  const { createVoucherSeries, fetchMyVoucherSeries, redeemVoucher, getProgram } = useVoucherProgram();
  const { wallets, ready } = useWallets();

  const [isRedeeming, setIsRedeeming] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    documentHash: '',
    unitPrice: '', 
    totalUnits: '',
    expiryDays: '7',
  });

  const getVal = (val: any) => (val?.toNumber ? val.toNumber() : (val || 0));

  const loadVouchers = async () => {
    try {
      const data = await fetchMyVoucherSeries();
      // Сохраняем полный массив данных, чтобы рассчитать общие продажи
      setVouchers(data || []);
    } catch (err) {
      console.error("Failed to load vouchers:", err);
    }
  };

  useEffect(() => {
    if (ready && wallets.length > 0) {
      loadVouchers();
    }
  }, [ready, wallets.length]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMinting(true);
    try {
      await createVoucherSeries(formData);
      alert(`Серия "${formData.name}" успешно создана!`);
      await loadVouchers(); 
    } catch (err: any) {
      console.error(err);
      alert("Ошибка: " + err.message);
    } finally {
      setIsMinting(false);
    }
  };

  const handleRedeem = async (userVoucherAddress: string) => {
    setIsRedeeming(true);
    try {
      const program = await getProgram();
      const userVoucherAcc = await program.account.userVoucher.fetch(userVoucherAddress);
      const ownerBase58 = userVoucherAcc.owner.toBase58();

      await redeemVoucher(userVoucherAddress, ownerBase58, 1);
      
      alert("Успешно погашено!");
      await loadVouchers(); 
    } catch (err: any) {
      console.error("Redeem error:", err);
      alert("Ошибка: " + (err.message || "Не удалось списать юнит"));
    } finally {
      setIsRedeeming(false);
    }
  };

  // Фильтруем список для отображения карточек (только те, где есть остаток)
  const activeCards = vouchers.filter(v => getVal(v.account.remainingUnits) > 0);
  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 p-4">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: ФОРМА */}
      <section className="lg:col-span-1 space-y-6">
        <div className="bg-[#0B1120] border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl sticky top-6">
          <h3 className="text-2xl font-black mb-6 text-white uppercase italic tracking-tighter">Новая серия RWA</h3>
          
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Название проекта</label>
              <input 
                type="text" 
                placeholder="Coffee Pass #1"
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 focus:border-indigo-500 transition-all text-white outline-none"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Цена (SOL)</label>
                <input 
                  type="number" step="0.001" placeholder="0.05"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 focus:border-indigo-500 transition-all text-white font-mono outline-none"
                  onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Эмиссия (шт)</label>
                <input 
                  type="number" placeholder="100"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 focus:border-indigo-500 transition-all text-white font-mono outline-none"
                  onChange={(e) => setFormData({...formData, totalUnits: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* URL Обложки и другие поля... */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">URL Обложки</label>
              <input 
                type="url" 
                placeholder="https://..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 focus:border-indigo-500 transition-all text-xs text-slate-400 outline-none"
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Описание оферты</label>
              <textarea 
                placeholder="Условия использования, что дает ваучер..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 h-24 resize-none focus:border-indigo-500 transition-all text-sm text-slate-300 outline-none"
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Юридический Proof</label>
              <input 
                type="text" 
                placeholder="SHA-256 или ссылка"
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 focus:border-indigo-500 transition-all text-xs text-slate-400 font-mono outline-none"
                onChange={(e) => setFormData({...formData, documentHash: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Срок действия</label>
              <select 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 focus:border-indigo-500 transition-all appearance-none text-white cursor-pointer outline-none"
                onChange={(e) => setFormData({...formData, expiryDays: e.target.value})}
              >
                <option value="7">7 дней</option>
                <option value="30">30 дней</option>
                <option value="90">90 дней</option>
                <option value="365">1 год</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={isMinting}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                isMinting ? 'bg-slate-800 text-slate-500 animate-pulse' : 'bg-white text-black hover:bg-indigo-500 hover:text-white shadow-xl shadow-white/5'
              }`}
            >
              {isMinting ? 'Запись в блокчейн...' : 'Выпустить серию'}
            </button>
          </form>
        </div>
      </section>

      {/* ПРАВАЯ ПАНЕЛЬ: УПРАВЛЕНИЕ */}
      <section className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Менеджмент</h3>
          <WalletAddress />
        </div>

        {/* СТАТИСТИКА — Считается по ВСЕМУ массиву vouchers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-[#0B1120] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
            <p className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest">Продано юнитов (Total)</p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {vouchers.reduce((acc, v) => acc + (getVal(v.account.totalUnits) - getVal(v.account.remainingUnits)), 0)}
            </p>
          </div>

          <div className="bg-[#0B1120] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Активных серий</p>
            <p className="text-5xl font-black text-white tracking-tighter">{activeCards.length}</p>
          </div>
        </div>

        <RedeemTerminal onRedeem={handleRedeem} isProcessing={isRedeeming} />

        {/* СЕТКА КАРТОЧЕК — Показываем только activeCards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {activeCards.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem]">
              <p className="text-slate-500 font-medium italic">Нет серий с доступными остатками.</p>
            </div>
          ) : (
            activeCards.map((v) => {
              const data = v.account;
              const rem = getVal(data.remainingUnits);
              const tot = getVal(data.totalUnits);

              return (
                <VoucherCardLayout
                  key={v.publicKey.toBase58()}
                  image={data.imageUrl}
                  name={data.name}
                  description={data.description || "No description"}
                  statusBadge={data.isActive ? '● Active' : '○ Off'}
                  price={(getVal(data.unitPrice) / 1e9).toFixed(3)}
                  statsLeft={{ label: "Price", value: "SOL" }}
                  statsRight={{ label: "Units", value: `${rem} / ${tot}` }}
                  progress={(rem / tot) * 100}
                  footerLeft={{ label: "ID", value: v.publicKey.toBase58() }}
                  footerRight={{ label: "Exp", value: new Date(getVal(data.expiryDate) * 1000).toLocaleDateString() }}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}