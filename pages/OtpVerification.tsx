
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Smartphone, CheckCircle, ArrowRight, RefreshCw, AlertOctagon } from 'lucide-react';
import { useAppDispatch } from '../hooks/redux';
import { installSystem } from '../store/authSlice';

export const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  // Data passed from Install page
  const { adminUser, clinicName, otp } = location.state || {};

  const [inputOtp, setInputOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!adminUser || !otp) {
        navigate('/install', { replace: true });
    }
    
    // Focus first input
    if (inputsRef.current[0]) {
        inputsRef.current[0].focus();
    }

    // Timer
    const interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [adminUser, otp, navigate]);

  const handleChange = (index: number, value: string) => {
      if (value.length > 1) value = value.slice(-1); // Only allow 1 char
      
      const newOtp = [...inputOtp];
      newOtp[index] = value;
      setInputOtp(newOtp);

      // Auto focus next
      if (value && index < 3) {
          inputsRef.current[index + 1]?.focus();
      }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !inputOtp[index] && index > 0) {
          inputsRef.current[index - 1]?.focus();
      }
  };

  const handleResend = () => {
      if (timer > 0) return;
      setTimer(60);
      alert(`کد جدید ارسال شد: ${otp}`); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      setIsVerifying(true);
      setError('');

      try {
          // 1. Simulate API verification delay
          await new Promise(resolve => setTimeout(resolve, 1500));

          // 2. MOCK LOGIC: Simulate finding a license conflict
          // For the sake of the demo, we assume the license is ALWAYS in use on another machine
          const hasConflict = true; 

          if (hasConflict) {
              navigate('/license-conflict', { 
                  state: { adminUser, clinicName } 
              });
              return;
          }

          // 3. Normal Flow (if no conflict)
          localStorage.setItem('clinic_name', clinicName);
          await dispatch(installSystem({ adminUser, token: adminUser.token }));
          
          alert(`نصب با موفقیت انجام شد.\n\nاعتبار لایسنس: ۱ سال\nرمز عبور موقت: ${adminUser.password}`);
          navigate('/login', { replace: true });
          
      } catch (err: any) {
          console.error(err);
          setError(err.message || 'خطا در ارتباط با سرور مرکزی. لطفا توکن را بررسی کنید.');
          setIsVerifying(false);
      }
  };

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="glass-card w-full max-w-md p-8 rounded-3xl shadow-2xl z-10 bg-white/95">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">تایید و فعال‌سازی</h2>
                <p className="text-gray-500 mt-2 text-sm">
                    در حال فعال‌سازی لایسنس برای 
                    <strong className="mx-1">{clinicName}</strong>
                </p>
                <p className="text-gray-400 text-xs mt-1">کد تایید: {otp}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex justify-center gap-3" dir="ltr">
                    {inputOtp.map((digit, idx) => (
                        <input
                            key={idx}
                            ref={(el) => { inputsRef.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:border-primary-500 outline-none transition-all shadow-sm"
                            value={digit}
                            onChange={(e) => handleChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                        />
                    ))}
                </div>

                {error && (
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2 text-red-600">
                        <AlertOctagon size={18} className="shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <div className="flex items-center justify-between text-sm">
                    <button 
                        type="button" 
                        onClick={handleResend}
                        disabled={timer > 0}
                        className={`flex items-center gap-1 ${timer > 0 ? 'text-gray-400' : 'text-primary-600 font-bold hover:text-primary-700'}`}
                    >
                        <RefreshCw size={14} className={timer > 0 ? 'animate-spin-slow' : ''} />
                        {timer > 0 ? `ارسال مجدد تا ${timer} ثانیه` : 'ارسال مجدد کد'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => navigate('/install')}
                        className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <span>ویرایش اطلاعات</span>
                        <ArrowRight size={14} className="rotate-180" />
                    </button>
                </div>

                <button 
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isVerifying ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>در حال بررسی لایسنس...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle size={20} />
                            <span>تایید و ادامه</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    </div>
  );
};
