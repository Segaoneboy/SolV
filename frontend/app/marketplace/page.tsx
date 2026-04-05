"use client"
import MarketplaceGrid from '@/components/MarketplaceGrid';

export default function MarketplaceView() {
  return (
    <div className="min-h-screen bg-[#020617] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-20 text-center space-y-4">
          <h1 className="text-8xl font-black italic uppercase tracking-tighter text-white">Store</h1>
          <p className="text-indigo-500 font-mono tracking-[0.4em] uppercase text-[10px]">Real World Assets On-Chain</p>
        </header>

        <MarketplaceGrid />
      </div>
    </div>
  );
}