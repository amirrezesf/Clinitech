
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Doctor, DailySchedule, ServiceRestriction } from '../types';
import { 
  Clock, Calendar, Phone, Stethoscope, Check, User, 
  Coffee, Plus, Trash2, Target, AlertTriangle, 
  DollarSign, Activity, ShieldCheck, ChevronDown, Gavel, Save
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
  'پزشک عمومی', 'متخصص قلب و عروق', 'دندانپزشک', 'متخصص پوست، مو و زیبایی',
  'متخصص زنان و زایمان', 'متخصص اطفال', 'متخصص داخلی', 'چشم پزشک',
  'متخصص مغز و اعصاب', 'روانپزشک', 'جراح عمومی', 'متخصص ارتوپدی',
  'متخصص گوش، حلق و بینی', 'متخصص رادیولوژی', 'متخصص تغذیه', 'فیزیوتراپیست'
];

export const DoctorSettings = () => {
  const { doctors, updateDoctor, allReasons } = useData();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<Partial<Doctor> | null>(null);

  useEffect(() => {
    const doctorId = user?.allowedDoctorIds?.[0];
    const doc = doctors.find(d => d.id === doctorId);
    if (doc) {
      setFormData({
        ...doc,
        schedule: JSON.parse(JSON.stringify(doc.schedule)) // Deep copy
      });
    }
  }, [doctors, user]);

  const updateScheduleDay = (dayId: string, updates: Partial<DailySchedule>) => {
    if (!formData?.schedule) return;
    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        [dayId]: {
          ...(formData.schedule[dayId] || { start: '09:00', end: '17:00', breaks: [], serviceRestrictions: [], is_working: false }),
          ...updates
        }
      }
    });
  };

  const addBreak = (dayId: string) => {
    const currentSchedule = formData?.schedule?.[dayId];
    if (!currentSchedule) return;
    const newBreaks = [...(currentSchedule.breaks || []), { start: '13:00', end: '14:00' }];
    updateScheduleDay(dayId, { breaks: newBreaks });
  };

  const removeBreak = (dayId: string, index: number) => {
    const currentSchedule = formData?.schedule?.[dayId];
    if (!currentSchedule?.breaks) return;
    const newBreaks = currentSchedule.breaks.filter((_, i) => i !== index);
    updateScheduleDay(dayId, { breaks: newBreaks });
  };

  const addRestriction = (dayId: string) => {
    const currentSchedule = formData?.schedule?.[dayId];
    if (!currentSchedule) return;
    const newRestrictions = [...(currentSchedule.serviceRestrictions || []), { start: '08:00', end: '12:00', reason_ids: [] }];
    updateScheduleDay(dayId, { serviceRestrictions: newRestrictions });
  };

  const removeRestriction = (dayId: string, index: number) => {
    const currentSchedule = formData?.schedule?.[dayId];
    if (!currentSchedule?.serviceRestrictions) return;
    const newRestrictions = currentSchedule.serviceRestrictions.filter((_, i) => i !== index);
    updateScheduleDay(dayId, { serviceRestrictions: newRestrictions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !user?.allowedDoctorIds?.[0]) return;

    updateDoctor(user.allowedDoctorIds[0], formData);
    toast.success('تنظیمات پروفایل و برنامه شما با موفقیت ذخیره شد.');
  };

  if (!formData) return <div className="p-20 text-center text-gray-500">در حال بارگذاری اطلاعات...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">تنظیمات پروفایل و مطب</h2>
          <p className="text-gray-500 mt-1">مدیریت اطلاعات تخصصی، مالی و برنامه زمان‌بندی</p>
        </div>
        <button 
          onClick={handleSubmit}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary-600/20 transition-all font-bold"
        >
          <Save size={20} />
          <span>ذخیره کلیه تغییرات</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Card */}
        <div className="glass-card p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="text-primary-600" size={20} />
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">اطلاعات هویتی و تخصصی</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نام و نام خانوادگی</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required type="text" className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">تخصص</label>
              <div className="relative">
                <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select required className="w-full pr-10 pl-10 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white appearance-none" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
                  {MEDICAL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">شماره نظام پزشکی</label>
              <div className="relative">
                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none transition-all dark:text-white dir-ltr text-right" value={formData.medical_council_number} onChange={e => setFormData({...formData, medical_council_number: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">شماره تماس مطب</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required type="tel" className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none transition-all dark:text-white dir-ltr text-right" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Capacity Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Penalty Config */}
          <div className="glass-card p-8 rounded-[2.5rem] shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Gavel size={20} className="text-amber-500" />
              <h4 className="font-bold text-gray-800 dark:text-white">تنظیمات جریمه عدم حضور</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500">درصد جریمه از هزینه خدمت:</label>
                  <span className="text-sm font-black text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-lg">{formData.penaltyConfig?.percent}%</span>
                </div>
                <input type="range" min="0" max="100" className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600" value={formData.penaltyConfig?.percent} onChange={e => setFormData({...formData, penaltyConfig: { ...formData.penaltyConfig!, percent: parseInt(e.target.value) }})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">حداکثر مبلغ جریمه (تومان):</label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="number" className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none dark:text-white font-bold" value={formData.penaltyConfig?.maxAmount} onChange={e => setFormData({...formData, penaltyConfig: { ...formData.penaltyConfig!, maxAmount: parseInt(e.target.value) }})} />
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Config */}
          <div className="glass-card p-8 rounded-[2.5rem] shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={20} className="text-emerald-500" />
              <h4 className="font-bold text-gray-800 dark:text-white">مدیریت ظرفیت پذیرش</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500">حداکثر درصد تکمیل نوبت‌ها:</label>
                  <span className="text-sm font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">{formData.maxBookingPercent}%</span>
                </div>
                <input type="range" min="10" max="100" step="5" className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={formData.maxBookingPercent} onChange={e => setFormData({...formData, maxBookingPercent: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">بازه زمانی رزرو (روز):</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="number" className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold" value={formData.booking_window_days} onChange={e => setFormData({...formData, booking_window_days: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Schedule Section */}
        <div className="glass-card p-8 rounded-[2.5rem] shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="text-primary-600" size={20} />
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">برنامه کاری و محدودیت‌های زمانی</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {DAYS_MAP.map(day => {
              const dayData = formData.schedule?.[day.id];
              if (!dayData) return null;

              return (
                <div key={day.id} className={clsx("p-6 rounded-3xl border transition-all", dayData.is_working ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60")}>
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex items-center gap-4 min-w-[150px]">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={dayData.is_working} onChange={e => updateScheduleDay(day.id, { is_working: e.target.checked })} />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-5 peer-checked:after:border-white"></div>
                      </label>
                      <span className="font-black text-gray-800 dark:text-white">{day.label}</span>
                    </div>

                    {dayData.is_working && (
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Working Hours */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ساعت کاری</p>
                          <div className="flex items-center gap-2">
                            <input type="time" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 p-2 rounded-lg text-sm" value={dayData.start} onChange={e => updateScheduleDay(day.id, { start: e.target.value })} />
                            <span className="text-gray-400">تا</span>
                            <input type="time" className="bg-gray-50 dark:bg-gray-700 border border-gray-200 p-2 rounded-lg text-sm" value={dayData.end} onChange={e => updateScheduleDay(day.id, { end: e.target.value })} />
                          </div>
                        </div>

                        {/* Breaks */}
                        <div className="space-y-3 border-r border-gray-100 dark:border-gray-700 pr-6">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1"><Coffee size={12}/> استراحت</p>
                            <button type="button" onClick={() => addBreak(day.id)} className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-bold hover:bg-amber-100 transition-colors">افزودن</button>
                          </div>
                          <div className="space-y-2">
                            {dayData.breaks.map((brk, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input type="time" className="bg-white dark:bg-gray-800 border border-amber-100 p-1 rounded-md text-xs" value={brk.start} onChange={e => {
                                  const newBreaks = [...dayData.breaks];
                                  newBreaks[idx] = { ...newBreaks[idx], start: e.target.value };
                                  updateScheduleDay(day.id, { breaks: newBreaks });
                                }} />
                                <span className="text-gray-300">-</span>
                                <input type="time" className="bg-white dark:bg-gray-800 border border-amber-100 p-1 rounded-md text-xs" value={brk.end} onChange={e => {
                                  const newBreaks = [...dayData.breaks];
                                  newBreaks[idx] = { ...newBreaks[idx], end: e.target.value };
                                  updateScheduleDay(day.id, { breaks: newBreaks });
                                }} />
                                <button type="button" onClick={() => removeBreak(day.id, idx)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Services Specific */}
                        <div className="space-y-3 border-r border-gray-100 dark:border-gray-700 pr-6">
                           <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1"><Target size={12}/> محدودیت خدمات</p>
                            <button type="button" onClick={() => addRestriction(day.id)} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 transition-colors">افزودن</button>
                          </div>
                          <div className="space-y-3">
                            {dayData.serviceRestrictions?.map((res, idx) => (
                              <div key={idx} className="p-2 bg-indigo-50/30 rounded-xl border border-indigo-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <input type="time" className="text-[10px] p-1 rounded border border-indigo-100" value={res.start} onChange={e => {
                                      const newRes = [...(dayData.serviceRestrictions || [])];
                                      newRes[idx] = { ...newRes[idx], start: e.target.value };
                                      updateScheduleDay(day.id, { serviceRestrictions: newRes });
                                    }} />
                                    <input type="time" className="text-[10px] p-1 rounded border border-indigo-100" value={res.end} onChange={e => {
                                      const newRes = [...(dayData.serviceRestrictions || [])];
                                      newRes[idx] = { ...newRes[idx], end: e.target.value };
                                      updateScheduleDay(day.id, { serviceRestrictions: newRes });
                                    }} />
                                  </div>
                                  <button type="button" onClick={() => removeRestriction(day.id, idx)} className="text-red-300 hover:text-red-500"><XCircle size={14}/></button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {allReasons.filter(r => r.doctor_id === user?.allowedDoctorIds?.[0]).map(reason => {
                                    const isSelected = res.reason_ids.includes(reason.uuid);
                                    return (
                                      <button key={reason.uuid} type="button" onClick={() => {
                                        const newRes = [...(dayData.serviceRestrictions || [])];
                                        const newIds = isSelected ? res.reason_ids.filter(id => id !== reason.uuid) : [...res.reason_ids, reason.uuid];
                                        newRes[idx] = { ...newRes[idx], reason_ids: newIds };
                                        updateScheduleDay(day.id, { serviceRestrictions: newRes });
                                      }} className={clsx("text-[8px] px-1.5 py-0.5 rounded-md border", isSelected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500")}>
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
    </div>
  );
};

const XCircle = ({ size, className }: any) => <Trash2 size={size} className={className} />;
