import React, { useState } from 'react';
import { Siren, AlertTriangle, Clock, Users, ArrowLeft, CheckCircle2, X, AlertCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import { UrgentInsertionPreviewResult } from '../services/urgentInsertionService';

interface UrgentInsertionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  preview: UrgentInsertionPreviewResult | null;
  isLoading: boolean;
  isSubmitting: boolean;
  doctorName?: string;
  patientName?: string;
}

export const UrgentInsertionModal: React.FC<UrgentInsertionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading,
  isSubmitting,
  doctorName,
  patientName
}) => {
  const [overtimeAllowedOverride, setOvertimeAllowedOverride] = useState(false);

  if (!isOpen) return null;

  const canConfirm = preview
    ? !preview.exceedsWorkingHours || preview.isOvertimeAllowed || overtimeAllowedOverride
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border-2 border-red-200 dark:border-red-900/60 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-red-50/90 dark:bg-red-950/50 border-b border-red-100 dark:border-red-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500 text-white rounded-2xl shadow-md shadow-red-500/20 animate-pulse">
              <Siren size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-900 dark:text-red-200">
                پیش‌نمایش جابجایی نوبت‌های اورژانسی
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 font-medium mt-0.5">
                بررسی اثرات درج نوبت فوری بر سایر بیماران پزشک
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-red-100/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {isLoading || !preview ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black text-gray-500 dark:text-gray-400">
                در حال محاسبه دقیق جابجایی نوبت‌ها و استعلام جدول پزشک...
              </p>
            </div>
          ) : (
            <>
              {/* Doctor & Patient Context */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block text-[10px]">پزشک معالج</span>
                  <span className="font-extrabold text-gray-800 dark:text-white text-xs">{doctorName || 'پزشک انتخاب‌شده'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[10px]">بیمار مراجع</span>
                  <span className="font-extrabold text-gray-800 dark:text-white text-xs">{patientName || 'بیمار جدید/انتخابی'}</span>
                </div>
              </div>

              {/* Proposed Insertion Time */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="text-amber-600 dark:text-amber-400 shrink-0" size={22} />
                  <div>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">زمان پیشنهادی درج اورژانسی</p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">زودترین زمان ممکن در برنامه امروز</p>
                  </div>
                </div>
                <div className="bg-amber-600 text-white font-black text-lg px-4 py-1.5 rounded-xl shadow-md dir-ltr">
                  {preview.proposedTime}
                </div>
              </div>

              {/* Displaced Patients List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-2">
                    <Users size={16} className="text-red-500" />
                    لیست بیماران جابجاشده ({preview.totalDisplacedCount} بیمار)
                  </span>
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800">
                    تاخیر کل: {preview.expectedCumulativeDelayMinutes} دقیقه
                  </span>
                </div>

                {preview.totalDisplacedCount === 0 ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>هیچ نوبت دیگری نیاز به جابجایی ندارد و زمان درج کاملاً خالی است.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {preview.displacedPatients.map((dp, idx) => (
                      <div 
                        key={dp.appointmentUuid || idx}
                        className="p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-between text-xs shadow-sm hover:border-red-300 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-gray-800 dark:text-white">{dp.patientName}</p>
                          {dp.patientPhone && (
                            <p className="text-[10px] text-gray-400 font-bold">{dp.patientPhone}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-black dir-ltr">
                          <span className="text-gray-500 line-through bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                            {dp.currentScheduledTime}
                          </span>
                          <ArrowLeft size={14} className="text-red-500 shrink-0 rotate-180" />
                          <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800">
                            {dp.newScheduledTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Working Hours / Overtime Warning */}
              {preview.exceedsWorkingHours && (
                <div className="p-4 bg-red-100/80 dark:bg-red-950/60 rounded-2xl border-2 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black text-sm">هشدار: تجاوز از ساعات کاری پزشک</p>
                      <p className="text-xs leading-relaxed opacity-95">
                        {preview.warningMessage}
                      </p>
                    </div>
                  </div>

                  {!preview.isOvertimeAllowed && (
                    <div className="pt-2 border-t border-red-200 dark:border-red-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-red-700 dark:text-red-300">
                        اضافه‌کاری برای این پزشک مجاز تنظیم نشده است.
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-red-900 dark:text-red-100">
                        <input
                          type="checkbox"
                          checked={overtimeAllowedOverride}
                          onChange={(e) => setOvertimeAllowedOverride(e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>اجازه استثنایی اضافه کاری</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/3 py-3.5 px-4 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl border border-gray-200 dark:border-gray-600 text-xs transition-all text-center"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isLoading || isSubmitting}
            className={clsx(
              "w-2/3 py-3.5 px-4 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg",
              canConfirm && !isLoading && !isSubmitting
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 active:scale-[0.98]"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70"
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال ثبت و جابجایی نوبت‌ها...</span>
              </div>
            ) : (
              <>
                <Siren size={18} />
                <span>تایید و جابجایی نوبت‌ها</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
