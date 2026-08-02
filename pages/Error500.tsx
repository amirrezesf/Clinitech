
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, RefreshCw, ServerCrash, Bug, LifeBuoy } from 'lucide-react';

export const Error500 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pulse Effect */}
      <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500 via-transparent to-transparent animate-pulse"></div>
      </div>

      <div className="glass-card w-full max-w-2xl p-12 rounded-[4rem] text-center space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700 shadow-2xl border border-white/10 relative z-10 bg-gray-900/40">
        <div className="relative">
            <div className="w-32 h-32 bg-red-600/20 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/30">
                <ServerCrash size={64} className="text-red-500 animate-bounce" />
            </div>
            {/* Fake ECG Line */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 opacity-40">
                <svg viewBox="0 0 200 30" className="w-full h-full stroke-red-500 fill-none stroke-2">
                    <path d="M0,15 L40,15 L50,5 L60,25 L70,15 L110,15 L120,0 L130,30 L140,15 L200,15" className="dash-animation" />
                </svg>
            </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white">خطای ۵۰۰</h1>
          <h2 className="text-2xl font-bold text-red-400 uppercase tracking-tight">Internal System Complication</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto font-medium">
            متاسفانه یک اختلال داخلی در "علائم حیاتی" سیستم رخ داده است. تیم فنی Health-Ease در حال بررسی و احیای مجدد سرویس است.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button 
                onClick={() => window.location.reload()}
                className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-red-600/40 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
                <RefreshCw size={24} />
                <span>تلاش مجدد (شوک سیستم)</span>
            </button>
            <button 
                onClick={() => navigate('/')}
                className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white rounded-[2rem] font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
            >
                <Bug size={18} />
                <span>گزارش خطا</span>
            </button>
        </div>

        <div className="flex items-center justify-center gap-10 opacity-30 text-white pt-6">
            <div className="flex flex-col items-center gap-1">
                <Activity size={24} />
                <span className="text-[8px] font-black uppercase">Vitals Low</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                <LifeBuoy size={24} />
                <span className="text-[8px] font-black uppercase">Auto Recovery</span>
            </div>
        </div>
      </div>
      
      <style>{`
        .dash-animation {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: dash 3s linear infinite;
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};
