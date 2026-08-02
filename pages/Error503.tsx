
import React from 'react';
import { Hammer, Clock, Stethoscope, Settings2, Info } from 'lucide-react';

export const Error503 = () => {
  return (
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gentle Floating Shapes */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      <div className="glass-card w-full max-w-2xl p-12 rounded-[4rem] text-center space-y-10 animate-in fade-in zoom-in-95 duration-700 shadow-2xl border border-white/20 relative z-10 bg-white/10 backdrop-blur-3xl">
        <div className="flex justify-center">
            <div className="w-28 h-28 bg-white/20 rounded-[2.5rem] flex items-center justify-center text-white border border-white/30 rotate-12 animate-in slide-in-from-top-4 duration-1000">
                <Hammer size={56} className="text-emerald-300" />
            </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white">خطای ۵۰۳</h1>
          <h2 className="text-2xl font-bold text-emerald-300">در حال چک‌آپ دوره‌ای سیستم</h2>
          <p className="text-emerald-50/70 text-sm leading-relaxed max-w-sm mx-auto font-medium">
            سامانه Health-Ease برای ارتقای کیفیت و افزودن ویژگی‌های جدید، موقتاً در حال نگهداری (Maintenance) می‌باشد. به زودی با انرژی بیشتر باز می‌گردیم.
          </p>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center justify-between text-emerald-100 text-xs font-black uppercase tracking-widest">
                <span className="flex items-center gap-2"><Clock size={14}/> Estimated Time</span>
                <span className="text-emerald-400">~ 15 Minutes</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-emerald-400 to-primary-500 animate-progress"></div>
            </div>
        </div>

        <div className="flex justify-center gap-8 text-emerald-200/40">
            <Stethoscope size={32} />
            <Settings2 size={32} className="animate-spin-slow" />
            <Info size={32} />
        </div>

        <p className="text-[10px] text-emerald-100/30 font-black uppercase tracking-[0.3em]">
            Precision Engineering in Progress
        </p>
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 15s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  );
};
