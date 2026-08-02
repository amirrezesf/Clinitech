
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Monitor, XCircle, CheckCircle, ArrowRight, ShieldAlert, Wifi, Clock } from 'lucide-react';
import { useAppDispatch } from '../hooks/redux';
import { installSystem } from '../store/authSlice';

export const LicenseConflict = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Data passed from OTP page
  const { adminUser, clinicName } = location.state || {};

  // Mock data for the conflicting machine
  const conflictingMachine = {
      name: "PC-REZAIE-OFFICE",
      ip: "185.120.44.12",
      lastSeen: "۲ ساعت پیش",
      os: "Windows 11"
  };

  const handleDeactivate = async () => {
      setIsDeactivating(true);
      
      try {
          // Simulate server-side deactivation delay
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Proceed with installation on THIS machine
          await dispatch(installSystem({ adminUser, token: adminUser.token }));
          
          alert('سیستم قبلی غیرفعال شد. لایسنس با موفقیت به این رایانه منتقل گردید.');
          navigate('/login', { replace: true });
      } catch (err) {
          alert('خطا در غیرفعال‌سازی سیستم قبلی. لطفا با پشتیبانی تماس بگیرید.');
          setIsDeactivating(false);
      }
  };

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="glass-card w-full max-w-lg p-8 rounded-3xl shadow-2xl z-10 bg-white/95">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-amber-200">
                    <ShieldAlert size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">تداخل در لایسنس</h2>
                <p className="text-gray-500 mt-3 text-sm leading-relaxed">
                    کد لایسنس وارد شده در حال حاضر روی یک سیستم دیگر فعال است. هر لایسنس تنها بر روی یک رایانه قابل استفاده می‌باشد.
                </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 text-gray-700 mb-4 pb-3 border-b border-gray-200">
                    <Monitor size={20} className="text-primary-600" />
                    <span className="font-bold">مشخصات سیستم فعال:</span>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">نام دستگاه:</span>
                        <span className="font-mono font-bold text-gray-800 dir-ltr">{conflictingMachine.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">آدرس IP:</span>
                        <span className="flex items-center gap-1.5 font-mono text-gray-700 dir-ltr">
                           <Wifi size={14} className="text-gray-400" />
                           {conflictingMachine.ip}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">آخرین فعالیت:</span>
                        <span className="flex items-center gap-1.5 text-gray-700">
                           <Clock size={14} className="text-gray-400" />
                           {conflictingMachine.lastSeen}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-8 flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-red-700 leading-relaxed font-medium">
                    در صورت غیرفعال‌سازی، دسترسی نرم‌افزار در سیستم قبلی بلافاصله قطع خواهد شد و تمام اطلاعات محلی آن سیستم (در صورت عدم سینک) غیرقابل دسترس می‌گردد.
                </p>
            </div>

            <div className="space-y-3">
                <button 
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                    className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                >
                    {isDeactivating ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>در حال غیرفعال‌سازی سیستم قبلی...</span>
                        </>
                    ) : (
                        <>
                            <XCircle size={20} />
                            <span>غیرفعال‌سازی و نصب در این سیستم</span>
                        </>
                    )}
                </button>

                <button 
                    onClick={() => navigate('/install')}
                    disabled={isDeactivating}
                    className="w-full py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                    <ArrowRight size={18} />
                    <span>بازگشت و تغییر کد لایسنس</span>
                </button>
            </div>
        </div>
    </div>
  );
};
