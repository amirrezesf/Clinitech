
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, Key, AlertTriangle, Headset } from 'lucide-react';

export const Error403 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg p-10 rounded-[3rem] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl border-t-4 border-red-600">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg rotate-3 group hover:rotate-0 transition-transform">
            <ShieldAlert size={56} strokeWidth={2} />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-gray-800 dark:text-white">خطای ۴۰۳</h1>
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">دسترسی محدود شده است</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            شما اجازه مشاهده این بخش را ندارید. این مورد ممکن است به دلیل سطح دسترسی تعریف شده توسط پزشک یا انقضای لایسنس نرم‌افزار باشد.
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-start gap-3 text-right">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <p className="text-[10px] text-red-800 dark:text-red-300 font-bold leading-relaxed">
                اگر فکر می‌کنید این یک خطا است، با مدیر سیستم تماس بگیرید یا وضعیت لایسنس خود را در بخش تنظیمات مطب بررسی کنید.
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => navigate('/')}
                className="py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
            >
                <Home size={18} />
                <span>داشبورد اصلی</span>
            </button>
            <button 
                onClick={() => window.location.href = 'tel:02188888888'}
                className="py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-black text-sm shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
            >
                <Headset size={18} />
                <span>تماس با پشتیبانی</span>
            </button>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
            <Key size={12} />
            System Compliance Check
        </div>
      </div>
    </div>
  );
};
