import React, { useState, useMemo } from 'react';
import { 
  Clock, AlertTriangle, MessageSquare, 
  X, Check, ChevronLeft, UserCheck, CalendarClock, RotateCcw,
  PhoneCall, PhoneOff, Download, FileSpreadsheet, CheckCircle2,
  AlertCircle, ExternalLink, Phone
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Appointment, Doctor, Patient } from '../types';
import { formatJalaliTime } from '../utils/helpers';

interface DoctorDelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | undefined;
  appointments: Appointment[];
  patients?: Patient[];
  getPatientName: (id: string) => string;
  getReasonTitle: (id: string) => string;
  onApplyDelay: (config: {
    delayMinutes: number;
    reason: string;
    sendSms: boolean;
    protectPatients: boolean;
    shiftAppointments: boolean;
  }) => Promise<void>;
  currentDelayMinutes?: number;
  currentDelayReason?: string;
  onClearDelay?: () => Promise<void>;
}

const PRESET_DELAYS = [15, 20, 30, 45, 60, 90, 120];
const PRESET_REASONS = [
  'ترافیک سنگین شهری',
  'جراحی فوری / اورژانس بیمارستانی',
  'جلسه علمی دانشگاهی',
  'نقص فنی تجهیزات کلینیک',
  'مشکل شخصی ضروری'
];

// Helper to determine why a patient cannot receive SMS
function getSmsIneligibilityReason(patient?: Patient): string | null {
  if (!patient) return 'اطلاعات بیمار یافت نشد';
  
  if (patient.sms_blocked) {
    return 'مسدودی پیامک‌های خدماتی و تبلیغاتی (Blacklist مخابرات)';
  }
  if (patient.no_sms) {
    return 'درخواست بیمار مبنی بر عدم دریافت پیامک';
  }
  
  const rawPhone = (patient.phone_number || '').trim().replace(/\s+/g, '');
  if (!rawPhone || rawPhone.length < 8) {
    return 'فاقد شماره تماس معتبر';
  }
  
  // Check if phone number is a landline (e.g. starts with 021, 026, 031, 051, 071, 041, etc. or doesn't start with 09 / +989)
  const isMobile = /^(\+98|0)?9\d{9}$/.test(rawPhone);
  if (!isMobile) {
    return 'شماره تلفن ثابت (عدم پشتیبانی از پیامک)';
  }
  
  return null;
}

