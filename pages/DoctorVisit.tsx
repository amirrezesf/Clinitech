
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, FileText, Stethoscope, ClipboardList, 
  CheckCircle, Clock, AlertCircle, Phone, 
  ShieldCheck, History, Save, XCircle, ArrowRight,
  Layers, Calendar, ChevronLeft, Target, Activity,
  PenTool, Trash2, Type, Eye, Timer, Play, Pause, RotateCcw
} from 'lucide-react';
import { formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { HandwritingModal } from '../components/HandwritingModal';
import { HandwritingPreviewModal } from '../components/HandwritingPreviewModal';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const DoctorVisit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allAppointments, patients, updateAppointment, getReasonTitle } = useData();
  
  const currentAppointment = allAppointments.find(
    a => a.status === '3' && (user?.allowedDoctorIds?.includes(a.doctor_id))
  );

  const patient = currentAppointment ? patients.find(p => p.uuid === currentAppointment.patient_id) : null;

  const recurringSeries = useMemo(() => {
    if (!currentAppointment?.recurring_id) return null;
    return allAppointments
      .filter(a => a.recurring_id === currentAppointment.recurring_id)
      .sort((a, b) => new Date(a.for_date).getTime() - new Date(b.for_date).getTime());
  }, [currentAppointment, allAppointments]);

  const seriesProgress = useMemo(() => {
    if (!recurringSeries) return 0;
    const completed = recurringSeries.filter(a => a.status === '0').length;
    return Math.round((completed / recurringSeries.length) * 100);
  }, [recurringSeries]);

  const currentSessionIndex = useMemo(() => {
    if (!recurringSeries || !currentAppointment) return -1;
    return recurringSeries.findIndex(a => a.uuid === currentAppointment.uuid);
  }, [recurringSeries, currentAppointment]);

  // Stopwatch Logic (Manual Start/Stop)
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && currentAppointment && user?.settings?.showVisitStopwatch) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, currentAppointment, user?.settings?.showVisitStopwatch]);

  const formatStopwatch = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
      setIsTimerRunning(false);
      setSeconds(0);
  };

  // States for Text fields
  const [history, setHistory] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [actions, setActions] = useState('');

  // States for Drawing fields (Images)
  const [historyDraw, setHistoryDraw] = useState('');
  const [diagnosisDraw, setDiagnosisDraw] = useState('');
  const [actionsDraw, setActionsDraw] = useState('');

  // Modal Controllers
  const [isHandwritingOpen, setIsHandwritingOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeField, setActiveField] = useState<'history' | 'diagnosis' | 'actions' | null>(null);

  useEffect(() => {
    if (currentAppointment) {
      setHistory(currentAppointment.history || '');
      setDiagnosis(currentAppointment.diagnosis || '');
      setActions(currentAppointment.actions || '');
      setHistoryDraw(currentAppointment.history_draw || '');
      setDiagnosisDraw(currentAppointment.diagnosis_draw || '');
      setActionsDraw(currentAppointment.actions_draw || '');
    }
  }, [currentAppointment]);

  const handleFinishVisit = async () => {
    if (!currentAppointment) return;
    const loadingToast = toast.loading('در حال ثبت نهایی ویزیت...');
    await updateAppointment(currentAppointment.uuid, {
      status: '0',
      history,
      diagnosis,
      actions,
      history_draw: historyDraw,
      diagnosis_draw: diagnosisDraw,
      actions_draw: actionsDraw
    });
    setIsTimerRunning(false); // Stop timer on finish
    toast.success('ویزیت با موفقیت به پایان رسید.', { id: loadingToast });
    navigate('/today');
  };

  const handleSaveDraft = () => {
    if (!currentAppointment) return;
    updateAppointment(currentAppointment.uuid, { 
      history, diagnosis, actions, 
      history_draw: historyDraw, 
      diagnosis_draw: diagnosisDraw, 
      actions_draw: actionsDraw 
    });
    toast.success('پیش‌نویس ذخیره شد.');
  };

  const openHandwriting = (field: 'history' | 'diagnosis' | 'actions') => {
    setActiveField(field);
    setIsHandwritingOpen(true);
  };

  const openPreview = (field: 'history' | 'diagnosis' | 'actions') => {
    setActiveField(field);
    setIsPreviewOpen(true);
  };

  const handleHandwritingComplete = (data: string) => {
    if (activeField === 'history') setHistoryDraw(data);
    if (activeField === 'diagnosis') setDiagnosisDraw(data);
    if (activeField === 'actions') setActionsDraw(data);
  };

  const FieldRenderer = ({ title, icon: Icon, textValue, onTextChange, imageValue, onImageChange, fieldKey, color }: any) => (
    <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={clsx("flex items-center gap-2", color)}>
                <Icon size={18} className="shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white">{title}</h3>
            </div>
            <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => openHandwriting(fieldKey)} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 rounded-xl text-[11px] font-bold transition-all border border-primary-100 dark:border-primary-800 shadow-xs active:scale-95"
                >
                    <PenTool size={13} /> {imageValue ? 'ویرایش دست‌خط' : 'افزودن دست‌خط'}
                </button>
            </div>
        </div>
        
        {/* Handwriting Display Area (Top) */}
        {imageValue && (
            <div className="w-full p-2 bg-white dark:bg-gray-800 border-2 border-dashed border-primary-100 dark:border-primary-900/30 rounded-2xl sm:rounded-3xl overflow-hidden group relative animate-in slide-in-from-top-2 duration-300">
                <img 
                  src={imageValue} 
                  alt={title} 
                  className="w-full h-auto max-h-[220px] sm:max-h-[300px] object-contain rounded-xl sm:rounded-2xl cursor-pointer bg-slate-50 dark:bg-gray-900/40" 
                  onClick={() => openPreview(fieldKey)} 
                />
                
                {/* Floating control buttons: always visible on phones, hover on desktop */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all bg-black/40 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none p-1 sm:p-0 rounded-2xl z-10">
                    <button 
                      type="button"
                      onClick={() => openPreview(fieldKey)} 
                      className="p-2 bg-blue-600 text-white rounded-xl sm:rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                      title="مشاهده تمام‌صفحه"
                    >
                        <Eye size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => openHandwriting(fieldKey)} 
                      className="p-2 bg-amber-500 text-white rounded-xl sm:rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                      title="ویرایش مجدد"
                    >
                        <PenTool size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => onImageChange('')} 
                      className="p-2 bg-red-500 text-white rounded-xl sm:rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                      title="حذف دست‌خط"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-primary-600/90 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-widest pointer-events-none">
                  Digital Layer
                </div>
            </div>
        )}

        {/* Text Area (Always Visible at Bottom) */}
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 px-1 uppercase tracking-wider">
               <Type size={12} /> یادداشت‌های متنی و تجویز
            </div>
            <textarea 
                className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all min-h-[100px] sm:min-h-[120px] text-base sm:text-sm leading-relaxed"
                placeholder={`توضیحات متنی برای ${title}...`}
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
            />
        </div>
    </div>
  );

  if (!currentAppointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-5 animate-in fade-in">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-400 shadow-inner">
          <Stethoscope size={40} className="sm:w-12 sm:h-12" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">بیمار فعلی یافت نشد</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">در حال حاضر هیچ بیماری در وضعیت «در حال ویزیت» ندارید.</p>
        </div>
        <button 
          type="button"
          onClick={() => navigate('/today')} 
          className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-2xl font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 active:scale-95"
        >
          <ArrowRight size={18} />
          <span>مشاهده لیست نوبت‌ها</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-28 sm:pb-16 px-1 sm:px-0">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/today')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-all shadow-xs active:scale-95"
        >
          <ArrowRight size={15} />
          <span>بازگشت به نوبت‌های امروز</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>جلسه در حال ویزیت</span>
          </span>
        </div>
      </div>

      {/* Patient Card & Stopwatch */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-r-4 border-blue-500 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 shadow-sm">
        {/* Patient Identity */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full lg:w-auto">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <User className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white truncate">
              {patient?.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
              {patient?.phone_number && (
                <a 
                  href={`tel:${patient.phone_number}`}
                  className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-bold hover:text-primary-600 transition-colors bg-gray-100/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-lg"
                >
                  <Phone size={12} className="text-gray-400" />
                  <span className="dir-ltr">{patient.phone_number}</span>
                </a>
              )}
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-bold bg-gray-100/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-lg">
                <ShieldCheck size={12} className={patient?.insurance_id ? 'text-emerald-500' : 'text-gray-400'} />
                <span>بیمه: {patient?.insurance_id ? 'دارد' : 'آزاد'}</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Stopwatch & Session Details */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800">
            {/* Manual Stopwatch Section */}
            {user?.settings?.showVisitStopwatch && (
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="relative shrink-0">
                            <Timer className={clsx("transition-colors", isTimerRunning ? "text-blue-600 dark:text-blue-400 animate-pulse" : "text-gray-400")} size={22} />
                            {isTimerRunning && <div className="absolute inset-0 bg-blue-400 rounded-full blur-lg opacity-20 animate-ping" />}
                        </div>
                        <div className="min-w-[55px]">
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-tight leading-none mb-1">Time</p>
                            <p className={clsx(
                                "text-lg sm:text-xl font-black tabular-nums transition-colors leading-none",
                                isTimerRunning ? (seconds > 900 ? "text-red-500" : seconds > 600 ? "text-amber-500" : "text-blue-700 dark:text-blue-300") : "text-gray-400"
                            )}>
                                {formatStopwatch(seconds)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-1.5 sm:gap-2 border-r border-gray-100 dark:border-gray-700 pr-3 sm:pr-4">
                        <button 
                            type="button"
                            onClick={toggleTimer}
                            className={clsx(
                                "p-2 rounded-xl transition-all shadow-xs transform active:scale-95",
                                isTimerRunning ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                            )}
                            title={isTimerRunning ? "توقف تایمر" : "شروع تایمر"}
                            aria-label={isTimerRunning ? "توقف تایمر" : "شروع تایمر"}
                        >
                            {isTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                        <button 
                            type="button"
                            onClick={resetTimer}
                            className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-all transform active:scale-95"
                            title="ریست تایمر"
                            aria-label="ریست تایمر"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Visit Details (Start Time + Reasons) */}
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 text-right sm:text-left">
                <div className="flex items-center sm:items-end gap-1.5 sm:gap-0 sm:flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">زمان ورود:</span>
                  <span className="text-sm sm:text-base font-black text-gray-800 dark:text-gray-200 dir-ltr">{formatJalaliTime(new Date().toISOString())}</span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg max-w-[200px] sm:max-w-[260px] truncate">
                    علت: {currentAppointment.services.map(s => getReasonTitle(s.reason_id)).join('، ')}
                  </span>
                </div>
            </div>
        </div>
      </div>

      {/* Recurring Series Card */}
      {recurringSeries && (
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-primary-100 dark:border-primary-900/30 bg-gradient-to-l from-primary-50/20 to-transparent animate-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg shrink-0">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-gray-800 dark:text-white">دوره درمانی: {currentAppointment.recurring_title}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">جلسه {currentSessionIndex + 1} از {recurringSeries.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 pr-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs w-full sm:w-auto justify-between sm:justify-start">
                  <div className="text-left">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Progress</p>
                    <p className="text-xs sm:text-sm font-black text-primary-600">{seriesProgress}%</p>
                  </div>
                  <div className="flex-1 sm:w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${seriesProgress}%` }}></div>
                  </div>
                </div>
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
                {recurringSeries.map((session, idx) => {
                    const isPast = session.status === '0', isCurrent = session.uuid === currentAppointment.uuid;
                    return (
                        <div key={session.uuid} className={clsx("min-w-[160px] sm:min-w-[180px] p-3.5 sm:p-4 rounded-2xl border-2 transition-all relative flex flex-col gap-2 shrink-0", isCurrent ? "bg-white dark:bg-gray-800 border-primary-500 shadow-lg scale-100 sm:scale-105 z-10" : "bg-gray-50 dark:bg-gray-900 border-transparent opacity-60")}>
                            {isCurrent && <div className="absolute -top-2.5 right-3 bg-primary-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">جلسه جاری</div>}
                            <div className="flex items-center justify-between">
                              <span className={clsx("text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center", isPast ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : isCurrent ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500")}>
                                {idx + 1}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 dir-ltr">{formatJalaliDate(session.for_date).split(' ')[0]}</span>
                            </div>
                            <p className="text-xs font-black text-gray-700 dark:text-gray-200 truncate">{session.services.map(s => getReasonTitle(s.reason_id)).join('، ')}</p>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* Prominent Warnings & Allergies Banner on Mobile (if exists) */}
      {patient?.notes && (
        <div className="lg:hidden glass-card p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-xs">
          <h4 className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2 mb-2 text-xs sm:text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>هشدارها و حساسیت‌های بیمار</span>
          </h4>
          <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
            {patient.notes}
          </div>
        </div>
      )}

      {/* Main Grid: Form Fields and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] space-y-6 sm:space-y-10 shadow-sm">
                <FieldRenderer 
                    title="شرح حال و سوابق" 
                    icon={History} 
                    textValue={history} 
                    onTextChange={setHistory} 
                    imageValue={historyDraw}
                    onImageChange={setHistoryDraw}
                    fieldKey="history" 
                    color="text-amber-500" 
                />
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <FieldRenderer 
                    title="تشخیص نهایی (Diagnosis)" 
                    icon={Stethoscope} 
                    textValue={diagnosis} 
                    onTextChange={setDiagnosis} 
                    imageValue={diagnosisDraw}
                    onImageChange={setDiagnosisDraw}
                    fieldKey="diagnosis" 
                    color="text-red-500" 
                />
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <FieldRenderer 
                    title="اقدامات و دستورات" 
                    icon={ClipboardList} 
                    textValue={actions} 
                    onTextChange={setActions} 
                    imageValue={actionsDraw}
                    onImageChange={setActionsDraw}
                    fieldKey="actions" 
                    color="text-primary-600" 
                />
            </div>
        </div>

        {/* Sidebar Controls (Desktop & Tablet) */}
        <div className="space-y-4 sm:space-y-6">
            <div className="hidden lg:block glass-card p-6 rounded-3xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100">
                <h4 className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2 mb-4"><AlertCircle size={18} /> هشدارها و حساسیت‌ها</h4>
                <div className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">{patient?.notes || 'یادداشت خاصی برای این بیمار ثبت نشده است.'}</div>
            </div>

            <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 lg:sticky lg:top-24 shadow-sm">
                <h4 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white mb-2">عملیات پایان جلسه</h4>
                <button 
                  type="button"
                  onClick={handleSaveDraft} 
                  className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                >
                    <Save size={18} /> 
                    <span>ذخیره پیش‌نویس</span>
                </button>
                <button 
                  type="button"
                  onClick={handleFinishVisit} 
                  className="w-full py-3.5 sm:py-4 bg-primary-600 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 sm:gap-3 hover:bg-primary-700 shadow-xl shadow-primary-600/20 transform active:scale-[0.98] transition-all"
                >
                    <CheckCircle size={22} /> 
                    <span>پایان و ثبت ویزیت</span>
                </button>
            </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Dock (Easy thumb-reach) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-2.5 sm:p-3 shadow-2xl safe-area-pb">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button 
            type="button"
            onClick={handleSaveDraft}
            className="flex-1 py-2.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 border border-gray-200 dark:border-gray-700"
          >
            <Save size={15} />
            <span>پیش‌نویس</span>
          </button>
          <button 
            type="button"
            onClick={handleFinishVisit}
            className="flex-[1.8] py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 active:scale-95 transition-transform"
          >
            <CheckCircle size={18} />
            <span>پایان و ثبت ویزیت</span>
          </button>
        </div>
      </div>

      {/* Editing Modal */}
      <HandwritingModal 
        isOpen={isHandwritingOpen} 
        onClose={() => { setIsHandwritingOpen(false); setActiveField(null); }} 
        onComplete={handleHandwritingComplete}
        title={activeField === 'history' ? 'نوشتن شرح حال' : activeField === 'diagnosis' ? 'نوشتن تشخیص' : 'نوشتن دستورات'}
        initialImage={activeField === 'history' ? historyDraw : activeField === 'diagnosis' ? diagnosisDraw : actionsDraw}
      />

      {/* Pure Preview Modal */}
      <HandwritingPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setActiveField(null); }}
        imageData={activeField === 'history' ? historyDraw : activeField === 'diagnosis' ? diagnosisDraw : actionsDraw}
        title={activeField === 'history' ? 'شرح حال' : activeField === 'diagnosis' ? 'تشخیص' : 'دستورات'}
      />
    </div>
  );
};
