import React from 'react';
import { Siren, Clock, Users, ArrowLeft, CheckCircle2, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { UrgentInsertionPreviewResult } from '../services/urgentInsertionService';

interface UrgentInsertionInlinePreviewProps {
  preview: UrgentInsertionPreviewResult | null;
  isLoading: boolean;
  hasRequiredSelections: boolean;
  overtimeAllowedOverride: boolean;
  onToggleOvertimeOverride: (allowed: boolean) => void;
}

export const UrgentInsertionInlinePreview: React.FC<UrgentInsertionInlinePreviewProps> = ({
  preview,
  isLoading,
  hasRequiredSelections,
  overtimeAllowedOverride,
  onToggleOvertimeOverride
}) => {
  if (!hasRequiredSelections) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center gap-3">
        <AlertCircle size={18} className="text-gray-400 shrink-0" />
        <span>جهت محاسبه هوشمند جابجایی نوبت‌ها، لطفاً پزشک، پرونده بیمار و حداقل یک خدمت را انتخاب نمایید.</span>
      </div>
    );
  }

  if (isLoading || !preview) {
    return (
      <div className="p-6 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200/80 dark:border-red-900/40 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-black text-red-800 dark:text-red-300 flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          در حال محاسبه جابجایی نوبت‌ها و استعلام زمان خالی جدول پزشک...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5 bg-gradient-to-br from-red-50/80 to-amber-50/50 dark:from-red-950/30 dark:to-amber-950/20 rounded-3xl border-2 border-red-200 dark:border-red-900/60 shadow-sm animate-in fade-in duration-200">
      {/* Top Banner: Proposed Earliest Time */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500 text-white rounded-xl shadow-md shadow-red-500/20">
            <Siren size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-wider block">محاسبه خودکار زمان درج</span>
            <h4 className="text-xs font-black text-gray-800 dark:text-white mt-0.5">زودترین زمان ممکن جهت ویزیت اورژانسی</h4>
          </div>
        </div>

        <div className="bg-red-600 text-white font-black text-lg px-4 py-1.5 rounded-xl shadow-md dir-ltr self-end sm:self-auto">
          {preview.proposedTime}
        </div>
      </div>

      {/* Displaced Summary & Patients */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1.5">
            <Users size={16} className="text-red-500" />
            بیماران نیازمند جابجایی ({preview.totalDisplacedCount} بیمار)
          </span>
          <span className="text-[11px] font-extrabold text-red-700 dark:text-red-300 bg-red-100/80 dark:bg-red-900/50 px-2.5 py-0.5 rounded-lg border border-red-200 dark:border-red-800">
            مجموع تاخیر: {preview.expectedCumulativeDelayMinutes} دقیقه
          </span>
        </div>

        {preview.totalDisplacedCount === 0 ? (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>هیچ نوبت دیگری جابجا نخواهد شد (زمان درج کاملاً خالی است).</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {preview.displacedPatients.map((dp, idx) => (
              <div 
                key={dp.appointmentUuid || idx}
                className="p-3 bg-white dark:bg-gray-800 border border-red-100 dark:border-gray-700 rounded-2xl flex items-center justify-between text-xs shadow-xs hover:border-red-300 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="font-extrabold text-gray-800 dark:text-white">{dp.patientName}</p>
                  {dp.patientPhone && (
                    <p className="text-[10px] text-gray-400 font-bold">{dp.patientPhone}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-black dir-ltr">
                  <span className="text-gray-400 line-through bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                    {dp.currentScheduledTime}
                  </span>
                  <ArrowLeft size={14} className="text-red-500 shrink-0 rotate-180" />
                  <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800">
                    {dp.newScheduledTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overtime & Working Hours Warning */}
      {preview.exceedsWorkingHours && (
        <div className="p-3.5 bg-red-100/90 dark:bg-red-950/80 rounded-2xl border-2 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-xs">هشدار: تجاوز از شیفت کاری پزشک</p>
              <p className="text-[11px] leading-relaxed opacity-95">
                {preview.warningMessage}
              </p>
            </div>
          </div>

          {!preview.isOvertimeAllowed && (
            <div className="pt-2 border-t border-red-200 dark:border-red-800/80 flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-800 dark:text-red-300">
                اضافه‌کاری پزشک فعال نیست.
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-red-900 dark:text-red-100">
                <input
                  type="checkbox"
                  checked={overtimeAllowedOverride}
                  onChange={(e) => onToggleOvertimeOverride(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>اجازه استثنایی اضافه کاری</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
