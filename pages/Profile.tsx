
import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Camera, Mail, Shield, Phone, Smartphone } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { updateProfile } from '../store/authSlice';

export const Profile = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    role: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || 'doctor'
      }));
    }
  }, [user]);

  // Verification State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verificationType, setVerificationType] = useState<'PHONE' | 'PASSWORD' | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  if (!user) return null;

  const hasPasswordChange = formData.newPassword && formData.confirmPassword;
  const hasPhoneChange = formData.phoneNumber !== user.phoneNumber;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (hasPasswordChange && formData.newPassword !== formData.confirmPassword) {
      alert('رمز عبور جدید و تکرار آن مطابقت ندارند.');
      return;
    }

    if (hasPasswordChange) {
      startVerification('PASSWORD');
      return;
    }

    if (hasPhoneChange) {
      startVerification('PHONE');
      return;
    }

    // No sensitive changes, just save
    saveChanges();
  };

  const startVerification = (type: 'PHONE' | 'PASSWORD') => {
    // Generate a mock code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(code);
    setVerificationType(type);
    setOtpCode('');
    setIsVerifyModalOpen(true);

    // Simulate SMS sending
    const targetNumber = type === 'PHONE' ? formData.phoneNumber : user.phoneNumber;
    
    setTimeout(() => {
      alert(`کد تایید شما: ${code}\n(ارسال شده به ${targetNumber})`);
    }, 500);
  };

  const handleVerify = () => {
    if (otpCode === generatedCode) {
      saveChanges();
      setIsVerifyModalOpen(false);
      setOtpCode('');
      setVerificationType(null);
    } else {
      alert('کد وارد شده صحیح نمی‌باشد.');
    }
  };

  const saveChanges = async () => {
    const payload: any = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
    };

    // Handle password change mock
    if (hasPasswordChange) {
        payload.password = formData.newPassword;
    }

    // Commit changes via Redux Thunk
    await dispatch(updateProfile(payload));

    // Reset sensitive fields
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

    let message = 'اطلاعات پروفایل با موفقیت بروزرسانی شد.';
    if (verificationType === 'PASSWORD') message += ' (رمز عبور تغییر یافت)';
    if (verificationType === 'PHONE') message += ' (شماره تماس تغییر یافت)';
    
    alert(message);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative pb-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <User className="text-primary-600" size={26} />
        پروفایل کاربری
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar / Avatar */}
        <div className="md:col-span-1 space-y-6">
           <div className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col items-center text-center">
              <div className="relative mb-4 group cursor-pointer">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-primary-500 to-primary-300 p-1">
                      <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                          <div className="text-3xl sm:text-4xl font-bold text-primary-600">{user.fullName.charAt(0)}</div>
                      </div>
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={24} />
                  </div>
              </div>
              <h3 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-white">{user.fullName}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm dir-ltr">@{user.username}</p>
              
              <div className="mt-4 w-full pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400">نقش کاربری:</span>
                      <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded-md ${
                          user.role === 'doctor' 
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                            : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      }`}>
                          <Shield size={12} /> 
                          {user.role === 'doctor' ? 'پزشک' : 'منشی'}
                      </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400">شماره موبایل:</span>
                      <span className="text-gray-800 dark:text-gray-200 font-medium dir-ltr">{user.phoneNumber}</span>
                  </div>
              </div>
           </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2">
            <div className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 text-sm sm:text-base">اطلاعات عمومی</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">نام کامل</label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 text-xs sm:text-sm"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">نقش سیستم</label>
                                <div className="relative">
                                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        readOnly
                                        className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl cursor-not-allowed text-xs sm:text-sm"
                                        value={user.role === 'doctor' ? 'پزشک' : 'منشی'}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">تغییر نقش امکان‌پذیر نیست.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">نام کاربری</label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr text-xs sm:text-sm"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">ایمیل</label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="email" 
                                        className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr text-xs sm:text-sm"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">شماره موبایل</label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="tel" 
                                        className={`w-full pr-10 pl-4 py-2.5 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr text-xs sm:text-sm ${
                                            hasPhoneChange ? 'border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500'
                                        }`}
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    />
                                    {hasPhoneChange && (
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-amber-600 font-medium">
                                            نیاز به تایید
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h4 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2 text-sm sm:text-base">
                            <Lock size={18} className="text-gray-500"/>
                            تغییر رمز عبور
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">رمز عبور فعلی</label>
                                <input 
                                    type="password" 
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr text-xs sm:text-sm"
                                    placeholder="••••••••"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">رمز عبور جدید</label>
                                    <input 
                                        type="password" 
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr text-xs sm:text-sm"
                                        placeholder="••••••••"
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">تکرار رمز عبور جدید</label>
                                    <input 
                                        type="password" 
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr text-xs sm:text-sm"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit"
                            className="w-full sm:w-auto justify-center bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all font-bold text-sm"
                        >
                            <Save size={18} />
                            <span>ذخیره تغییرات</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {isVerifyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl w-full max-w-sm shadow-2xl p-5 sm:p-6 space-y-5 sm:space-y-6">
                  <div className="text-center space-y-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto text-primary-600 mb-3 sm:mb-4">
                          <Smartphone size={28} />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">تایید شماره همراه</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {verificationType === 'PHONE' 
                             ? `کد تایید به شماره جدید ${formData.phoneNumber} ارسال شد.`
                             : `جهت تغییر رمز عبور، کد تایید به ${user.phoneNumber} ارسال شد.`
                          }
                      </p>
                  </div>

                  <div className="space-y-3">
                      <input 
                          type="text" 
                          maxLength={4}
                          className="w-full text-center text-2xl font-bold tracking-[0.5em] sm:tracking-[1em] p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-2xl outline-none text-gray-800 dark:text-white"
                          placeholder="____"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                      />
                      <p className="text-xs text-center text-gray-400">کد تایید: {generatedCode}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => setIsVerifyModalOpen(false)}
                          className="py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-xs sm:text-sm"
                      >
                          انصراف
                      </button>
                      <button 
                          onClick={handleVerify}
                          disabled={otpCode.length !== 4}
                          className="py-2.5 sm:py-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                      >
                          تایید و ادامه
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