export const DoctorDelayModal: React.FC<DoctorDelayModalProps> = ({
  isOpen,
  onClose,
  doctor,
  appointments,
  patients = [],
  getPatientName,
  getReasonTitle,
  onApplyDelay,
  currentDelayMinutes = 0,
  currentDelayReason = '',
  onClearDelay
}) => {
  const [delayMinutes, setDelayMinutes] = useState<number>(currentDelayMinutes || 30);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [reason, setReason] = useState<string>(currentDelayReason || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Track manual calls checked off by secretary
  const [calledPatientIds, setCalledPatientIds] = useState<Record<string, boolean>>({});

  const activeDelayAmount = isCustom ? (parseInt(customMinutes, 10) || 0) : delayMinutes;

  // Filter pending / waiting appointments that will be affected
  const affectedAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const isFinished = apt.status === '0' || apt.status === 'finished';
      const isInVisit = apt.status === '3' || apt.status === 'in_visit';
      const isCancelled = apt.status === 'cancelled' || apt.status === 'absent' || apt.status === '2';
      return !isFinished && !isInVisit && !isCancelled;
    }).sort((a, b) => new Date(a.for_date).getTime() - new Date(b.for_date).getTime());
  }, [appointments]);

  // Preview shifted times
  const previewShifts = useMemo(() => {
    return affectedAppointments.map(apt => {
      const originalDate = new Date(apt.for_date);
      const newDate = new Date(originalDate.getTime() + activeDelayAmount * 60000);
      const patient = patients.find(p => p.uuid === apt.patient_id);
      const ineligibilityReason = getSmsIneligibilityReason(patient);

      return {
        uuid: apt.uuid,
        patientId: apt.patient_id,
        patientName: patient?.name || getPatientName(apt.patient_id),
        phoneNumber: patient?.phone_number || '-',
        patient,
        originalTime: formatJalaliTime(apt.for_date),
        newTime: formatJalaliTime(newDate),
        servicesCount: apt.services.length,
        status: apt.status,
        ineligibilityReason,
        needsManualCall: !!ineligibilityReason
      };
    });
  }, [affectedAppointments, activeDelayAmount, patients, getPatientName]);

  // List of patients requiring manual call
  const manualCallList = useMemo(() => {
    return previewShifts.filter(p => p.needsManualCall);
  }, [previewShifts]);

  if (!isOpen) return null;

  const toggleCalledStatus = (patientId: string) => {
    setCalledPatientIds(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  // Export manual calls to Excel / CSV
  const handleExportManualCallsToExcel = () => {
    if (manualCallList.length === 0) {
      toast.error('هیچ بیماری برای تماس دستی وجود ندارد.');
      return;
    }

    const docName = doctor?.name || 'پزشک';
    const effectiveReason = reason.trim() || 'تاخیر در ورود پزشک';

    const headers = [
      'ردیف',
      'نام و نام خانوادگی بیمار',
      'شماره تماس',
      'ساعت اولیه نوبت',
      'ساعت جدید نوبت',
      'میزان تاخیر (دقیقه)',
      'علت نیاز به تماس دستی',
      'وضعیت تماس تلفنی',
      'پزشک معالج',
      'علت تاخیر پزشک',
      'متن پیشنهادی مکالمه منشی'
    ];

    const rows = manualCallList.map((item, index) => {
      const isCalled = !!calledPatientIds[item.patientId];
      const callStatusText = isCalled ? 'تماس گرفته شد' : 'در انتظار تماس';
      const scriptText = `سلام، از مطب ${docName} تماس می‌گیرم. به اطلاع می‌رساند نوبت شما با ${activeDelayAmount} دقیقه تاخیر، به ساعت ${item.newTime} موکول شده است.`;

      return [
        index + 1,
        `"${item.patientName}"`,
        `"${item.phoneNumber}"`,
        `"${item.originalTime}"`,
        `"${item.newTime}"`,
        activeDelayAmount,
        `"${item.ineligibilityReason || 'عدم دریافت پیامک'}"`,
        `"${callStatusText}"`,
        `"${docName}"`,
        `"${effectiveReason}"`,
        `"${scriptText}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manual-calls-delay-${docName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`فایل اکسل شامل ${manualCallList.length} بیمار جهت تماس تلفنی صادر شد.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDelayAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onApplyDelay({
        delayMinutes: activeDelayAmount,
        reason: reason.trim() || 'تاخیر در ورود پزشک',
        sendSms: true,
        protectPatients: true,
        shiftAppointments: true
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPreset = (minutes: number) => {
    setIsCustom(false);
    setDelayMinutes(minutes);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <CalendarClock size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black">ثبت و اعلام تاخیر ورود پزشک</h3>
                <span className="px-2.5 py-0.5 bg-white/25 rounded-full text-[10px] font-bold">هوشمند و خودکار</span>
              </div>
              <p className="text-xs text-amber-100 font-bold mt-0.5">
                {doctor ? `پزشک: ${doctor.name} (${doctor.specialty})` : 'تنظیم برنامه روزانه پزشک'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-right scrollbar-thin">
          
          {/* Delay Presets */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Clock size={16} className="text-amber-500" />
              <span>مدت زمان تاخیر پزشک:</span>
            </label>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {PRESET_DELAYS.map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleSelectPreset(m)}
                  className={clsx(
                    "py-2.5 px-2 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-0.5",
                    !isCustom && delayMinutes === m
                      ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]"
                      : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <span className="text-sm font-black">{m}</span>
                  <span className="text-[10px] opacity-80 font-bold">دقیقه</span>
                </button>
              ))}
            </div>

            {/* Custom Minutes Input */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  isCustom 
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-700 dark:text-amber-300"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                )}
              >
                زمان دلخواه
              </button>

              {isCustom && (
                <div className="flex items-center gap-2 flex-1 animate-in fade-in">
                  <input
                    type="number"
                    min="5"
                    max="360"
                    placeholder="مثال: 40"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-32 p-2 bg-gray-50 dark:bg-gray-800 border border-amber-400 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none text-center font-mono"
                    autoFocus
                  />
                  <span className="text-xs font-bold text-gray-500">دقیقه تاخیر</span>
                </div>
              )}
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-700 dark:text-gray-200">
              علت تاخیر (جهت ثبت در لاگ و اطلاع‌رسانی):
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map(r => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border",
                    reason === r
                      ? "bg-amber-50 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300 shadow-xs"
                      : "bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="توضیحات تکمیلی یا علت تاخیر..."
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          {/* SECTION 1: PATIENTS REQUIRING MANUAL PHONE CALL (SMS Ineligible) */}
          <div className="bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-200 dark:border-rose-900/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-rose-200/60 dark:border-rose-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500 text-white rounded-lg shadow-xs">
                  <PhoneCall size={16} />
                </div>
                <div>
                  <span className="text-xs font-black text-rose-950 dark:text-rose-200">
                    بیماران نیازمند تماس تلفنی دستی (عدم دریافت پیامک)
                  </span>
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold block">
                    {manualCallList.length > 0
                      ? `${manualCallList.length} بیمار به دلیل شماره ثابت یا بلک‌لیست مخابرات پیامک دریافت نمی‌کنند.`
                      : 'تمام بیماران این بازه دارای شماره همراه معتبر بوده و پیامک خودکار دریافت خواهند کرد.'}
                  </span>
                </div>
              </div>

              {manualCallList.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportManualCallsToExcel}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-black border border-rose-300 dark:border-rose-800 shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                  title="دانلود لیست تماس‌های دستی به صورت فایل اکسل"
                >
                  <FileSpreadsheet size={15} className="text-rose-600 dark:text-rose-400" />
                  <span>خروجی اکسل تماس‌های دستی</span>
                </button>
              )}
            </div>

            {manualCallList.length === 0 ? (
              <div className="p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl text-center text-xs font-bold text-rose-700/80 dark:text-rose-300/80 flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>همه بیماران دارای شماره همراه فعال بوده و نیازی به تماس دستی نیست.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {manualCallList.map((item) => {
                  const isCalled = !!calledPatientIds[item.patientId];

                  return (
                    <div 
                      key={item.uuid} 
                      className={clsx(
                        "p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
                        isCalled
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 opacity-80"
                          : "bg-white dark:bg-gray-800/90 border-rose-200 dark:border-rose-900/60 shadow-xs"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={clsx("font-black", isCalled ? "line-through text-gray-500" : "text-gray-900 dark:text-white")}>
                            {item.patientName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            {item.ineligibilityReason}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                          <a 
                            href={`tel:${item.phoneNumber}`} 
                            className="text-rose-600 dark:text-rose-400 hover:underline font-mono dir-ltr font-black flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md"
                          >
                            <Phone size={11} />
                            <span>{item.phoneNumber}</span>
                          </a>
                          <span>•</span>
                          <span className="font-mono dir-ltr">
                            ساعت جدید: <b className="text-gray-800 dark:text-gray-200">{item.newTime}</b> (قبلی: <span className="line-through text-gray-400">{item.originalTime}</span>)
                          </span>
                        </div>
                      </div>

                      {/* Checklist / Action */}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => toggleCalledStatus(item.patientId)}
                          className={clsx(
                            "px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 active:scale-95",
                            isCalled
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200"
                          )}
                        >
                          {isCalled ? (
                            <>
                              <Check size={14} />
                              <span>تماس گرفته شد</span>
                            </>
                          ) : (
                            <>
                              <PhoneCall size={14} />
                              <span>ثبت تماس منشی</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: PREVIEW OF ALL AFFECTED APPOINTMENTS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <UserCheck size={15} className="text-amber-500" />
                <span>پیش‌نمایش کلیه نوبت‌های تحت‌تاثیر ({previewShifts.length} نوبت):</span>
              </span>
              {previewShifts.length > 0 && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                  انتقال خودکار نوبت‌ها +{activeDelayAmount} دقیقه
                </span>
              )}
            </div>

            {previewShifts.length === 0 ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-center text-xs text-gray-400">
                هیچ نوبت باز یا در انتظاری برای جابجایی وجود ندارد.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs scrollbar-thin">
                {previewShifts.map((item, idx) => (
                  <div key={item.uuid} className="p-2.5 px-3 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-extrabold text-gray-800 dark:text-white">{item.patientName}</span>
                      {item.needsManualCall && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold">
                          تماس تلفنی
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono dir-ltr">
                      <span className="text-gray-400 line-through text-[11px]">{item.originalTime}</span>
                      <ChevronLeft size={14} className="text-amber-500 rotate-180" />
                      <span className="font-black text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60 shadow-xs">
                        {item.newTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting || activeDelayAmount <= 0}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              <Check size={18} />
              <span>{isSubmitting ? 'در حال اعمال و تنظیم خودکار صف...' : `اعمال تاخیر ${activeDelayAmount} دقیقه‌ای و هماهنگی صف`}</span>
            </button>

            {currentDelayMinutes > 0 && onClearDelay && (
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await onClearDelay();
                    onClose();
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="py-3.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 rounded-2xl font-bold text-xs border border-red-200 dark:border-red-900 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={16} />
                <span>لغو تاخیر (ورود پزشک)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-3.5 px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs transition-all"
            >
              انصراف
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
