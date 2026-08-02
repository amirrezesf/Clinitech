
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Shield, Building, Smartphone, 
  ArrowRight, MapPin, Lock, Eye, EyeOff, CheckCircle, 
  AlertTriangle, Monitor, Clock, 
  Key, ShieldAlert, XCircle, RefreshCw, Send
} from 'lucide-react';
import { User as UserType } from '../types';
import { useAppDispatch } from '../hooks/redux';
import { installSystem } from '../store/authSlice';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type InstallStep = 'VERIFY_PHONE' | 'LICENSE_CHECK' | 'ADMIN_DETAILS' | 'CLINIC_DETAILS';

export const Install = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [step, setStep] = useState<InstallStep>('VERIFY_PHONE');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Phone & OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [inputOtp, setInputOtp] = useState(['', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Admin Data
  const [adminData, setAdminData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  // Clinic Data
  const [clinicData, setClinicData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  // Mock Conflict Data
  const conflictingMachine = {
      name: "PC-REZAIE-OFFICE",
      ip: "185.120.44.12",
      lastSeen: "۲ ساعت پیش"
  };

  // --- Actions ---

  const handleRequestOtp = () => {
    if (!phoneNumber || phoneNumber.length < 11) {
        toast.error('لطفا شماره همراه معتبر وارد کنید.');
        return;
    }
    setLoading(true);
    setTimeout(() => {
        const code = '1234'; // Mock code
        setGeneratedOtp(code);
        setOtpSent(true);
        setLoading(false);
        toast.success(`کد تایید به شماره ${phoneNumber} ارسال شد.`);
        console.log(`Debug OTP: ${code}`);
    }, 800);
  };

  const handleOtpChange = (index: number, value: string) => {
      if (value.length > 1) value = value.slice(-1);
      const newOtp = [...inputOtp];
      newOtp[index] = value;
      setInputOtp(newOtp);
      if (value && index < 3) otpInputsRef.current[index + 1]?.focus();
  };

  const handleVerifyOtp = () => {
      if (inputOtp.join('') !== generatedOtp) {
          toast.error('کد وارد شده صحیح نیست.');
          return;
      }
      setLoading(true);
      // Simulate checking for license conflict
      setTimeout(() => {
          setLoading(false);
          setStep('LICENSE_CHECK');
      }, 1000);
  };

  const handleDeactivateConflict = () => {
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          setStep('ADMIN_DETAILS');
          toast.success('لایسنس تایید شد.');
      }, 1200);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminData.password !== adminData.confirmPassword) {
          toast.error('رمز عبور و تکرار آن مطابقت ندارند.');
          return;
      }
      setStep('CLINIC_DETAILS');
  };

  const handleClinicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const adminUser: UserType = {
        fullName: adminData.fullName,
        username: adminData.username,
        password: adminData.password,
        phoneNumber: phoneNumber,
        role: 'secretary',
        token: 'H-EASE-LOCAL-INIT'
    };

    try {
        localStorage.setItem('clinic_name', clinicData.name);
        localStorage.setItem('clinic_phone', clinicData.phone);
        localStorage.setItem('clinic_address', clinicData.address);
        
        await dispatch(installSystem({ adminUser, token: adminUser.token }));
        
        setLoading(false);
        toast.success('راه‌اندازی با موفقیت به پایان رسید.');
        navigate('/login');
    } catch (err) {
        setLoading(false);
        toast.error('خطا در ذخیره‌سازی اطلاعات.');
    }
  };

  // --- Render Helpers ---

  const StepIndicator = () => (
      <div className="flex items-center justify-center gap-4 mb-10 no-print">
          {[
              { id: 'VERIFY_PHONE', label: 'احراز هویت', icon: Smartphone },
              { id: 'LICENSE_CHECK', label: 'تایید لایسنس', icon: Key },
              { id: 'ADMIN_DETAILS', label: 'مدیر سیستم', icon: Shield },
              { id: 'CLINIC_DETAILS', label: 'اطلاعات مطب', icon: Building }
          ].map((s, idx) => {
              const activeIdx = ['VERIFY_PHONE', 'LICENSE_CHECK', 'ADMIN_DETAILS', 'CLINIC_DETAILS'].indexOf(step);
              const currentIdx = idx;
              const isActive = activeIdx === currentIdx;
              const isPast = activeIdx > currentIdx;
              
              return (
                  <React.Fragment key={s.id}>
                      <div className="flex flex-col items-center gap-2">
                          <div className={clsx(
                              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                              isActive ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20 scale-110" : 
                              isPast ? "bg-emerald-100 border-emerald-100 text-emerald-600" : "bg-gray-100 dark:bg-gray-700 border-transparent text-gray-400"
                          )}>
                              <s.icon size={18} />
                          </div>
                          <span className={clsx("text-[9px] font-black uppercase tracking-tighter", isActive ? "text-primary-700 dark:text-primary-400" : "text-gray-400")}>{s.label}</span>
                      </div>
                      {idx < 3 && (
                          <div className={clsx("w-8 h-0.5 rounded-full mt-[-18px]", isPast ? "bg-emerald-400" : "bg-gray-100 dark:bg-gray-700")}></div>
                      )}
                  </React.Fragment>
              )
          })}
      </div>
  );

  const inputClasses = "w-full pr-10 pl-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 transition-all text-gray-800 dark:text-white placeholder-gray-400";

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="glass-card w-full max-w-2xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-500">
        <StepIndicator />

        {/* PAGE 1: PHONE & OTP */}
        {step === 'VERIFY_PHONE' && (
            <div className="animate-in slide-in-from-left-4 duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white">تایید شماره همراه</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">شماره همراه مدیر سیستم را جهت دریافت کد فعال‌سازی وارد کنید.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 mr-2">شماره همراه</label>
                        <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                disabled={otpSent}
                                type="tel" 
                                className={clsx(inputClasses, "dir-ltr text-right")} 
                                value={phoneNumber} 
                                onChange={e => setPhoneNumber(e.target.value)} 
                                placeholder="0912XXXXXXX" 
                            />
                            {!otpSent && (
                                <button 
                                    onClick={handleRequestOtp}
                                    disabled={loading}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-700 transition-all flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <><Send size={14} /><span>ارسال کد</span></>}
                                </button>
                            )}
                        </div>
                    </div>

                    {otpSent && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-gray-500 text-center block">کد ۴ رقمی را وارد کنید</label>
                                <div className="flex justify-center gap-4" dir="ltr">
                                    {inputOtp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => { otpInputsRef.current[idx] = el; }}
                                            type="text"
                                            maxLength={1}
                                            className="w-14 h-14 text-center text-2xl font-black bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 focus:bg-white outline-none transition-all text-gray-800 dark:text-white shadow-inner"
                                            value={digit}
                                            onChange={e => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={e => e.key === 'Backspace' && !inputOtp[idx] && idx > 0 && otpInputsRef.current[idx-1]?.focus()}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={handleVerifyOtp} 
                                disabled={loading || inputOtp.some(d => !d)} 
                                className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" /> : <span>بررسی و ادامه</span>}
                            </button>
                            <button onClick={() => setOtpSent(false)} className="w-full text-center text-xs text-gray-400 hover:text-primary-600 transition-colors font-bold">تغییر شماره همراه</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* PAGE 2: LICENSE CHECK */}
        {step === 'LICENSE_CHECK' && (
            <div className="animate-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-amber-200">
                        <ShieldAlert size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">بررسی وضعیت لایسنس</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">سیستم در حال بررسی اعتبار لایسنس شماست.</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 mb-6">
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <Monitor size={20} className="text-primary-600" />
                        <span className="font-bold">تداخل شناسایی شد:</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">سیستم فعال فعلی:</span>
                            <span className="font-mono font-bold text-gray-800 dark:text-white dir-ltr">{conflictingMachine.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">آخرین فعالیت:</span>
                            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                                <Clock size={14} className="text-gray-400" />
                                {conflictingMachine.lastSeen}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-2xl p-4 mb-8 flex items-start gap-3">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-bold">با انتقال لایسنس، دسترسی سیستم قبلی قطع شده و به این رایانه منتقل می‌شود.</p>
                </div>

                <button onClick={handleDeactivateConflict} disabled={loading} className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="animate-spin" /> : <><CheckCircle size={20} /><span>تایید لایسنس و انتقال به این سیستم</span></>}
                </button>
            </div>
        )}

        {/* PAGE 3: ADMIN DETAILS */}
        {step === 'ADMIN_DETAILS' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-gray-800 dark:text-white">مشخصات مدیر سیستم</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">اطلاعات ورود به پنل مدیریت را تعیین کنید.</p>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">نام کامل</label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input required type="text" className={inputClasses} value={adminData.fullName} onChange={e => setAdminData({...adminData, fullName: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">نام کاربری</label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input required type="text" className={clsx(inputClasses, "dir-ltr")} value={adminData.username} onChange={e => setAdminData({...adminData, username: e.target.value})} placeholder="admin" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">رمز عبور</label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input required type={showPassword ? 'text' : 'password'} className={clsx(inputClasses, "pl-12 dir-ltr")} value={adminData.password} onChange={e => setAdminData({...adminData, password: e.target.value})} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">تکرار رمز عبور</label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input required type={showPassword ? 'text' : 'password'} className={clsx(inputClasses, "dir-ltr")} value={adminData.confirmPassword} onChange={e => setAdminData({...adminData, confirmPassword: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                        <span>مرحله بعد: اطلاعات مطب</span>
                        <ArrowRight size={20} className="rotate-180" />
                    </button>
                </form>
            </div>
        )}

        {/* PAGE 4: CLINIC DETAILS */}
        {step === 'CLINIC_DETAILS' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-gray-800 dark:text-white">اطلاعات مطب / کلینیک</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">مشخصات کلینیک جهت درج در رسیدها و پرونده‌ها</p>
                </div>

                <form onSubmit={handleClinicSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">نام مرکز درمانی</label>
                            <div className="relative">
                                <Building className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input required type="text" className={inputClasses} value={clinicData.name} onChange={e => setClinicData({...clinicData, name: e.target.value})} placeholder="مثلا: مطب تخصصی سلامت" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">شماره تماس مرکز</label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input required type="tel" className={clsx(inputClasses, "dir-ltr")} value={clinicData.phone} onChange={e => setClinicData({...clinicData, phone: e.target.value})} placeholder="021..." />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-2">آدرس</label>
                            <div className="relative">
                                <MapPin className="absolute right-3 top-3 text-gray-400" size={18} />
                                <textarea required className={clsx(inputClasses, "min-h-[100px] resize-none")} value={clinicData.address} onChange={e => setClinicData({...clinicData, address: e.target.value})} placeholder="آدرس دقیق کلینیک..." />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                        {loading ? <RefreshCw className="animate-spin" /> : <><span>پایان نصب و راه‌اندازی</span><CheckCircle size={20} /></>}
                    </button>
                    <button type="button" onClick={() => setStep('ADMIN_DETAILS')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors font-bold">بازگشت به مرحله قبل</button>
                </form>
            </div>
        )}
      </div>
      
      <div className="fixed bottom-6 text-gray-500 dark:text-gray-600 text-[10px] font-bold uppercase tracking-widest z-10 opacity-50">
          Health-Ease Installer v1.0.2
      </div>
    </div>
  );
};
