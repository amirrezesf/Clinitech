
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';

export const Error401 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg p-10 rounded-[3rem] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl border-t-4 border-amber-500">
        <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center shadow-inner">
                <Lock size={48} strokeWidth={2.5} />
            </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-gray-800 dark:text-white">خطای ۴۰۱</h1>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">اعتبار نشست شما به پایان رسیده است</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            جهت حفظ امنیت داده‌های پزشکی بیماران، نشست‌های غیرفعال پس از مدتی بسته می‌شوند. لطفا مجدداً وارد حساب خود شوید.
          </p>
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
                <LogIn size={24} />
                <span>ورود مجدد به سامانه</span>
            </button>
            <button 
                onClick={() => navigate(-1)}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold transition-colors flex items-center justify-center gap-2"
            >
                <ArrowRight size={16} className="rotate-180" />
                <span>بازگشت به صفحه قبلی</span>
            </button>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-center gap-6 opacity-40">
            <ShieldCheck size={20} />
            <Smartphone size={20} />
        </div>
      </div>
    </div>
  );
};
