import React from 'react';

interface VoucherCardLayoutProps {
  image: string;
  name: string;
  description?: string;
  statusBadge?: string;
  price: string | number;
  statsLeft: { label: string; value: string | number };
  statsRight: { label: string; value: string | number };
  progress: number;
  documentHash: string;
  documentUrl: string;
  footerRight: { label: string; value: string };
  actionButton?: React.ReactNode;
  onRefund?: () => void;
}

const isExternalLink = (text: string) => {
  if (!text) return false;
  return text.startsWith('http://') || text.startsWith('https://');
};

export default function VoucherCardLayout({
  image,
  name,
  description,
  statusBadge,
  price,
  statsRight,
  progress,
  documentHash,
  documentUrl,
  footerRight,
  onRefund,
  actionButton
}: VoucherCardLayoutProps) {

  const hasValidLink = isExternalLink(documentUrl);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert("Hash copied to clipboard!");
  };

  return (
    <div className="bg-[#0B1120] border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-indigo-500/50 transition-all duration-500 flex flex-col h-full shadow-2xl">
      {/* Top Image Section */}
      <div className="relative h-56 overflow-hidden">
        <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={name} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent opacity-80"></div>
        
        {statusBadge && (
          <div className="absolute top-6 left-6 flex gap-2">
            <span className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
              {statusBadge}
            </span>
          </div>
        )}

        <div className="absolute bottom-6 left-8">
          <h4 className="text-2xl font-black text-white tracking-tighter uppercase truncate max-w-[240px] drop-shadow-md">
            {name}
          </h4>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-8 space-y-6 flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          {/* Price & Stats */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Цена за единицу</p>
              <p className="text-2xl font-black text-indigo-400 font-mono">
                {price} <span className="text-xs">SOL</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{statsRight.label}</p>
              <p className="text-xl font-black text-white">{statsRight.value}</p>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2 italic opacity-80">
              {description}
            </p>
          )}

          <div className="space-y-3 pt-2">
            <div 
              className="group/hash cursor-pointer"
              onClick={() => copyToClipboard(documentHash)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">Контракт SHA-256</span>
                <span className="text-[8px] text-indigo-500 opacity-0 group-hover/hash:opacity-100 transition-opacity uppercase font-bold">Нажмите, чтобы скопировать</span>
              </div>
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-2 flex items-center justify-between group-hover/hash:border-slate-700 transition-colors">
                <p className="text-[10px] font-mono text-slate-500 truncate max-w-[90%]">
                  {documentHash || "No hash provided"}
                </p>
                <svg className="text-slate-600 shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </div>
            </div>

            {hasValidLink ? (
              <a 
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all duration-300 group/link shadow-sm"
              >
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                View Full Agreement
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/link:translate-x-0.5 transition-transform">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
            ) : (
              <div className="py-2.5 px-4 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl text-center">
                <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Ссылка на документ отсутствует</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-2">
             <div className="flex justify-between text-[9px] font-black uppercase text-slate-600 tracking-widest">
                <span>Sold progress</span>
                <span>{Math.round(progress)}%</span>
             </div>
             <div className="relative h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          </div>
        </div>

        {/* Footer Info & Actions */}
        <div className="pt-6 border-t border-slate-800/50 space-y-4 mt-auto">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">Срок действия до:</p>
              <p className="text-[10px] font-mono text-slate-400">
                {footerRight.value}
              </p>
            </div>
            {actionButton && <div className="shrink-0">{actionButton}</div>}
          </div>

          {onRefund && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefund();
              }}
              className="w-full py-3.5 px-4 border border-red-500/20 bg-red-500/5 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group/refund shadow-lg active:scale-[0.98]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/refund:rotate-[-45deg] transition-transform">
                 <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6-6m-6 6l6 6"/>
              </svg>
              Вернуть SOL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}