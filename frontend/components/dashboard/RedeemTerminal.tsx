'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Scanner } from '@yudiel/react-qr-scanner';

interface RedeemTerminalProps {
  onRedeem: (address: string) => Promise<void>;
  isProcessing: boolean;
}

export default function RedeemTerminal({ onRedeem, isProcessing }: RedeemTerminalProps) {
  const [address, setAddress] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!address) return;
    
    try {
      new PublicKey(address); // Валидация
      await onRedeem(address);
      setAddress('');
      setShowScanner(false);
    } catch (err) {
      alert("Неверный формат адреса ваучера");
    }
  };

  // Обработка результата сканирования
  const handleScan = (result: string) => {
    if (result) {
      setAddress(result);
      setShowScanner(false); // Закрываем камеру после успешного скана
    }
  };

  return (
    <div className="bg-[#0B1120] border border-indigo-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/5">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 12h8M12 8v8"/></svg>
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Terminal</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Redeem RWA Units</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input 
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адрес ваучера (PDA)..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-indigo-300 font-mono text-sm focus:border-indigo-500 outline-none transition-all pr-14"
          />
          <button 
            type="button"
            onClick={() => setShowScanner(!showScanner)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${showScanner ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h2v2H7zm10 0h-2v2h2zM7 17h2v-2H7zm10-10V5h-2M7 5H5v2m14 10v2h-2M7 19H5v-2"/></svg>
          </button>
        </div>

        {showScanner && (
          <div className="aspect-square bg-black rounded-3xl border border-slate-800 relative overflow-hidden shadow-inner">
            <Scanner
                onScan={(detectedCodes) => {
                    if (detectedCodes.length > 0) {
                        handleScan(detectedCodes[0].rawValue);
                    }
                }}
                onError={(error) => console.log(error?.message)}
                styles={{
                    container: { width: '100%', height: '100%' }
                }}
                components={{
                    audio: false, // Чтобы не пищало при каждом скане
                }}
            />
            {/* Оверлей сканера */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-indigo-500/50 rounded-xl relative">
                    <div className="absolute inset-0 animate-scan-line bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent h-1/2 w-full top-0"></div>
                </div>
            </div>
            <button 
              type="button"
              onClick={() => setShowScanner(false)}
              className="absolute top-4 right-4 z-10 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black transition-colors"
            >✕</button>
          </div>
        )}

        <button 
          type="submit"
          disabled={isProcessing || !address}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            isProcessing 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed animate-pulse' 
              : 'bg-indigo-500 text-white hover:bg-white hover:text-black shadow-xl shadow-indigo-500/20'
          }`}
        >
          {isProcessing ? 'Подтверждение в сети...' : 'Погасить ваучер'}
        </button>
      </form>
    </div>
  );
}