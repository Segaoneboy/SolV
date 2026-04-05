interface VoucherCardLayoutProps {
  image: string;
  name: string;
  description?: string; // ДОБАВИЛИ ПРОПС
  statusBadge?: string;
  price: string | number;
  statsLeft: { label: string; value: string | number };
  statsRight: { label: string; value: string | number };
  progress: number;
  footerLeft: { label: string; value: string };
  footerRight: { label: string; value: string };
  actionButton?: React.ReactNode;
}

export default function VoucherCardLayout({
  image,
  name,
  description, // ДОБАВИЛИ СЮДА
  statusBadge,
  price,
  statsLeft,
  statsRight,
  progress,
  footerLeft,
  footerRight,
  actionButton
}: VoucherCardLayoutProps) {

  const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  alert("Address copied!"); // Можно заменить на красивый тост
};

  return (
    <div className="bg-[#0B1120] border border-slate-800 rounded-[2.5rem] overflow-hidden group hover:border-indigo-500/50 transition-all duration-500 flex flex-col h-full">
      {/* Top Image Section */}
      <div className="relative h-56 overflow-hidden">
        <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={name} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent opacity-80"></div>
        
        {statusBadge && (
          <div className="absolute top-6 left-6 flex gap-2">
            <span className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
              {statusBadge}
            </span>
          </div>
        )}

        <div className="absolute bottom-6 left-8">
          {/* Убрал max-w-[3rem], иначе длинные названия будут ломаться в столбик по одной букве */}
          <h4 className="text-2xl font-black text-white tracking-tighter uppercase truncate max-w-[200px]">{name}</h4>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-8 space-y-6 flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Price per unit</p>
              <p className="text-2xl font-black text-indigo-400 font-mono">
                {price} <span className="text-xs">SOL</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{statsRight.label}</p>
              <p className="text-xl font-black text-white">{statsRight.value}</p>
            </div>
          </div>

          {/* ДОБАВИЛИ БЛОК ОПИСАНИЯ */}
          {description && (
            <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 italic min-h-[3rem]">
              {description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
             <div className="flex justify-between text-[9px] font-black uppercase text-slate-600 tracking-widest">
                <span>Sold progress</span>
                <span>{Math.round(progress)}%</span>
             </div>
             <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.4)]" 
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-6 border-t border-slate-800/50 grid grid-cols-2 gap-4 mt-auto">
          <div className="space-y-1 cursor-pointer hover:bg-slate-800/50 p-1 rounded-lg transition-colors"
               onClick={() => copyToClipboard(footerLeft.value)}
               title="Click to copy full address">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">{footerLeft.label}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate" title={footerLeft.value}>
              {footerLeft.value}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">{footerRight.label}</p>
            <p className="text-[10px] font-mono text-slate-400 tracking-widest">
              {footerRight.value}
            </p>
          </div>
        </div>

        {/* Slot for Action Button */}
        {actionButton && <div className="pt-2">{actionButton}</div>}
      </div>
    </div>
  );
}