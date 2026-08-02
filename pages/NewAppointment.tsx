
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
// Fix: Added formatJalaliDate to imports from helpers
import { formatCurrency, formatJalaliDate } from '../utils/helpers';
import { 
  User, Phone, Stethoscope, CheckCircle, X, Calendar, 
  Clock, ArrowRight, UserPlus, ShieldCheck, 
  Repeat, ListChecks, CalendarRange, Trash2, PlusCircle,
  Plus, Layers, Minus, Wand2, CalendarDays, ChevronDown, Check,
  // Fix: Added Info to lucide-react imports
  Info
} from 'lucide-react';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { Appointment, Patient, AppointmentItem } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface PreviewSession {
    date: string;
    time: string;
    isAvailable: boolean;
}

export const NewAppointment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    patients, 
    allReasons, 
    doctors,
    addAppointment, 
    addPatient, 
    allAppointments,
    getReasonTitle,
    insurances
  } = useData();

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Shared State
  const [appointmentMode, setAppointmentMode] = useState<'single' | 'recurring'>('single');
  const [formDoctorId, setFormDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  
  // New Patient Modal State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [fullNewPatientData, setFullNewPatientData] = useState<any>({
      name: '',
      phone_number: '',
      id_number: '',
      insurance_id: '',
      insurance_code: '',
      notes: '',
      medical_history: []
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // MULTI SERVICE STATE (Shared by both modes)
  const [selectedServices, setSelectedServices] = useState<AppointmentItem[]>([]);
  
  // Single Mode Specific
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');

  // RECURRING MODE SPECIFIC
  const [seriesTitle, setSeriesTitle] = useState('');
  const [recurrenceInterval, setRecurrenceInterval] = useState(7); // Every X days
  const [sessionCount, setSessionCount] = useState(4); // Total sessions
  const [previewSessions, setPreviewSessions] = useState<PreviewSession[]>([]);

  const selectedDoctor = doctors.find(d => d.id === parseInt(formDoctorId));
  const doctorReasons = allReasons.filter(r => r.doctor_id === parseInt(formDoctorId));

  const addService = (id: string) => {
      if (!id) return;
      if (selectedServices.find(s => s.reason_id === id)) {
          toast.error('این خدمت قبلاً اضافه شده است.');
          return;
      }
      setSelectedServices([...selectedServices, { reason_id: id, quantity: 1 }]);
      setPreviewSessions([]);
  };

  const updateQuantity = (id: string, delta: number) => {
      setSelectedServices(prev => prev.map(s => 
          s.reason_id === id ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s
      ));
      setPreviewSessions([]);
  };

  const removeService = (id: string) => {
      setSelectedServices(selectedServices.filter(s => s.reason_id !== id));
      setPreviewSessions([]);
  };

  const totalDuration = useMemo(() => {
      return selectedServices.reduce((sum, s) => {
          const r = allReasons.find(res => res.uuid === s.reason_id);
          return sum + ((r?.duration || 0) * s.quantity);
      }, 0);
  }, [selectedServices, allReasons]);

  const totalPricePerSession = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
        const r = allReasons.find(res => res.uuid === s.reason_id);
        return sum + ((r?.price || 0) * s.quantity);
    }, 0);
  }, [selectedServices, allReasons]);

  // Available Slots Logic (Helper)
  const getFirstAvailableSlot = (dateStr: string, docId: number, duration: number) => {
    const doc = doctors.find(d => d.id === docId);
    if (!doc || duration === 0) return null;

    const dateObj = new Date(dateStr);
    const dayKey = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()];
    const schedule = doc.schedule[dayKey];
    if (!schedule || !schedule.is_working) return null;

    let current = new Date(`${dateStr}T${schedule.start}:00`);
    const endTime = new Date(`${dateStr}T${schedule.end}:00`);

    const dayAppts = allAppointments.filter(a => 
        a.doctor_id === docId && a.for_date.startsWith(dateStr) && a.status !== '2'
    ).map(a => {
        const s = new Date(a.for_date);
        const dur = a.services.reduce((sum, serv) => sum + (allReasons.find(r=>r.uuid===serv.reason_id)?.duration || 0) * serv.quantity, 0);
        return { start: s, end: new Date(s.getTime() + dur * 60000) };
    });

    while (current.getTime() + duration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(current.getTime() + duration * 60000);
        const isBooked = dayAppts.some(apt => (current < apt.end && slotEnd > apt.start));
        if (!isBooked) {
            return current.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});
        }
        current = new Date(current.getTime() + 15 * 60000);
    }
    return null;
  };

  const availableTimeSlotsForSingle = useMemo(() => {
    if (appointmentMode !== 'single') return [];
    const doc = doctors.find(d => d.id === parseInt(formDoctorId));
    if (!doc || totalDuration === 0) return [];
    
    const dateStr = selectedDate;
    const dateObj = new Date(dateStr);
    const dayKey = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()];
    const schedule = doc.schedule[dayKey];
    if (!schedule || !schedule.is_working) return [];

    const slots: string[] = [];
    let current = new Date(`${dateStr}T${schedule.start}:00`);
    const endTime = new Date(`${dateStr}T${schedule.end}:00`);
    const dayAppts = allAppointments.filter(a => a.doctor_id === doc.id && a.for_date.startsWith(dateStr) && a.status !== '2')
        .map(a => {
            const s = new Date(a.for_date);
            const dur = a.services.reduce((sum, serv) => sum + (allReasons.find(r=>r.uuid===serv.reason_id)?.duration || 0) * serv.quantity, 0);
            return { start: s, end: new Date(s.getTime() + dur * 60000) };
        });

    while (current.getTime() + totalDuration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(current.getTime() + totalDuration * 60000);
        if (!dayAppts.some(apt => (current < apt.end && slotEnd > apt.start))) {
            slots.push(current.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}));
        }
        current = new Date(current.getTime() + 15 * 60000);
    }
    return slots;
  }, [selectedDate, selectedServices, formDoctorId, allAppointments, totalDuration, appointmentMode]);

  const generateRecurringPreview = () => {
    if (selectedServices.length === 0) { toast.error('ابتدا خدمات را انتخاب کنید'); return; }
    
    const sessions: PreviewSession[] = [];
    let currentDateCursor = new Date(selectedDate);

    for (let i = 0; i < sessionCount; i++) {
        const dateStr = currentDateCursor.toISOString().split('T')[0];
        const slot = getFirstAvailableSlot(dateStr, parseInt(formDoctorId), totalDuration);
        
        sessions.push({
            date: dateStr,
            time: slot || 'تداخل زمانی',
            isAvailable: !!slot
        });

        currentDateCursor.setDate(currentDateCursor.getDate() + recurrenceInterval);
    }
    setPreviewSessions(sessions);
  };

  const handleCreateNewPatient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullNewPatientData.name || !fullNewPatientData.phone_number) {
          toast.error('نام و شماره تماس الزامی است.');
          return;
      }
      const newId = `p-${Date.now()}`;
      await addPatient({ uuid: newId, ...fullNewPatientData });
      setSelectedPatientId(newId);
      setPatientSearch(fullNewPatientData.name);
      setIsPatientModalOpen(false);
      toast.success('پرونده بیمار ایجاد شد.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || selectedServices.length === 0) { toast.error('اطلاعات ناقص است.'); return; }

    if (appointmentMode === 'single') {
        if (!selectedTime) { toast.error('ساعت نوبت را انتخاب کنید'); return; }
        await addAppointment({ 
            uuid: `a-${Date.now()}`, patient_id: selectedPatientId, doctor_id: parseInt(formDoctorId), 
            services: selectedServices, status: '1', for_date: new Date(`${selectedDate}T${selectedTime}:00`).toISOString(), 
            discount: 0, created_at: new Date().toISOString() 
        });
    } else {
        if (previewSessions.length === 0) { toast.error('ابتدا پیش‌نمایش را تولید کنید'); return; }
        if (previewSessions.some(s => !s.isAvailable)) { toast.error('برخی جلسات تداخل دارند.'); return; }
        
        const recurringId = `rec-${Date.now()}`;
        for (const session of previewSessions) {
            await addAppointment({ 
                uuid: `a-${Math.random().toString(36).substr(2, 9)}`, patient_id: selectedPatientId, doctor_id: parseInt(formDoctorId), 
                services: selectedServices, status: '1', for_date: new Date(`${session.date}T${session.time}:00`).toISOString(), 
                discount: 0, created_at: new Date().toISOString(), recurring_id: recurringId, recurring_title: seriesTitle || 'دوره درمانی'
            });
        }
    }
    toast.success('نوبت‌ها با موفقیت ثبت شدند.');
    navigate('/today');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"><ArrowRight size={24} /></button>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">ثبت پذیرش هوشمند</h2>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] shadow-xl bg-white/80 dark:bg-gray-900/60">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 mb-10 shadow-inner max-w-sm mx-auto">
                <button type="button" onClick={() => { setAppointmentMode('single'); setPreviewSessions([]); }} className={clsx("flex-1 py-3 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2", appointmentMode === 'single' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                    <Calendar size={18} /> نوبت تکی
                </button>
                <button type="button" onClick={() => { setAppointmentMode('recurring'); setPreviewSessions([]); }} className={clsx("flex-1 py-3 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2", appointmentMode === 'recurring' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                    <Repeat size={18} /> نوبت دوره‌ای
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">پزشک معالج</label><select className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white" value={formDoctorId} onChange={(e) => { setFormDoctorId(e.target.value); setSelectedServices([]); }}>{allowedDoctors.map(d => (<option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>))}</select></div>
                    <div className="space-y-2" ref={dropdownRef}><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">بیمار مراجع</label><div className="relative"><input type="text" className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white" placeholder="جستجوی پرونده..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); setShowPatientList(true); }} onFocus={() => setShowPatientList(true)} />{showPatientList && (<div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">{patients.filter(p => p.name.includes(patientSearch) || p.phone_number.includes(patientSearch)).map(p => (<div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); }} className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/40 cursor-pointer flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700 last:border-0 font-bold dark:text-white"><span>{p.name}</span><span className="text-[10px] text-gray-400 font-black">{p.phone_number}</span></div>))}<div onClick={() => setIsPatientModalOpen(true)} className="px-4 py-3 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 font-black cursor-pointer text-xs flex items-center gap-2 border-t border-primary-100/50"><PlusCircle size={16} /> ایجاد پرونده جدید بیمار</div></div>)}</div></div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="space-y-6">
                        <label className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2"><ListChecks className="text-primary-600" size={20} /> انتخاب پکیج خدمات</label>
                        <div className="relative"><select className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none appearance-none font-bold dark:text-white" onChange={(e) => { addService(e.target.value); e.target.value = ""; }} value=""><option value="" disabled>افزودن خدمت جدید...</option>{doctorReasons.map(r => (<option key={r.uuid} value={r.uuid}>{r.title} - {formatCurrency(r.price)}</option>))}</select><ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} /></div>
                        <div className="space-y-3">{selectedServices.map(item => { const r = allReasons.find(res => res.uuid === item.reason_id); return (<div key={item.reason_id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.5rem] shadow-sm animate-in slide-in-from-right-2"><div className="flex-1"><p className="text-sm font-black text-gray-800 dark:text-white">{r?.title}</p><p className="text-[10px] text-gray-400 font-bold">{formatCurrency(r?.price || 0)}</p></div><div className="flex items-center gap-4"><div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-xl p-1"><button type="button" onClick={() => updateQuantity(item.reason_id, -1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg text-gray-400"><Minus size={14}/></button><span className="px-3 text-sm font-black text-primary-600">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.reason_id, 1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg text-gray-400"><Plus size={14}/></button></div><button type="button" onClick={() => removeService(item.reason_id)} className="text-red-300 hover:text-red-500 p-2"><Trash2 size={18}/></button></div></div>); })}</div>
                    </div>

                    <div className="space-y-8">
                        {appointmentMode === 'single' ? (
                            <div className="space-y-6 animate-in fade-in">
                                <PersianDatePicker label="تاریخ ویزیت" value={selectedDate} onChange={setSelectedDate} />
                                <div className="space-y-4"><label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Clock size={16} className="text-blue-500" /> ساعت‌های پیشنهادی (بر اساس نوبت‌های قبلی)</label><div className="grid grid-cols-4 gap-2">{availableTimeSlotsForSingle.map(time => (<button key={time} type="button" onClick={() => setSelectedTime(time)} className={clsx("py-2.5 rounded-xl border-2 text-[11px] font-black transition-all", selectedTime === time ? "bg-primary-600 border-primary-600 text-white shadow-lg" : "bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 hover:border-primary-100")}>{time}</button>))}</div>{availableTimeSlotsForSingle.length === 0 && selectedServices.length > 0 && (<div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 text-[10px] font-bold rounded-2xl flex items-center gap-2"><Info size={14}/> پوزش؛ برای این تاریخ و این مدت زمان، ساعت خالی یافت نشد.</div>)}</div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-left-4">
                                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/40 space-y-5">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mr-1">عنوان طرح درمان</label><input type="text" className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 outline-none text-sm font-bold dark:text-white" value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)} placeholder="مثلاً: ایمپلنت کل فک" /></div>
                                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mr-1">تعداد جلسات</label><input type="number" className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 font-black dark:text-white" value={sessionCount} onChange={e => setSessionCount(parseInt(e.target.value))} /></div><div className="space-y-1"><label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mr-1">فاصله (روز)</label><input type="number" className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 font-black dark:text-white" value={recurrenceInterval} onChange={e => setRecurrenceInterval(parseInt(e.target.value))} /></div></div>
                                    <PersianDatePicker label="تاریخ شروع اولین جلسه" value={selectedDate} onChange={setSelectedDate} />
                                    <button type="button" onClick={generateRecurringPreview} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"><Wand2 size={20} /> تولید هوشمند برنامه جلسات</button>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>

                 {appointmentMode === 'recurring' && previewSessions.length > 0 && (
                     <div className="space-y-4 animate-in fade-in duration-500">
                         <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2"><CalendarDays size={20} className="text-indigo-600" /> لیست جلسات پیشنهادی دوره درمانی</h3>
                         <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900">
                             <table className="w-full text-right text-xs">
                                 <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 font-black uppercase tracking-tighter">
                                     <tr><th className="px-6 py-4"># جلسه</th><th className="px-6 py-4">تاریخ پیشنهادی</th><th className="px-6 py-4">ساعت آزاد</th><th className="px-6 py-4">وضعیت</th></tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                     {previewSessions.map((s, idx) => (
                                         <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                                             <td className="px-6 py-4 font-black text-gray-400">{(idx + 1).toString().padStart(2, '۰')}</td>
                                             <td className="px-6 py-4 font-black text-gray-700 dark:text-gray-300">{formatJalaliDate(s.date)}</td>
                                             <td className="px-6 py-4 font-black text-primary-600">{s.time}</td>
                                             <td className="px-6 py-4">{s.isAvailable ? <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full font-black border border-green-200">OK</span> : <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-black border border-red-200">CONFLICT</span>}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 )}

                 <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button type="submit" disabled={selectedServices.length === 0 || !selectedPatientId} className="px-12 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary-600/20 transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"><CheckCircle size={28} /> <span>ثبت نهایی پذیرش</span></button>
                 </div>
            </form>
        </div>

        {/* New Patient Full Form Modal */}
        {isPatientModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="bg-primary-600 p-8 text-white relative shrink-0"><button onClick={() => setIsPatientModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button><div className="flex items-center gap-4"><div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><UserPlus size={32} /></div><div><h3 className="text-2xl font-black">تشکیل پرونده بیمار جدید</h3><p className="opacity-80 text-sm mt-1 font-bold">اطلاعات هویتی و سوابق پزشکی را ثبت کنید</p></div></div></div>
                    <form onSubmit={handleCreateNewPatient} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-6"><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">نام کامل</label><input required className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white" value={fullNewPatientData.name} onChange={e => setFullNewPatientData({...fullNewPatientData, name: e.target.value})} /></div><div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">تلفن همراه</label><input required className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white dir-ltr text-right" value={fullNewPatientData.phone_number} onChange={e => setFullNewPatientData({...fullNewPatientData, phone_number: e.target.value})} /></div></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">سازمان بیمه‌گر</label><select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white" value={fullNewPatientData.insurance_id} onChange={e => setFullNewPatientData({...fullNewPatientData, insurance_id: e.target.value})}><option value="">آزاد (بدون بیمه)</option>{insurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">یادداشت و هشدار پزشک</label><textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white text-xs resize-none" rows={3} value={fullNewPatientData.notes} onChange={e => setFullNewPatientData({...fullNewPatientData, notes: e.target.value})} placeholder="مثلا: سابقه فشار خون یا حساسیت دارویی..." /></div>
                        <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all"><Check size={24} /> ثبت و انتخاب این بیمار</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
