import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Building, Phone, MapPin, Globe, FileText, 
  CloudDownload, RefreshCw, Download, 
  CheckCircle, Server, X, AlertTriangle, Key, 
  ShieldCheck, CalendarClock, CreditCard, Copy,
  ChevronLeft, Info, Zap
} from 'lucide-react';
import { formatJalaliDate } from '../utils/helpers';
import { useAppSelector } from '../hooks/redux';
import toast from 'react-hot-toast';
// Add missing clsx import
import clsx from 'clsx';

export const ClinicSettings = () => {
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    website: '',
    description: ''
  });

  // License State (Simulating data)
  const [licenseInfo] = useState({
    status: 'active',
    token: user?.token || 'H-EASE-8821-4490-1102-XP',
    expiryDate: '2025-06-15T00:00:00Z',
    daysLeft: 214,
    machineId: 'DESKTOP-CLINIC-PRIME-01'
  });

  // Restore & Update State
  const [lastRestore, setLastRestore] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'uptodate'>('available');
  
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  // Renewal Form State
  const [renewalForm, setRenewalForm] = useState({
    contactPhone: user?.phoneNumber || '',
    duration: '1year'
  });

  useEffect(() => {
    setFormData({
      name: localStorage.getItem('clinic_name') || 'مرکز درمانی سلامت',
      phone: localStorage.getItem('clinic_phone') || '۰۲۱-۸۸۸۸۸۸۸۸',
      address: localStorage.getItem('clinic_address') || 'تهران، خیابان ولیعصر، نرسیده به توانیر',
      website: localStorage.getItem('clinic_website') || 'www.health-ease.ir',
      description: localStorage.getItem('clinic_description') || 'ارائه خدمات تخصصی پزشکی در شیفت‌های صبح و عصر'
    });
    
    setLastRestore(localStorage.getItem('last_restore_date') || 'هرگز');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('clinic_name', formData.name);
    localStorage.setItem('clinic_phone', formData.phone);
    localStorage.setItem('clinic_address', formData.address);
    localStorage.setItem('clinic_website', formData.website);
    localStorage.setItem('clinic_description', formData.description);
    toast.success('تنظیمات مطب با موفقیت ذخیره شد.');
  };

  const handleCheckUpdate = () => {
      setIsCheckingUpdate(true);
      setTimeout(() => {
          setIsCheckingUpdate(false);
          setUpdateStatus('available');
          toast.success('نسخه ۱.۱.۰ آماده دریافت است.');
      }, 2000);
  };

  const confirmInstall = () => {
      setShowUpdateModal(false);
      const loadingToast = toast.loading('در حال دریافت و نصب بسته به‌روزرسانی...');
      
      setTimeout(() => {
          toast.dismiss(loadingToast);
          toast.success('نسخه جدید با موفقیت نصب شد.');
          window.location.reload();
      }, 4000);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(licenseInfo.token);
    toast.success('کد لایسنس در حافظه کپی شد.');
  };

  const handleRenewalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      toast.success(`درخواست تمدید شما ثبت شد. کارشناسان ما به زودی با شماره ${renewalForm.contactPhone} تماس می‌گیرند.`);
      setShowRenewalModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Building size={24} />
        </div>
        <div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">اطلاعات و تنظیمات مطب</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-bold">مدیریت اطلاعات عمومی، لایسنس و ارتباط با سرور مرکزی</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
              {/* Preview Card */}
              <div className="glass-card p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Info size={14} /> پیش‌نمایش در سربرگ
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center space-y-4 shadow-inner">
                      <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full mx-auto flex items-center justify-center text-primary-500 shadow-sm border border-gray-100 dark:border-gray-700">
                          <Building size={32} />
                      </div>
                      <div>
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white">{formData.name}</h4>
                          <p className="text-sm text-gray-500 mt-1 dir-ltr">{formData.phone}</p>
                      </div>
                      <div className="text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3 leading-relaxed">
                          {formData.address}
                      </div>
                  </div>
              </div>

              {/* License Card */}
              <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-white to-primary-50/20 dark:from-gray-800 dark:to-primary-900/10 border border-primary-100 dark:border-primary-900/30">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                          <ShieldCheck className="text-primary-600" size={20} />
                          وضعیت لایسنس
                      </h3>
                      <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800 uppercase">فعال</span>
                  </div>

                  <div className="space-y-4">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 text-primary-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                              <CalendarClock size={20} />
                          </div>
                          <div>
                              <p className="text-[10px] text-gray-400 font-bold">تاریخ انقضا</p>
                              <p className="text-xs font-black text-gray-800 dark:text-gray-200">{formatJalaliDate(licenseInfo.expiryDate)}</p>
                          </div>
                      </div>

                      <div className="p-4 bg-white/60 dark:bg-black/20 border border-primary-100 dark:border-primary-900/30 rounded-2xl shadow-inner">
                          <div className="flex justify-between text-[10px] mb-2 font-black">
                              <span className="text-gray-400">اعتبار باقی‌مانده:</span>
                              <span className="text-primary-700 dark:text-primary-400">{licenseInfo.daysLeft} روز</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: '65%' }}></div>
                          </div>
                      </div>

                      <button 
                        onClick={() => setShowRenewalModal(true)}
                        className="w-full py-3 bg-gray-900 dark:bg-primary-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-primary-700 transition-all shadow-xl shadow-black/10"
                      >
                          <CreditCard size={16} />
                          درخواست تمدید لایسنس
                      </button>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
              {/* General Settings Form */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                  <form onSubmit={handleSave} className="space-y-8">
                      <div className="space-y-6">
                          <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
                              <FileText size={22} className="text-primary-600" />
                              اطلاعات عمومی مطب
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-1">نام مرکز درمانی</label>
                                  <div className="relative">
                                      <Building className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                      <input 
                                          type="text" 
                                          required
                                          className="w-full pr-12 pl-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 transition-all dark:text-white font-bold"
                                          value={formData.name}
                                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-1">شماره تماس</label>
                                  <div className="relative">
                                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                      <input 
                                          type="tel" 
                                          required
                                          className="w-full pr-12 pl-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 transition-all dark:text-white font-bold dir-ltr"
                                          value={formData.phone}
                                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-1">آدرس دقیق</label>
                                  <div className="relative">
                                      <MapPin className="absolute right-4 top-4 text-gray-300" size={18} />
                                      <textarea 
                                          className="w-full pr-12 pl-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 transition-all dark:text-white min-h-[100px] resize-none text-sm font-medium leading-relaxed"
                                          value={formData.address}
                                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-1">وب‌سایت / پورتال</label>
                                  <div className="relative">
                                      <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                      <input 
                                          type="url" 
                                          className="w-full pr-12 pl-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 transition-all dark:text-white font-bold dir-ltr"
                                          placeholder="https://..."
                                          value={formData.website}
                                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mr-1">توضیحات تکمیلی</label>
                                  <div className="relative">
                                      <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                      <input 
                                          type="text" 
                                          className="w-full pr-12 pl-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 transition-all dark:text-white font-medium"
                                          value={formData.description}
                                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                                      />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-6 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                          <button 
                              type="submit"
                              className="bg-primary-600 hover:bg-primary-700 text-white px-10 py-4 rounded-2xl flex items-center gap-3 shadow-xl shadow-primary-600/20 transition-all font-black transform active:scale-[0.98]"
                          >
                              <Save size={20} />
                              <span>ذخیره تغییرات نهایی</span>
                          </button>
                      </div>
                  </form>
              </div>

              {/* Technical Section */}
              <div className="glass-card p-8 rounded-[2.5rem] space-y-10 border border-gray-100 dark:border-gray-800">
                  {/* License Token */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                          <Key size={22} className="text-amber-500" />
                          اطلاعات فعال‌سازی لایسنس
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">کد لایسنس سیستمی</label>
                              <div className="flex gap-2">
                                  <div className="flex-1 px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-mono text-sm text-gray-400 dir-ltr text-left flex items-center overflow-hidden">
                                      {licenseInfo.token.substring(0, 10)}****************
                                  </div>
                                  <button 
                                    onClick={copyToken}
                                    className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 hover:border-primary-200 rounded-2xl transition-all shadow-sm"
                                    title="کپی کد"
                                  >
                                      <Copy size={18} />
                                  </button>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">شناسه سخت‌افزاری (Machine ID)</label>
                              <div className="px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-mono text-xs text-gray-500 dir-ltr text-left flex items-center h-[52px]">
                                  {licenseInfo.machineId}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="h-px bg-gray-50 dark:bg-gray-800" />

                  {/* Maintenance */}
                  <div className="space-y-6">
                      <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                          <Server size={22} className="text-indigo-600" />
                          نگهداری و به‌روزرسانی سیستم
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-gray-100 dark:border-gray-700"><RefreshCw size={20} className={isCheckingUpdate ? 'animate-spin' : ''} /></div>
                                      <div>
                                          <p className="text-xs font-black text-gray-700 dark:text-gray-200">وضعیت نسخه فعلی</p>
                                          <p className="text-[10px] text-gray-400 font-bold">نسخه پایدار v1.0.2</p>
                                      </div>
                                  </div>
                                  {updateStatus === 'available' && (
                                      <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse border border-amber-200 uppercase">Update Available</span>
                                  )}
                              </div>
                              <button 
                                onClick={updateStatus === 'available' ? () => setShowUpdateModal(true) : handleCheckUpdate}
                                disabled={isCheckingUpdate}
                                className={clsx(
                                    "w-full py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm",
                                    updateStatus === 'available' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                                )}
                              >
                                  {isCheckingUpdate ? 'در حال بررسی...' : updateStatus === 'available' ? 'نصب به‌روزرسانی v1.1.0' : 'بررسی نسخه جدید'}
                              </button>
                          </div>

                          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary-500 shadow-sm border border-gray-100 dark:border-gray-700"><CloudDownload size={20} /></div>
                                  <div>
                                      <p className="text-xs font-black text-gray-700 dark:text-gray-200">بازیابی ابری اطلاعات</p>
                                      <p className="text-[10px] text-gray-400 font-bold italic">آخرین بازیابی: {lastRestore}</p>
                                  </div>
                              </div>
                              <button 
                                onClick={() => navigate('/settings/restore')}
                                className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center justify-center gap-2"
                              >
                                  مشاهده نقاط بازیابی
                                  <ChevronLeft size={16} />
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* UPDATE CONFIRMATION MODAL */}
      {showUpdateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 !mt-0">
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="bg-indigo-600 p-8 text-white text-center relative">
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-md">
                          <Zap size={40} className="fill-white" />
                      </div>
                      <h3 className="text-2xl font-black">به‌روزرسانی در دسترس است</h3>
                      <p className="opacity-80 text-sm mt-2 font-medium">ارتقا به نسخه ۱.۱.۰ با ویژگی‌های جدید</p>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-3">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">تغییرات این نسخه:</p>
                          <ul className="space-y-2">
                              {['بهبود سرعت بارگذاری گزارشات مالی', 'افزودن چارت‌های آماری پیشرفته', 'رفع باگ سیستم پیامک خودکار'].map((txt, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                      <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                                      {txt}
                                  </li>
                              ))}
                          </ul>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={confirmInstall} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">نصب و راه‌اندازی</button>
                          <button onClick={() => setShowUpdateModal(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-bold">بعداً</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* RENEWAL MODAL */}
      {showRenewalModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 !mt-0">
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="bg-primary-600 p-8 text-white relative">
                      <button onClick={() => setShowRenewalModal(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                              <CreditCard size={32} />
                          </div>
                          <div>
                              <h3 className="text-2xl font-black">درخواست تمدید لایسنس</h3>
                              <p className="opacity-80 text-sm mt-1 font-bold">فرم تمدید را جهت تماس کارشناسان تکمیل کنید</p>
                          </div>
                      </div>
                  </div>
                  <form onSubmit={handleRenewalSubmit} className="p-8 space-y-6">
                      <div className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">شماره تماس جهت پیگیری</label>
                              <div className="relative">
                                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                  <input required type="tel" className="w-full pr-12 pl-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 dark:text-white font-bold dir-ltr text-right" value={renewalForm.contactPhone} onChange={e => setRenewalForm({...renewalForm, contactPhone: e.target.value})} />
                              </div>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">مدت زمان تمدید مورد نظر</label>
                              <select className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white" value={renewalForm.duration} onChange={e => setRenewalForm({...renewalForm, duration: e.target.value})}>
                                  <option value="1year">یک ساله (۱۲ ماهه)</option>
                                  <option value="2year">دو ساله (۲۴ ماهه) - تخفیف ویژه</option>
                                  <option value="lifetime">مادام‌العمر (اشتراک دائم)</option>
                              </select>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 flex items-start gap-3">
                              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">پس از ثبت درخواست، همکاران ما در واحد فروش ظرف حداکثر ۲ ساعت کاری با شما تماس گرفته و فاکتور نهایی را ارسال خواهند کرد.</p>
                          </div>
                      </div>
                      <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                          <Download className="rotate-180" size={20} />
                          ثبت نهایی و ارسال درخواست
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
