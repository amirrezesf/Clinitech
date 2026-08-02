
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { updateProfile } from '../store/authSlice';
import { 
  Palette, Bell, LayoutDashboard, Stethoscope, 
  Smartphone, Eye, PenTool, Check, Save, 
  Sparkles, Zap, Monitor, Type, Moon, Sun, 
  LayoutGrid, MessageSquare, AlertCircle, Timer
} from 'lucide-react';
import { UserSettings } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const Personalization = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  
  // Local state to store settings before saving
  const [settings, setSettings] = useState<UserSettings>({
      smsOnNewAppointment: true,
      smsOnCancellation: true,
      showFinancialsOnDashboard: true,
      compactMode: false,
      autoRecognizeHandwriting: false,
      defaultVisitHandwriting: true,
      showVisitStopwatch: true
  });

  useEffect(() => {
    if (user?.settings) {
        setSettings(user.settings);
    }
  }, [user]);

  const handleToggle = (key: keyof UserSettings) => {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
      const toastId = toast.loading('در حال ذخیره تنظیمات شخصی...');
      try {
          await dispatch(updateProfile({ settings }));
          toast.success('تنظیمات شما با موفقیت بروزرسانی شد.', { id: toastId });
      } catch (e) {
          toast.error('خطا در ذخیره‌سازی تنظیمات.', { id: toastId });
      }
  };

  const SettingRow = ({ id, title, description, icon: Icon, color }: any) => (
      <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm", color)}>
                      <Icon size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 dark:text-white text-sm">{title}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xs">{description}</p>
                  </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings[id as keyof UserSettings]}
                    onChange={() => handleToggle(id as keyof UserSettings)}
                  />
                  <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-6 peer-checked:after:border-white"></div>
              </label>
          </div>
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-primary-600 to-emerald-400 text-white rounded-2xl shadow-xl shadow-primary-500/20">
                <Palette size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">شخصی‌سازی سیستم</h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">ویژگی‌های هوشمند Health-Ease را مطابق سلیقه خود تنظیم کنید.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary-600/20 transition-all font-bold transform active:scale-95"
          >
            <Save size={20} />
            <span>ذخیره ترجیحات</span>
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dashboard Section */}
          <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                  <LayoutDashboard size={18} className="text-primary-500" />
                  <h3 className="font-black text-sm text-gray-700 dark:text-gray-300 uppercase tracking-widest">داشبورد و ظاهر</h3>
              </div>
              <div className="space-y-4">
                  <SettingRow 
                    id="showFinancialsOnDashboard" 
                    title="نمایش آمارهای مالی" 
                    description="نمایش یا عدم نمایش باکس‌های درآمدی در صفحه اصلی داشبورد."
                    icon={Zap}
                    color="bg-amber-50 text-amber-500 dark:bg-amber-900/20"
                  />
                  <SettingRow 
                    id="compactMode" 
                    title="حالت فشرده (Compact)" 
                    description="استفاده از لیست‌های کوچک‌تر برای نمایش اطلاعات بیشتر در یک صفحه."
                    icon={LayoutGrid}
                    color="bg-blue-50 text-blue-500 dark:bg-blue-900/20"
                  />
              </div>
          </div>

          {/* Notifications Section */}
          <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                  <Bell size={18} className="text-indigo-500" />
                  <h3 className="font-black text-sm text-gray-700 dark:text-gray-300 uppercase tracking-widest">اعلان‌های مدیریت</h3>
              </div>
              <div className="space-y-4">
                  <SettingRow 
                    id="smsOnNewAppointment" 
                    title="پیامک ثبت نوبت جدید" 
                    description="دریافت پیامک اطلاع‌رسانی زمانی که منشی نوبت جدیدی برای شما ثبت می‌کند."
                    icon={MessageSquare}
                    color="bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20"
                  />
                  <SettingRow 
                    id="smsOnCancellation" 
                    title="پیامک لغو نوبت" 
                    description="اطلاع‌رسانی فوری در صورت لغو نوبت توسط بیمار یا سیستم."
                    icon={AlertCircle}
                    color="bg-red-50 text-red-500 dark:bg-red-900/20"
                  />
              </div>
          </div>

          {/* Visit & AI Section */}
          <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 px-2">
                  <Stethoscope size={18} className="text-emerald-500" />
                  <h3 className="font-black text-sm text-gray-700 dark:text-gray-300 uppercase tracking-widest">ویزیت و هوش مصنوعی</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingRow 
                    id="autoRecognizeHandwriting" 
                    title="استخراج خودکار متن (OCR)" 
                    description="استفاده از Gemini برای تبدیل خودکار دست‌خط به متن تایپی بلافاصله پس از ثبت."
                    icon={Sparkles}
                    color="bg-purple-50 text-purple-500 dark:bg-purple-900/20"
                  />
                  <SettingRow 
                    id="defaultVisitHandwriting" 
                    title="اولویت با دست‌خط" 
                    description="در هنگام شروع ویزیت، بخش ورودی دست‌خط به صورت پیش‌فرض باز باشد."
                    icon={PenTool}
                    color="bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20"
                  />
                  <SettingRow 
                    id="showVisitStopwatch" 
                    title="کرنومتر جلسه ویزیت" 
                    description="نمایش زمان زنده سپری شده از شروع جلسه در صفحه ویزیت برای مدیریت زمان."
                    icon={Timer}
                    color="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                  />
              </div>
          </div>
      </div>

      <div className="bg-gray-900 dark:bg-gray-800 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                  <Monitor className="text-primary-400" />
                  <h3 className="text-lg font-black">شخصی‌سازی رابط کاربری</h3>
              </div>
              <p className="text-xs opacity-70 leading-relaxed max-w-lg">
                  این تنظیمات فقط برای حساب کاربری شما اعمال می‌شود و تأثیری بر پنل منشی یا سایر پزشکان کلینیک ندارد. 
                  شما می‌توانید در هر زمان این ویژگی‌ها را تغییر دهید.
              </p>
          </div>
          <Zap className="absolute -left-10 -bottom-10 text-white opacity-5 w-64 h-64 rotate-12" />
      </div>
    </div>
  );
};
