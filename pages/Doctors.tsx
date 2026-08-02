
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Doctor, DailySchedule, ServiceRestriction } from '../types';
import { 
  Clock, Calendar, Phone, Stethoscope, X, Check, Edit, User, 
  Siren, Coffee, Plus, Trash2, Target, AlertTriangle, 
  DollarSign, Activity, ShieldCheck, Smartphone, RefreshCw,
  Lock, CheckCircle2, UserPlus, PartyPopper, ArrowLeft, ChevronDown, Gavel
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const DAYS_MAP = [
  { id: 'Saturday', label: 'شنبه' },
  { id: 'Sunday', label: 'یکشنبه' },
  { id: 'Monday', label: 'دوشنبه' },
  { id: 'Tuesday', label: 'سه‌شنبه' },
  { id: 'Wednesday', label: 'چهارشنبه' },
  { id: 'Thursday', label: 'پنج‌شنبه' },
  { id: 'Friday', label: 'جمعه' },
];

const MEDICAL_SPECIALTIES = [
  'پزشک عمومی',
  'متخصص قلب و عروق',
  'دندانپزشک',
  'متخصص پوست، مو و زیبایی',
  'متخصص زنان و زایمان',
  'متخصص اطفال',
  'متخصص داخلی',
  'چشم پزشک',
  'متخصص مغز و اعصاب',
  'روانپزشک',
  'جراح عمومی',
  'متخصص ارتوپدی',
  'متخصص گوش، حلق و بینی',
  'متخصص رادیولوژی',
  'متخصص تغذیه',
  'فیزیوتراپیست'
];

export const Doctors = () => {
  const navigate = useNavigate();
  const { doctors, updateDoctor, addDoctor, allReasons } = useData();
  const { user } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  
  // Create Flow State
  const [createStep, setCreateStep] = useState<'form' | 'otp' | 'success'>('form');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Filter doctors based on user permissions
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Form State (shared for both Edit and Create)
  const [formData, setFormData] = useState<Partial<Doctor>>({
    name: '',
    phone_number: '',
    specialty: '',
    medical_council_number: '',
    booking_window_days: 30,
    maxBookingPercent: 100,
    schedule: {
      "Saturday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
      "Sunday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
      "Monday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
      "Tuesday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
      "Wednesday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
      "Thursday": { start: '09:00', end: '13:00', breaks: [], is_working: true },
      "Friday": { start: '09:00', end: '17:00', breaks: [], is_working: false }
    },
    penaltyConfig: { percent: 15, maxAmount: 100000 },
    permissions: { allowServicePriceEdit: true, allowAppointmentDelete: true, allowManualDiscount: true }
  });

  const handleEditClick = (doc: Doctor) => {
    setEditingDoctorId(doc.id);
    setFormData({
        name: doc.name,
        phone_number: doc.phone_number,
        specialty: doc.specialty,
        medical_council_number: doc.medical_council_number || '',
        booking_window_days: doc.booking_window_days || 30,
        maxBookingPercent: doc.maxBookingPercent || 100,
        schedule: JSON.parse(JSON.stringify(doc.schedule)), // Deep copy
        penaltyConfig: doc.penaltyConfig || { percent: 15, maxAmount: 100000 },
        permissions: doc.permissions
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
      setEditingDoctorId(null);
      setFormData({
          name: '',
          phone_number: '',
          specialty: '',
          medical_council_number: '',
          booking_window_days: 30,
          maxBookingPercent: 100,
          schedule: {
            "Saturday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
            "Sunday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
            "Monday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
            "Tuesday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
            "Wednesday": { start: '09:00', end: '17:00', breaks: [], is_working: true },
            "Thursday": { start: '09:00', end: '13:00', breaks: [], is_working: true },
            "Friday": { start: '09:00', end: '17:00', breaks: [], is_working: false }
          },
          penaltyConfig: { percent: 15, maxAmount: 100000 },
          permissions: { allowServicePriceEdit: true, allowAppointmentDelete: true, allowManualDiscount: true }
      });
      setCreateStep('form');
      setIsCreateModalOpen(true);
  };

  const initiateCreateOtp = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.phone_number || !formData.specialty) {
          toast.error('لطفا تمام فیلدهای ضروری را پر کنید.');
          return;
      }
      
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otp);
      setCreateStep('otp');
      setInputOtp('');
      
      toast.success(`کد تایید امنیتی به شماره ${formData.phone_number} ارسال شد.`, {
        icon: '📱',
      });
      console.log(`Debug OTP: ${otp}`);
  };

  const handleVerifyCreate = async () => {
      if (inputOtp !== generatedOtp) {
          toast.error('کد وارد شده صحیح نمی‌باشد.');
          return;
      }

      setIsVerifying(true);
      const loadingToast = toast.loading('در حال ثبت اطلاعات پزشک...');
      await new Promise(r => setTimeout(r, 1500)); // Network delay simulation

      const newId = doctors.length > 0 ? Math.max(...doctors.map(d => d.id)) + 1 : 1;
      const newDoctor: Doctor = {
          ...formData as Doctor,
          id: newId
      };

      await addDoctor(newDoctor);
      toast.dismiss(loadingToast);
      setCreateStep('success');
  };

  const updateScheduleDay = (dayId: string, updates: Partial<DailySchedule>) => {
      setFormData(prev => ({
          ...prev,
          schedule: {
              ...prev.schedule,
              [dayId]: {
                  ...(prev.schedule?.[dayId] || { start: '09:00', end: '17:00', breaks: [], serviceRestrictions: [], is_working: false }),
                  ...updates
              }
          }
      }));
  };

  const addBreak = (dayId: string) => {
      const currentSchedule = formData.schedule?.[dayId] || { start: '09:00', end: '17:00', breaks: [], is_working: true };
      const newBreaks = [...(currentSchedule.breaks || []), { start: '13:00', end: '14:00' }];
      updateScheduleDay(dayId, { breaks: newBreaks });
  };

  const removeBreak = (dayId: string, index: number) => {
      const currentSchedule = formData.schedule?.[dayId];
      if (!currentSchedule?.breaks) return;
      const newBreaks = currentSchedule.breaks.filter((_, i) => i !== index);
      updateScheduleDay(dayId, { breaks: newBreaks });
  };

  const updateBreak = (dayId: string, index: number, field: 'start' | 'end', value: string) => {
      const currentSchedule = formData.schedule?.[dayId];
      if (!currentSchedule?.breaks) return;
      const newBreaks = [...currentSchedule.breaks];
      newBreaks[index] = { ...newBreaks[index], [field]: value };
      updateScheduleDay(dayId, { breaks: newBreaks });
  };

  const addRestriction = (dayId: string) => {
      const currentSchedule = formData.schedule?.[dayId] || { start: '09:00', end: '17:00', breaks: [], serviceRestrictions: [], is_working: true };
      const newRestrictions = [...(currentSchedule.serviceRestrictions || []), { start: '08:00', end: '12:00', reason_ids: [] }];
      updateScheduleDay(dayId, { serviceRestrictions: newRestrictions });
  };

  const removeRestriction = (dayId: string, index: number) => {
      const currentSchedule = formData.schedule?.[dayId];
      if (!currentSchedule?.serviceRestrictions) return;
      const newRestrictions = currentSchedule.serviceRestrictions.filter((_, i) => i !== index);
      updateScheduleDay(dayId, { serviceRestrictions: newRestrictions });
  };

  const updateRestriction = (dayId: string, index: number, updates: Partial<ServiceRestriction>) => {
      const currentSchedule = formData.schedule?.[dayId];
      if (!currentSchedule?.serviceRestrictions) return;
      const newRestrictions = [...currentSchedule.serviceRestrictions];
      newRestrictions[index] = { ...newRestrictions[index], ...updates };
      updateScheduleDay(dayId, { serviceRestrictions: newRestrictions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctorId || !formData.name || !formData.phone_number || !formData.specialty) return;

    updateDoctor(editingDoctorId, formData);
    setIsModalOpen(false);
    toast.success('اطلاعات پزشک با موفقیت بروزرسانی شد.');
  };

  const doctorReasons = allReasons.filter(r => r.doctor_id === (editingDoctorId || 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">مدیریت پزشکان</h2>
          <p className="text-gray-500 mt-1">لیست پزشکان تحت مدیریت شما</p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
        >
            <UserPlus size={20} />
            <span className="font-bold">تعریف پزشک جدید</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {allowedDoctors.map(doc => (
            <div key={doc.id} className="glass-card rounded-3xl overflow-hidden shadow-lg border-t-4 border-gray-300 dark:border-gray-600 transition-all duration-300 hover:scale-[1.01]">
                <div className="bg-gradient-to-l from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 p-6 border-b border-gray-100 dark:border-gray-700 relative">
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                        <div className="w-24 h-24 rounded-full border-4 shadow-xl flex items-center justify-center text-4xl font-bold shrink-0 bg-white dark:bg-gray-700 border-primary-100 dark:border-gray-600 text-primary-600 dark:text-primary-400">
                            {doc.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-center sm:text-right space-y-2 w-full">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{doc.name}</h2>
                            <p className="text-lg text-primary-600 dark:text-primary-400 font-medium">{doc.specialty}</p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                                    <Phone size={14} /> {doc.phone_number}
                                </span>
                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                                    <ShieldCheck size={14} /> نظام پزشکی: {doc.medical_council_number || '---'}
                                </span>
                                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                                    <Calendar size={14} /> بازه: {doc.booking_window_days} روز
                                </span>
                                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 text-sm font-bold">
                                    <Activity size={14} /> ظرفیت: {doc.maxBookingPercent || 100}٪
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={() => handleEditClick(doc)}
                            className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm"
                        >
                            <Edit size={16} />
                            ویرایش پروفایل و برنامه
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <Clock size={16} />
                        خلاصه برنامه هفتگی
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {DAYS_MAP.map(day => {
                            const isWorking = doc.schedule[day.id]?.is_working;
                            return (
                                <div key={day.id} className={clsx("text-center p-2 rounded-lg text-xs", isWorking ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500")}>
                                    {day.label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* CREATE MODAL (Multi-step with OTP) */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                  {createStep !== 'success' && (
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <UserPlus className="text-primary-600" size={20} />
                            {createStep === 'form' ? 'مشخصات پزشک جدید' : 'تایید هویت امنیتی'}
                        </h3>
                        <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    </div>
                  )}

                  {createStep === 'form' ? (
                      <form onSubmit={initiateCreateOtp} className="p-6 space-y-5">
                          <div className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-gray-500 mr-1">نام کامل پزشک</label>
                                  <div className="relative">
                                      <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                      <input 
                                          required
                                          className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white transition-colors"
                                          placeholder="مثلا: دکتر حسین علیزاده"
                                          value={formData.name}
                                          onChange={e => setFormData({...formData, name: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-gray-500 mr-1">تخصص</label>
                                  <div className="relative">
                                      <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                      <select 
                                          required
                                          className="w-full pr-10 pl-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white transition-colors appearance-none"
                                          value={formData.specialty}
                                          onChange={e => setFormData({...formData, specialty: e.target.value})}
                                      >
                                          <option value="" disabled>انتخاب تخصص...</option>
                                          {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-gray-500 mr-1">شماره همراه (برای دریافت کد فعال‌سازی)</label>
                                  <div className="relative">
                                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                      <input 
                                          required
                                          type="tel"
                                          className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white transition-colors dir-ltr text-right"
                                          placeholder="0912XXXXXXX"
                                          value={formData.phone_number}
                                          onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                      />
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-gray-500 mr-1">شماره نظام پزشکی</label>
                                  <div className="relative">
                                      <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                      <input 
                                          required
                                          className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white transition-colors dir-ltr text-right"
                                          placeholder="۱۲۳۴۵"
                                          value={formData.medical_council_number}
                                          onChange={e => setFormData({...formData, medical_council_number: e.target.value})}
                                      />
                                  </div>
                              </div>
                              
                              {/* New: Penalty Config for Create */}
                              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                  <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                                      <Gavel size={14} className="text-amber-600" /> تنظیمات جریمه غیبت (تومان/درصد)
                                  </label>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <span className="text-[10px] text-gray-400 mr-1 font-bold">درصد جریمه</span>
                                          <input 
                                              type="number" 
                                              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm"
                                              value={formData.penaltyConfig?.percent}
                                              onChange={e => setFormData({...formData, penaltyConfig: { ...formData.penaltyConfig!, percent: parseInt(e.target.value) }})}
                                          />
                                      </div>
                                      <div className="space-y-1">
                                          <span className="text-[10px] text-gray-400 mr-1 font-bold">سقف ریالی (تومان)</span>
                                          <input 
                                              type="number" 
                                              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm"
                                              value={formData.penaltyConfig?.maxAmount}
                                              onChange={e => setFormData({...formData, penaltyConfig: { ...formData.penaltyConfig!, maxAmount: parseInt(e.target.value) }})}
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start gap-3">
                              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                                  جهت نهایی کردن ثبت‌نام و فعال‌سازی پنل اختصاصی پزشک، یک کد تایید ۴ رقمی به شماره همراه ایشان ارسال خواهد شد.
                              </p>
                          </div>

                          <button 
                              type="submit"
                              className="w-full py-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all font-bold text-lg flex items-center justify-center gap-2"
                          >
                              <span>ارسال کد تایید</span>
                              <Smartphone size={20} />
                          </button>
                      </form>
                  ) : createStep === 'otp' ? (
                      <div className="p-8 space-y-6">
                          <div className="text-center space-y-2">
                              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto text-primary-600 mb-2">
                                  <Lock size={32} />
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                  کد تایید ارسال شده به شماره <span className="font-bold dir-ltr">{formData.phone_number}</span> را وارد کنید.
                              </p>
                          </div>

                          <div className="flex justify-center">
                              <input 
                                  type="text"
                                  maxLength={4}
                                  autoFocus
                                  className="w-48 text-center text-3xl font-black tracking-[0.5em] py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:text-white transition-all"
                                  placeholder="----"
                                  value={inputOtp}
                                  onChange={e => setInputOtp(e.target.value)}
                              />
                          </div>

                          <div className="flex flex-col gap-3">
                              <button 
                                  onClick={handleVerifyCreate}
                                  disabled={inputOtp.length !== 4 || isVerifying}
                                  className="w-full py-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                  {isVerifying ? (
                                      <RefreshCw size={24} className="animate-spin" />
                                  ) : (
                                      <>
                                          <CheckCircle2 size={24} />
                                          <span>تایید و ثبت نهایی</span>
                                      </>
                                  )}
                              </button>
                              <button 
                                  onClick={() => setCreateStep('form')}
                                  className="text-sm text-gray-500 hover:text-primary-600 transition-colors font-medium"
                              >
                                  ویرایش شماره تماس
                              </button>
                          </div>
                      </div>
                  ) : (
                      /* SUCCESS STEP */
                      <div className="p-10 text-center space-y-6 animate-in zoom-in-95 duration-500">
                          <div className="relative">
                              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2 relative z-10 scale-110">
                                  <CheckCircle2 size={64} strokeWidth={2.5} className="animate-bounce" />
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                  <PartyPopper size={120} className="text-green-500 animate-pulse" />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <h3 className="text-2xl font-black text-gray-800 dark:text-white">تبریک! ثبت‌نام موفق</h3>
                              <p className="text-gray-500 dark:text-gray-400">
                                  دکتر <span className="font-bold text-gray-800 dark:text-gray-200">{formData.name}</span> با موفقیت به سیستم اضافه شد.
                              </p>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-right space-y-3">
                              <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">تخصص:</span>
                                  <span className="font-bold text-gray-700 dark:text-gray-200">{formData.specialty}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">شماره همراه:</span>
                                  <span className="font-mono font-bold text-gray-700 dark:text-gray-200 dir-ltr">{formData.phone_number}</span>
                              </div>
                          </div>

                          <button 
                              onClick={() => setIsCreateModalOpen(false)}
                              className="w-full py-4 bg-gray-900 dark:bg-primary-600 text-white rounded-2xl hover:bg-black dark:hover:bg-primary-700 shadow-xl transition-all font-bold text-lg flex items-center justify-center gap-2"
                          >
                              <ArrowLeft size={20} className="rotate-180" />
                              <span>بازگشت به لیست پزشکان</span>
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* EDIT MODAL (Full details) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 !mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-white dark:bg-gray-800 z-10 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
               <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                 ویرایش اطلاعات و برنامه پزشک
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                 <X size={24} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نام و نام خانوادگی</label>
                    <div className="relative">
                       <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input 
                         required
                         type="text" 
                         className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">تخصص</label>
                    <div className="relative">
                       <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <select 
                         required
                         className="w-full pr-10 pl-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white appearance-none"
                         value={formData.specialty}
                         onChange={e => setFormData({...formData, specialty: e.target.value})}
                       >
                         <option value="" disabled>انتخاب تخصص...</option>
                         {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                       <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">شماره نظام پزشکی</label>
                    <div className="relative">
                       <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input 
                         type="text" 
                         className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white dir-ltr text-right"
                         value={formData.medical_council_number}
                         onChange={e => setFormData({...formData, medical_council_number: e.target.value})}
                         placeholder="مثلا: ۱۲۳۴۵"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">شماره تماس</label>
                    <div className="relative">
                       <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input 
                         required
                         type="tel" 
                         className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                         value={formData.phone_number}
                         onChange={e => setFormData({...formData, phone_number: e.target.value})}
                       />
                    </div>
                 </div>
               </div>

               {/* New: Penalty Config Section */}
               <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6">
                   <div className="flex items-center gap-2 mb-2">
                       <Gavel size={20} className="text-amber-500" />
                       <h4 className="font-bold text-gray-800 dark:text-white">تنظیمات جریمه عدم حضور</h4>
                   </div>
                   <div className="bg-amber-50/30 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100/50 dark:border-amber-800/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">درصد جریمه از هزینه کل:</label>
                                    <span className="text-lg font-black text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900">
                                        {formData.penaltyConfig?.percent}٪
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    step="1"
                                    className="w-full h-2 bg-amber-100 dark:bg-amber-900 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                    value={formData.penaltyConfig?.percent}
                                    onChange={(e) => setFormData({...formData, penaltyConfig: { ...formData.penaltyConfig!, percent: parseInt(e.target.value) }})}
                                />
                                <p className="text-[10px] text-gray-400">این درصد بر اساس هزینه خدماتی که بیمار رزرو کرده محاسبه می‌شود.</p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">حداکثر مبلغ جریمه (تومان):</label>
                                <div className="relative">
                                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="number" 
                                        className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all dark:text-white font-bold"
                                        value={formData.penaltyConfig?.maxAmount}
                                        onChange={(e) => setFormData({...formData, penaltyConfig: { ...formData.penaltyConfig!, maxAmount: parseInt(e.target.value) }})}
                                        placeholder="مثلا: ۱۰۰,۰۰۰"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400">سقفی که جریمه در صورت بالا بودن هزینه خدمت، از آن فراتر نمی‌رود.</p>
                            </div>
                        </div>
                   </div>
               </div>

               {/* Capacity Management Section */}
               <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6">
                   <div className="flex items-center gap-2 mb-2">
                       <Activity size={20} className="text-emerald-500" />
                       <h4 className="font-bold text-gray-800 dark:text-white">مدیریت ظرفیت پذیرش</h4>
                   </div>
                   <div className="bg-emerald-50/30 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">حداکثر درصد تکمیل نوبت‌های روزانه:</span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900">
                                {formData.maxBookingPercent}٪
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            step="5"
                            className="w-full h-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            value={formData.maxBookingPercent}
                            onChange={(e) => setFormData({...formData, maxBookingPercent: parseInt(e.target.value)})}
                        />
                   </div>
               </div>

               {/* Schedule Config */}
               <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-6">
                 <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-primary-600" size={20} />
                    <h4 className="font-bold text-gray-800 dark:text-white">برنامه کاری و استراحت</h4>
                 </div>
                 
                 <div className="space-y-4">
                   {DAYS_MAP.map(day => {
                     const dayData = formData.schedule?.[day.id] || { 
                         start: '09:00', end: '17:00', breaks: [], serviceRestrictions: [], is_working: false 
                     };

                     return (
                       <div key={day.id} className={`p-5 rounded-2xl border transition-all ${dayData.is_working ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-70'}`}>
                           <div className="flex flex-col gap-5">
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                   <div className="flex items-center gap-3">
                                       <label className="relative inline-flex items-center cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={dayData.is_working}
                                            onChange={(e) => updateScheduleDay(day.id, { is_working: e.target.checked })}
                                          />
                                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-5 peer-checked:after:border-white"></div>
                                       </label>
                                       <span className="font-bold text-gray-700 dark:text-gray-300 min-w-[60px]">{day.label}</span>
                                   </div>

                                   {dayData.is_working && (
                                       <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                                           <span className="text-xs text-gray-500 whitespace-nowrap">ساعت کاری:</span>
                                           <input 
                                              type="time" 
                                              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-1.5" 
                                              value={dayData.start}
                                              onChange={(e) => updateScheduleDay(day.id, { start: e.target.value })}
                                           />
                                           <span className="text-gray-400">-</span>
                                           <input 
                                              type="time" 
                                              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-1.5" 
                                              value={dayData.end}
                                              onChange={(e) => updateScheduleDay(day.id, { end: e.target.value })}
                                           />
                                       </div>
                                   )}
                               </div>

                               {dayData.is_working && (
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-1 duration-300">
                                       <div className="pl-4 border-r-2 border-gray-100 dark:border-gray-700 pr-2 space-y-3">
                                           <div className="flex items-center justify-between">
                                               <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                                                   <Coffee size={14} className="text-amber-500" />
                                                   زمان‌های استراحت
                                               </span>
                                               <button 
                                                  type="button" 
                                                  onClick={() => addBreak(day.id)}
                                                  className="text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 px-2 py-1 rounded-md transition-colors flex items-center gap-1 font-bold"
                                               >
                                                   <Plus size={12} />
                                                   افزودن
                                               </button>
                                           </div>
                                           
                                           <div className="space-y-2">
                                               {dayData.breaks?.map((brk, idx) => (
                                                   <div key={idx} className="flex items-center gap-2">
                                                        <input 
                                                            type="time" 
                                                            className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-gray-800 dark:text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-1 w-24" 
                                                            value={brk.start}
                                                            onChange={(e) => updateBreak(day.id, idx, 'start', e.target.value)}
                                                        />
                                                        <span className="text-gray-400">-</span>
                                                        <input 
                                                            type="time" 
                                                            className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-gray-800 dark:text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-1 w-24" 
                                                            value={brk.end}
                                                            onChange={(e) => updateBreak(day.id, idx, 'end', e.target.value)}
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => removeBreak(day.id, idx)}
                                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>

                                       <div className="pl-4 border-r-2 border-indigo-100 dark:border-indigo-900/50 pr-2 space-y-3">
                                           <div className="flex items-center justify-between">
                                               <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                                                   <Target size={14} className="text-indigo-500" />
                                                   زمان‌بندی اختصاصی خدمات
                                               </span>
                                               <button 
                                                  type="button" 
                                                  onClick={() => addRestriction(day.id)}
                                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded-md transition-colors flex items-center gap-1 font-bold"
                                               >
                                                   <Plus size={12} />
                                                   افزودن
                                               </button>
                                           </div>

                                           <div className="space-y-3">
                                               {dayData.serviceRestrictions?.map((res, idx) => (
                                                   <div key={idx} className="bg-indigo-50/30 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30 space-y-2 relative">
                                                        <button 
                                                            type="button"
                                                            onClick={() => removeRestriction(day.id, idx)}
                                                            className="absolute top-2 left-2 p-1 text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="time" 
                                                                className="bg-white dark:bg-gray-700 border border-indigo-100 dark:border-indigo-900 text-gray-800 dark:text-white text-[11px] rounded-md block p-1 w-20" 
                                                                value={res.start}
                                                                onChange={(e) => updateRestriction(day.id, idx, { start: e.target.value })}
                                                            />
                                                            <span className="text-gray-400">-</span>
                                                            <input 
                                                                type="time" 
                                                                className="bg-white dark:bg-gray-700 border border-indigo-100 dark:border-indigo-900 text-gray-800 dark:text-white text-[11px] rounded-md block p-1 w-20" 
                                                                value={res.end}
                                                                onChange={(e) => updateRestriction(day.id, idx, { end: e.target.value })}
                                                            />
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5">
                                                            {allReasons.filter(r => r.doctor_id === (editingDoctorId || 0)).map(reason => {
                                                                const isSelected = res.reason_ids.includes(reason.uuid);
                                                                return (
                                                                    <button
                                                                        key={reason.uuid}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newIds = isSelected 
                                                                                ? res.reason_ids.filter(id => id !== reason.uuid)
                                                                                : [...res.reason_ids, reason.uuid];
                                                                            updateRestriction(day.id, idx, { reason_ids: newIds });
                                                                        }}
                                                                        className={clsx(
                                                                            "text-[10px] px-2 py-0.5 rounded-md transition-all border",
                                                                            isSelected 
                                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                                                                : "bg-white dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-500 hover:border-indigo-300"
                                                                        )}
                                                                    >
                                                                        {reason.title}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   </div>
                               )}
                           </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            </form>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    انصراف
                  </button>
                  <button 
                    onClick={handleSubmit}
                    className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20 transition-all flex items-center gap-2 font-bold"
                  >
                    <Check size={20} />
                    <span>ذخیره تغییرات</span>
                  </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
