'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import QRCode from 'react-qr-code';

export default function WalletAddress() {
  const { user } = usePrivy();
  const [balance, setBalance] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Достаем Solana-адрес из Privy
  const solanaWallet = user?.linkedAccounts.find(
    (a) => a.type === 'wallet' && a.chainType === 'solana'
  );
  const address = solanaWallet?.address;

  const fetchBalance = async () => {
    if (!address) return;
    try {
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const b = await connection.getBalance(new PublicKey(address));
      setBalance(b / LAMPORTS_PER_SOL);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Обновляем чаще для наглядности
    return () => clearInterval(interval);
  }, [address]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) return null;

  return (
    <>
      {/* КНОПКА-ВИДЖЕТ */}
      <div 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 p-1.5 pr-5 rounded-[2rem] cursor-pointer hover:border-indigo-500/50 transition-all active:scale-95 group"
      >
        <div className="bg-indigo-600 px-4 py-2 rounded-[1.5rem] shadow-[0_0_20px_rgba(79,70,229,0.3)]">
          <span className="text-[10px] block font-black uppercase leading-none opacity-70">SOL</span>
          <span className="text-sm font-black">{balance !== null ? balance.toFixed(3) : '...'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Wallet</span>
          <code className="text-xs font-mono text-slate-300 group-hover:text-indigo-400 transition-colors">
            {address.slice(0, 4)}...{address.slice(-4)}
          </code>
        </div>
      </div>

      {/* МОДАЛКА ПОПОЛНЕНИЯ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="relative bg-[#0B1120] border border-slate-800 w-full max-w-sm rounded-[3.5rem] p-10 shadow-2xl overflow-hidden">
            {/* Декор */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
            >
              ✕
            </button>

            <h3 className="text-2xl font-black text-center mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              Пополнить счет
            </h3>

            {/* QR CODE CONTAINER */}
            <div className="bg-white p-5 rounded-[2.5rem] w-fit mx-auto mb-8 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
              <QRCode 
                value={address} 
                size={160} 
                level="H"
                fgColor="#020617"
              />
            </div>

            <div className="space-y-6">
              {/* ADDRESS DISPLAY */}
              <div 
                onClick={copyAddress}
                className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:bg-slate-900 transition-colors group text-center"
              >
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Ваш адрес (нажми чтобы скопировать)</p>
                <p className="text-[11px] font-mono text-indigo-400 break-all leading-tight">
                  {copied ? "СКОПИРОВАНО! ✅" : address}
                </p>
              </div>

              {/* КНОПКИ ДЕЙСТВИЯ */}
              <div className="grid grid-cols-1 gap-3">
                <a 
                  href="https://faucet.solana.com/" 
                  target="_blank"
                  className="flex items-center justify-center py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
                >
                  🌐 Получить Devnet SOL (Airdrop)
                </a>
                
                <div className="relative group">
                  <button 
                    disabled
                    className="w-full py-4 bg-slate-800/50 border border-slate-700 text-slate-500 rounded-2xl font-bold text-sm cursor-not-allowed"
                  >
                    💳 Купить через Карту (Coming Soon)
                  </button>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-[10px] px-3 py-1 rounded-full text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Для Mainnet версии
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}