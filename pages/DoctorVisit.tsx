
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
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className={clsx("flex items-center gap-2", color)}>
                <Icon size={20} />
                <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
            </div>
            <div className="flex gap-2">
                <button onClick={() => openHandwriting(fieldKey)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-[10px] font-black transition-all border border-primary-100 shadow-sm">
                    <PenTool size={14} /> {imageValue ? 'ویرایش دست‌خط' : 'افزودن دست‌خط'}
                </button>
            </div>
        </div>
        
        {/* Handwriting Display Area (Top) */}
        {imageValue && (
            <div className="w-full p-2 bg-white dark:bg-gray-800 border-2 border-dashed border-primary-100 dark:border-primary-900/30 rounded-3xl overflow-hidden group relative animate-in slide-in-from-top-2 duration-300">
                <img src={imageValue} alt={title} className="w-full h-auto max-h-[300px] object-contain rounded-2xl cursor-pointer" onClick={() => openPreview(fieldKey)} />
                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <button 
                      onClick={() => openPreview(fieldKey)} 
                      className="p-2 bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="مشاهده تمام‌صفحه"
                    >
                        <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => openHandwriting(fieldKey)} 
                      className="p-2 bg-amber-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="ویرایش مجدد"
                    >
                        <PenTool size={16} />
                    </button>
                    <button 
                      onClick={() => onImageChange('')} 
                      className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="حذف دست‌خط"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="absolute bottom-4 right-4 bg-primary-600 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg opacity-80 uppercase tracking-widest">Digital Layer</div>
            </div>
        )}

        {/* Text Area (Always Visible at Bottom) */}
        <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 px-1 uppercase tracking-wider">
               <Type size={12} /> یادداشت‌های تایپی
            </div>
            <textarea 
                className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all min-h-[120px] text-sm leading-relaxed"
                placeholder={`توضیحات متنی برای ${title}...`}
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
            />
        </div>
    </div>
  );

  if (!currentAppointment) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 animate-in fade-in">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400"><Stethoscope size={48} /></div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">بیمار فعلی یافت نشد</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">در حال حاضر بیماری در وضعیت «در حال ویزیت» ندارید.</p>
        </div>
        <button onClick={() => navigate('/today')} className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"><ArrowRight size={20} className="rotate-180" /><span>مشاهده لیست نوبت‌ها</span></button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <div className="glass-card p-6 rounded-3xl border-r-4 border-blue-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><User size={32} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">{patient?.name}</h2>
            <div className="flex flex-wrap gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-500 font-bold"><Phone size={12}/> {patient?.phone_number}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500 font-bold"><ShieldCheck size={12}/> بیمه: {patient?.insurance_id ? 'دارد' : 'آزاد'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
            {/* Manual Stopwatch Section */}
            {user?.settings?.showVisitStopwatch && (
                <div className="flex items-center gap-4 px-5 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Timer className={clsx("transition-colors", isTimerRunning ? "text-blue-600 dark:text-blue-400 animate-pulse" : "text-gray-400")} size={24} />
                            {isTimerRunning && <div className="absolute inset-0 bg-blue-400 rounded-full blur-lg opacity-20 animate-ping" />}
                        </div>
                        <div className="min-w-[60px]">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Time Elapsed</p>
                            <p className={clsx(
                                "text-xl font-black tabular-nums transition-colors",
                                isTimerRunning ? (seconds > 900 ? "text-red-500" : seconds > 600 ? "text-amber-500" : "text-blue-700 dark:text-blue-300") : "text-gray-400"
                            )}>
                                {formatStopwatch(seconds)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 border-r border-gray-100 dark:border-gray-700 pr-4">
                        <button 
                            onClick={toggleTimer}
                            className={clsx(
                                "p-2 rounded-xl transition-all shadow-sm transform active:scale-95",
                                isTimerRunning ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            )}
                            title={isTimerRunning ? "توقف" : "شروع"}
                        >
                            {isTimerRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <button 
                            onClick={resetTimer}
                            className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-all transform active:scale-95"
                            title="ریست"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-end gap-2 text-left">
                <div className="dir-ltr"><p className="text-xs text-gray-400 font-bold uppercase">Start Time</p><p className="text-lg font-black text-gray-700 dark:text-gray-200">{formatJalaliTime(new Date().toISOString())}</p></div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">علت مراجعه: {currentAppointment.services.map(s => getReasonTitle(s.reason_id)).join(', ')}</span>
            </div>
        </div>
      </div>

      {recurringSeries && (
        <div className="glass-card p-6 rounded-3xl border border-primary-100 dark:border-primary-900/30 bg-gradient-to-l from-primary-50/20 to-transparent animate-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-lg"><Layers size={24} /></div><div><h3 className="font-black text-gray-800 dark:text-white">دوره درمانی: {currentAppointment.recurring_title}</h3><p className="text-xs text-gray-500 font-medium mt-0.5">جلسه {currentSessionIndex + 1} از {recurringSeries.length}</p></div></div>
                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 pr-4 rounded-2xl border border-gray-100 shadow-sm"><div className="text-left"><p className="text-[10px] font-bold text-gray-400 uppercase">Progress</p><p className="text-sm font-black text-primary-600">{seriesProgress}%</p></div><div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${seriesProgress}%` }}></div></div></div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {recurringSeries.map((session, idx) => {
                    const isPast = session.status === '0', isCurrent = session.uuid === currentAppointment.uuid;
                    return (
                        <div key={session.uuid} className={clsx("min-w-[180px] p-4 rounded-2xl border-2 transition-all relative flex flex-col gap-2", isCurrent ? "bg-white dark:bg-gray-800 border-primary-500 shadow-xl scale-105 z-10" : "bg-gray-50 dark:bg-gray-900 border-transparent opacity-60")}>
                            {isCurrent && <div className="absolute -top-3 right-4 bg-primary-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-bounce uppercase">Current</div>}
                            <div className="flex items-center justify-between"><span className={clsx("text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center", isPast ? "bg-green-100 text-green-600" : isCurrent ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500")}>{idx + 1}</span><span className="text-[10px] font-bold text-gray-400 dir-ltr">{formatJalaliDate(session.for_date).split(' ')[0]}</span></div>
                            <p className="text-xs font-black text-gray-700 dark:text-gray-200 truncate">{session.services.map(s => getReasonTitle(s.reason_id)).join('، ')}</p>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8 rounded-[2.5rem] space-y-10">
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

        <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100">
                <h4 className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2 mb-4"><AlertCircle size={18} /> هشدارها و حساسیت‌ها</h4>
                <div className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">{patient?.notes || 'یادداشت خاصی برای این بیمار ثبت نشده است.'}</div>
            </div>
            <div className="glass-card p-6 rounded-3xl space-y-4 sticky top-24">
                <h4 className="font-bold text-gray-800 dark:text-white mb-2">عملیات پایان جلسه</h4>
                <button onClick={handleSaveDraft} className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 text-gray-700 dark:text-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50">
                    <Save size={18} /> ذخیره پیش‌نویس
                </button>
                <button onClick={handleFinishVisit} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-primary-700 shadow-xl transform active:scale-[0.98]">
                    <CheckCircle size={24} /> پایان ویزیت
                </button>
            </div>
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
