
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowRight, Search, Activity } from 'lucide-react';

export const Error404 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <div className="glass-card w-full max-w-lg p-10 rounded-[3rem] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl relative z-10 border border-white/20">
        <div className="relative mx-auto w-28 h-28">
            <div className="absolute inset-0 bg-primary-500/20 rounded-[2rem] rotate-6 animate-pulse"></div>
            <div className="relative w-28 h-28 bg-white dark:bg-gray-800 text-primary-600 rounded-[2rem] flex items-center justify-center shadow-xl border border-primary-100 dark:border-primary-900/50">
                <FileQuestion size={56} strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800">
                <span className="font-black text-xs">404</span>
            </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-gray-800 dark:text-white">پرونده یافت نشد!</h1>
          <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
            صفحه‌ای که به دنبال آن هستید در بایگانی سیستم موجود نیست.
          </h2>
          <p className="text-gray-400 dark:text-gray-500 text-xs max-w-xs mx-auto font-medium">
            ممکن است آدرس را اشتباه وارد کرده باشید یا این بخش توسط مدیریت کلینیک حذف شده باشد.
          </p>
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={() => navigate('/')}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
                <Home size={22} />
                <span>بازگشت به پیشخوان</span>
            </button>
            <button 
                onClick={() => navigate(-1)}
                className="py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-bold transition-colors flex items-center justify-center gap-2"
            >
                <ArrowRight size={18} className="rotate-180" />
                <span>بازگشت به صفحه قبلی</span>
            </button>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 opacity-30">
            <Activity size={16} className="text-primary-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Health-Ease Navigation System</span>
        </div>
      </div>
    </div>
  );
};
