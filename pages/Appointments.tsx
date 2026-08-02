
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatJalaliDate, formatJalaliTime, statusLabels, formatCurrency } from '../utils/helpers';
import { 
  Search, Plus, ChevronRight, ChevronLeft, Tag, PlayCircle, CheckCircle, 
  XCircle, Download, Clock, Square, CheckSquare, MinusSquare, Trash2,
  CalendarDays, ArrowRightLeft, X, Zap, RefreshCw, AlertTriangle, UserCheck, UserX
} from 'lucide-react';
import { Appointment } from '../types';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const Appointments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    allAppointments,
    allReasons, 
    doctors,
    getPatientName, 
    getReasonTitle, 
    updateAppointment, 
  } = useData();

  const isDoctor = user?.role === 'doctor';
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState(new DateObject({ calendar: persian, locale: persian_fa }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal State for Delay
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(30);

  const filteredAppointments = useMemo(() => {
    const dateStr = selectedDay.toDate().toISOString().split('T')[0];
    return allAppointments.filter(apt => {
        if (user?.allowedDoctorIds && !user.allowedDoctorIds.includes(apt.doctor_id)) return false;
        const patientName = getPatientName(apt.patient_id);
        const matchesSearch = patientName.includes(search);
        const matchesDate = apt.for_date.startsWith(dateStr);
        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(a.for_date).getTime() - new Date(b.for_date).getTime());
  }, [allAppointments, search, selectedDay, user, getPatientName]);

  const handleStartVisit = async (uuid: string) => {
    await updateAppointment(uuid, { status: '3' });
    toast.success('ویزیت شروع شد.');
    navigate('/doctor/visit');
  };

  const handlePresence = async (uuid: string) => {
    await updateAppointment(uuid, { status: '4' });
    toast.success('حضور بیمار ثبت شد.');
  };

  const handleAbsence = async (uuid: string) => {
    await updateAppointment(uuid, { status: '2' });
    toast.error('غیبت بیمار ثبت شد.');
  };

  // --- Selection Logic ---
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAppointments.length) setSelectedIds([]);
    else setSelectedIds(filteredAppointments.map(a => a.uuid));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- Bulk Actions ---
  const handleBulkExport = () => {
    const dataToExport = filteredAppointments.filter(a => selectedIds.includes(a.uuid));
    const headers = ['نام بیمار', 'ساعت', 'خدمات', 'وضعیت', 'پزشک'];
    const csvContent = [
        headers.join(','), 
        ...dataToExport.map(a => {
            const pName = getPatientName(a.patient_id);
            const time = formatJalaliTime(a.for_date);
            const services = a.services.map(s => getReasonTitle(s.reason_id)).join(' | ');
            const status = statusLabels[a.status].label;
            const doc = doctors.find(d => d.id === a.doctor_id)?.name || '-';
            return `"${pName}","${time}","${services}","${status}","${doc}"`;
        })
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-${selectedDay.format('YYYY-MM-DD')}.csv`;
    link.click();
    toast.success(`${selectedIds.length} نوبت صادر شد.`);
    setSelectedIds([]);
  };

  const handleBulkStatus = async (status: '0' | '2') => {
      const msg = status === '0' ? 'اتمام ویزیت' : 'عدم حضور';
      const toastId = toast.loading(`در حال بروزرسانی وضعیت ${selectedIds.length} نوبت...`);
      
      for (const id of selectedIds) {
          await updateAppointment(id, { status });
      }
      
      toast.success(`${selectedIds.length} نوبت با موفقیت به وضعیت "${msg}" تغییر یافت.`, { id: toastId });
      setSelectedIds([]);
  };

  const handleApplyDelay = async () => {
      const toastId = toast.loading(`در حال تعویق انداختن ${selectedIds.length} نوبت به مدت ${delayMinutes} دقیقه...`);
      
      for (const id of selectedIds) {
          const apt = allAppointments.find(a => a.uuid === id);
          if (apt) {
              const currentDate = new Date(apt.for_date);
              const newDate = new Date(currentDate.getTime() + delayMinutes * 60000);
              await updateAppointment(id, { for_date: newDate.toISOString() });
          }
      }

      toast.success(`نوبت‌های انتخاب شده با موفقیت ${delayMinutes} دقیقه جابجا شدند.`, { id: toastId });
      setIsDelayModalOpen(false);
      setSelectedIds([]);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">نوبت‌های امروز</h2></div>
        <div className="flex gap-2">
            <button onClick={() => navigate('/appointment/new')} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold hover:bg-primary-700 transition-all"><Plus size={20} />نوبت جدید</button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl flex gap-4 items-center bg-white/80 dark:bg-gray-800/80">
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button onClick={() => setSelectedDay(new DateObject(selectedDay).subtract(1, 'day'))} className="p-2 text-gray-500 hover:text-primary-600 transition-colors"><ChevronRight size={20} /></button>
                <button onClick={() => setSelectedDay(new DateObject({ calendar: persian, locale: persian_fa }))} className="px-3 py-1 bg-white dark:bg-gray-700 dark:text-white rounded shadow text-sm font-bold">امروز</button>
                <span className="px-4 text-sm font-bold dark:text-gray-200">{selectedDay.format('dddd D MMMM')}</span>
                <button onClick={() => setSelectedDay(new DateObject(selectedDay).add(1, 'day'))} className="p-2 text-gray-500 hover:text-primary-600 transition-colors"><ChevronLeft size={20} /></button>
            </div>
            <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="جستجوی بیمار..." className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm focus:border-primary-500 transition-colors" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
      </div>

      <div className="glass-card rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
            <tr>
              <th className="px-4 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-primary-600 flex items-center justify-center mx-auto">
                    {selectedIds.length === filteredAppointments.length && filteredAppointments.length > 0 ? <CheckSquare size={20}/> : selectedIds.length > 0 ? <MinusSquare size={20}/> : <Square size={20} className="text-gray-300" />}
                </button>
              </th>
              <th className="px-6 py-4 font-black">بیمار</th>
              <th className="px-6 py-4 text-center font-black">ساعت</th>
              <th className="px-6 py-4 font-black">خدمات (تعداد)</th>
              <th className="px-6 py-4 font-black">وضعیت حضور</th>
              <th className="px-6 py-4 text-center font-black">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredAppointments.length > 0 ? filteredAppointments.map((apt) => (
              <tr key={apt.uuid} className={clsx("hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group", apt.status === '3' && "bg-blue-50 dark:bg-blue-900/20", selectedIds.includes(apt.uuid) && "bg-primary-50/30 dark:bg-primary-900/10")}>
                <td className="px-4 py-4 text-center">
                    <button onClick={() => toggleSelect(apt.uuid)} className={clsx("transition-colors", selectedIds.includes(apt.uuid) ? "text-primary-600" : "text-gray-300 hover:text-primary-400")}>
                        {selectedIds.includes(apt.uuid) ? <CheckSquare size={20}/> : <Square size={20}/>}
                    </button>
                </td>
                <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{getPatientName(apt.patient_id)}</td>
                <td className="px-6 py-4 text-center font-black text-gray-700 dark:text-gray-300">{formatJalaliTime(apt.for_date)}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {apt.services.map(s => (
                      <span key={s.reason_id} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 dark:border-blue-800 whitespace-nowrap">
                        {getReasonTitle(s.reason_id)} {s.quantity > 1 && `(×${s.quantity})`}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx("px-3 py-1 rounded-full text-[10px] font-black border", statusLabels[apt.status].color)}>
                    {statusLabels[apt.status].label}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* ثبت حضور - فقط برای موارد در انتظار */}
                        {apt.status === '1' && (
                            <button onClick={() => handlePresence(apt.uuid)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all shadow-sm border border-emerald-100" title="ثبت حضور در مطب">
                                <UserCheck size={18} />
                            </button>
                        )}
                        
                        {/* شروع ویزیت - فقط برای موارد حاضر شده و توسط پزشک */}
                        {apt.status === '4' && isDoctor && (
                            <button onClick={() => handleStartVisit(apt.uuid)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-blue-700 transition-all">
                                <PlayCircle size={14} /> شروع ویزیت
                            </button>
                        )}

                        {/* ثبت غیبت - برای نوبت‌هایی که هنوز ویزیت نشدند */}
                        {(apt.status === '1' || apt.status === '4') && (
                            <button onClick={() => handleAbsence(apt.uuid)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all shadow-sm border border-red-100" title="ثبت غیبت">
                                <UserX size={18} />
                            </button>
                        )}

                        {/* پایان سریع - برای موارد در حال ویزیت یا حاضر */}
                        {(apt.status === '3' || apt.status === '4') && (
                            <button onClick={() => updateAppointment(apt.uuid, { status: '0' })} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200" title="اتمام ویزیت">
                                <CheckCircle size={18} />
                            </button>
                        )}
                    </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-600 font-bold italic">نوبتی برای این تاریخ یافت نشد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- BULK ACTION FOOTER --- */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-800 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom-10 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                  <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary-500/20">{selectedIds.length}</div>
                  <div>
                    <span className="text-sm font-black block">نوبت انتخاب شده</span>
                    <span className="text-[10px] opacity-50 font-bold">آماده عملیات گروهی</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setIsDelayModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/20"><Clock size={16} /> تعویق زمانی</button>
                  <button onClick={handleBulkExport} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/20"><Download size={16} /> خروجی اکسل</button>
                  <div className="h-8 w-px bg-white/10 mx-2"></div>
                  <button onClick={() => handleBulkStatus('0')} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-500/20"><CheckCircle size={16} /> اتمام گروهی</button>
                  <button onClick={() => handleBulkStatus('2')} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-red-500/20"><XCircle size={16} /> ثبت غیبت</button>
                  <button onClick={() => setSelectedIds([])} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>
          </div>
      )}

      {/* --- DELAY MODAL --- */}
      {isDelayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="bg-amber-500 p-6 text-white text-center relative">
                      <Clock size={40} className="mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-black">تعویق زمانی هوشمند</h3>
                      <p className="text-xs opacity-80 mt-1">زمان شروع {selectedIds.length} نوبت را به تاخیر بیندازید.</p>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-4">
                          <p className="text-sm font-bold text-gray-500 text-center">میزان تاخیر را انتخاب کنید:</p>
                          <div className="grid grid-cols-3 gap-3">
                              {[15, 30, 45, 60, 90, 120].map(m => (
                                  <button 
                                    key={m} 
                                    onClick={() => setDelayMinutes(m)}
                                    className={clsx(
                                        "py-3 rounded-2xl border-2 font-black text-sm transition-all",
                                        delayMinutes === m 
                                            ? "bg-amber-50 border-amber-500 text-amber-600 shadow-inner" 
                                            : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-500"
                                    )}
                                  >
                                      {m} دقیقه
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                          <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                          <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                              توجه: این عمل زمان نوبت‌ها را در دیتابیس جابجا می‌کند. پیشنهاد می‌شود پس از انجام، پیامک اطلاع‌رسانی برای بیماران ارسال گردد.
                          </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button onClick={handleApplyDelay} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"><Zap size={20} /> اعمال جابجایی</button>
                          <button onClick={() => setIsDelayModalOpen(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all">انصراف</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
