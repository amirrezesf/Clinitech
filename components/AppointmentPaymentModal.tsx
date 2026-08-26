import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, CreditCard, DollarSign, Smartphone, FileText, 
  Printer, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight,
  Receipt, Plus, Trash2, Calendar, User, Phone, Hash, Tag,
  Clock, Stethoscope, ChevronDown, CheckCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Appointment, Doctor, Patient, AppointmentReason, Payment, Insurance } from '../types';
import { formatCurrency, formatJalaliDate, formatJalaliTime } from '../utils/helpers';

interface AppointmentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctor: Doctor | undefined;
  patient: Patient | undefined;
  insurance: Insurance | undefined;
  allReasons: AppointmentReason[];
  existingPayments: Payment[];
  onAddPayment: (payment: Payment) => Promise<void> | void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment['status']) => Promise<void> | void;
  getReasonTitle: (id: string) => string;
}

type PaymentMethod = 'pos' | 'cash' | 'card_to_card' | 'debt' | 'insurance';

export const AppointmentPaymentModal: React.FC<AppointmentPaymentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  doctor,
  patient,
  insurance,
  allReasons,
  existingPayments,
  onAddPayment,
  onUpdateAppointmentStatus,
  getReasonTitle
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pos');
  const [payAmount, setPayAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [autoFinishVisit, setAutoFinishVisit] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPrintView, setShowPrintView] = useState<boolean>(false);
  const [lastSavedPayment, setLastSavedPayment] = useState<Payment | null>(null);

  // Financial calculations
  const totalServiceGrossPrice = useMemo(() => {
    if (!appointment) return 0;
    return appointment.services.reduce((sum, item) => {
      const r = allReasons.find(reason => reason.uuid === item.reason_id);
      return sum + (r ? r.price * (item.quantity || 1) : 0);
    }, 0);
  }, [appointment, allReasons]);

  const alreadyPaidAmount = useMemo(() => {
    return existingPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [existingPayments]);

  const alreadyGivenDiscount = useMemo(() => {
    const fromPayments = existingPayments.reduce((sum, p) => sum + (p.discount || 0), 0);
    const fromApt = appointment?.discount || 0;
    return fromPayments + fromApt;
  }, [existingPayments, appointment]);

  const currentDiscountNum = parseFloat(discountAmount) || 0;
  const currentPayNum = parseFloat(payAmount) || 0;

  const totalDiscount = alreadyGivenDiscount + currentDiscountNum;
  const netPayable = Math.max(0, totalServiceGrossPrice - totalDiscount);
  const remainingBeforeNewPay = Math.max(0, netPayable - alreadyPaidAmount);
  const remainingAfterNewPay = Math.max(0, remainingBeforeNewPay - currentPayNum);

  const isFullySettled = remainingBeforeNewPay <= 0;

  // Initialize form when appointment changes
  useEffect(() => {
    if (appointment && isOpen) {
      const rem = Math.max(0, totalServiceGrossPrice - alreadyGivenDiscount - alreadyPaidAmount);
      setPayAmount(rem > 0 ? rem.toString() : '0');
      setDiscountAmount('0');
      setReferenceNumber('');
      setDescription('');
      setPaymentMethod('pos');
      setShowPrintView(false);
      setLastSavedPayment(null);
      // Auto finish visit if currently in_visit or present
      setAutoFinishVisit(appointment.status === '3' || appointment.status === 'in_visit' || appointment.status === '4' || appointment.status === 'present');
    }
  }, [appointment, isOpen, totalServiceGrossPrice, alreadyGivenDiscount, alreadyPaidAmount]);

  if (!isOpen || !appointment || !patient) return null;

  const handleApplyFullSettlement = () => {
    setPayAmount(remainingBeforeNewPay.toString());
    setDiscountAmount('0');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPayNum <= 0 && currentDiscountNum <= 0 && remainingBeforeNewPay > 0 && paymentMethod !== 'debt') {
      toast.error('لطفاً مبلغ پرداختی یا تخفیف معتبر وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isDebt = paymentMethod === 'debt';
      const actualPaid = isDebt ? 0 : currentPayNum;
      
      const newPayment: Payment = {
        uuid: `pay-${Date.now()}`,
        patient_id: patient.uuid,
        doctor_id: appointment.doctor_id,
        appointment_uuid: appointment.uuid,
        amount: actualPaid,
        discount: currentDiscountNum,
        date: new Date().toISOString(),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        description: description.trim() || (isDebt ? 'ثبت مانده به عنوان بدهی معوق' : `تسویه نوبت ${patient.name}`)
      };

      await onAddPayment(newPayment);
      setLastSavedPayment(newPayment);

      // If user opted to complete the visit
      if (autoFinishVisit && onUpdateAppointmentStatus && (appointment.status !== '0' && appointment.status !== 'finished')) {
        await onUpdateAppointmentStatus(appointment.uuid, '0');
      }

      toast.success(
        actualPaid > 0 
          ? `پرداخت مبلغ ${formatCurrency(actualPaid)} با موفقیت ثبت شد.`
          : 'وضعیت تسویه و تخفیف با موفقیت بروزرسانی شد.'
      );

      // Close modal after brief confirmation
      setTimeout(() => {
        onClose();
      }, 600);

    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('خطا در ثبت پرداخت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <Receipt size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black">تسویه حساب و صدور فاکتور نوبت</h3>
                <span className="px-2.5 py-0.5 bg-white/25 rounded-full text-[10px] font-bold">
                  اتصال مستقیم به پرونده
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-bold mt-0.5">
                {patient.name} • نوبت ساعت {formatJalaliTime(appointment.for_date)} ({formatJalaliDate(appointment.for_date)})
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-right scrollbar-thin">
          
          {/* Patient & Doctor Card */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-center font-black">
                <User size={20} />
              </div>
              <div>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white block">{patient.name}</span>
                <span className="text-[11px] text-gray-500 font-mono dir-ltr">
                  {patient.phone_number || 'بدون شماره تماس'} {patient.id_number && `• کدملی: ${patient.id_number}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              {doctor && (
                <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                  <span className="text-[10px] text-gray-400 block font-bold">پزشک معالج</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{doctor.name}</span>
                </div>
              )}
              {insurance && (
                <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                  <span className="text-[10px] text-gray-400 block font-bold">بیمه طرف قرارداد</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{insurance.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown of Services */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <Stethoscope size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>ریز خدمات درمانی ارائه شده:</span>
              </label>
              <span className="text-[11px] font-bold text-gray-400">
                {appointment.services.length} خدمت ثبت‌شده
              </span>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800/40 text-xs">
              {appointment.services.map((item, idx) => {
                const serviceInfo = allReasons.find(r => r.uuid === item.reason_id);
                const unitPrice = serviceInfo?.price || 0;
                const totalItemPrice = unitPrice * (item.quantity || 1);

                return (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-extrabold text-gray-800 dark:text-white">
                        {serviceInfo?.title || getReasonTitle(item.reason_id)}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {item.quantity} عدد
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-left dir-ltr">
                      <span className="font-black text-gray-900 dark:text-white">
                        {formatCurrency(totalItemPrice)}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] text-gray-400 block">
                          فی: {formatCurrency(unitPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlement Status / Calculation Box */}
          <div className="bg-gradient-to-br from-gray-50 to-emerald-50/40 dark:from-gray-800/80 dark:to-emerald-950/20 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 block">مبلغ کل خدمات</span>
                <span className="font-black text-xs text-gray-900 dark:text-white font-mono mt-0.5 block">
                  {formatCurrency(totalServiceGrossPrice)}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">تخفیف اعمال‌شده</span>
                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                  {formatCurrency(totalDiscount)}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">پرداختی‌های قبلی</span>
                <span className="font-black text-xs text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                  {formatCurrency(alreadyPaidAmount)}
                </span>
              </div>

              <div className={clsx(
                "p-2.5 rounded-xl border shadow-xs",
                remainingBeforeNewPay <= 0
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900"
              )}>
                <span className={clsx("text-[10px] font-bold block", remainingBeforeNewPay <= 0 ? "text-emerald-100" : "text-rose-600 dark:text-rose-400")}>
                  {remainingBeforeNewPay <= 0 ? 'وضعیت تسویه' : 'مانده قابل پرداخت'}
                </span>
                <span className="font-black text-xs font-mono mt-0.5 block">
                  {remainingBeforeNewPay <= 0 ? 'تسویه کامل ✓' : formatCurrency(remainingBeforeNewPay)}
                </span>
              </div>
            </div>

            {existingPayments.length > 0 && (
              <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-[11px] text-gray-500">
                <span>تعداد پرداختی‌های ثبت‌شده قبلی برای این نوبت:</span>
                <span className="font-bold font-mono text-gray-700 dark:text-gray-300">
                  {existingPayments.length} تراکنش ({formatCurrency(alreadyPaidAmount)})
                </span>
              </div>
            )}
          </div>

          {/* Form for New Payment (if not settled or user wants to add/adjust) */}
          <div className="space-y-4">
            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                روش پرداخت / تسویه:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pos')}
                  className={clsx(
                    "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                    paymentMethod === 'pos'
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                      : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <CreditCard size={18} />
                  <span>کارت‌خوان (POS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={clsx(
                    "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                    paymentMethod === 'cash'
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                      : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <DollarSign size={18} />
                  <span>نقدی</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_to_card')}
                  className={clsx(
                    "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                    paymentMethod === 'card_to_card'
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                      : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <Smartphone size={18} />
                  <span>کارت به کارت</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('debt')}
                  className={clsx(
                    "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                    paymentMethod === 'debt'
                      ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20 scale-[1.02]"
                      : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <FileText size={18} />
                  <span>بدهی / نسیه</span>
                </button>
              </div>
            </div>

            {/* Amount & Discount Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    مبلغ دریافتی (تومان):
                  </label>
                  {remainingBeforeNewPay > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyFullSettlement}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      تسویه کل مانده ({formatCurrency(remainingBeforeNewPay)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="مبلغ پرداختی..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                  تخفیف ویژه / کسورات (تومان):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="مبلغ تخفیف..."
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                />
              </div>
            </div>

            {/* Reference Number / Transaction ID (for POS or Card to Card) */}
            {(paymentMethod === 'pos' || paymentMethod === 'card_to_card') && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                  شماره پیگیری / شماره ارجاع فیش (RRN):
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="مثال: 849201948271"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                یادداشت یا توضیحات مالی:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات اختیاری (مثلاً تخفیف با هماهنگی پزشک)..."
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Auto-mark Appointment as Finished Option */}
            {(appointment.status !== '0' && appointment.status !== 'finished') && (
              <label className="flex items-center gap-2 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoFinishVisit}
                  onChange={(e) => setAutoFinishVisit(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                  تغییر همزمان وضعیت نوبت به «پایان یافته» و خروج بیمار از صف ویزیت
                </span>
              </label>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              <CheckCheck size={18} />
              <span>
                {isSubmitting 
                  ? 'در حال ثبت...' 
                  : remainingAfterNewPay <= 0 && currentPayNum > 0
                    ? `ثبت تسویه کامل (${formatCurrency(currentPayNum)})`
                    : currentPayNum > 0
                      ? `ثبت پرداخت ${formatCurrency(currentPayNum)} (مانده: ${formatCurrency(remainingAfterNewPay)})`
                      : 'ثبت و بروزرسانی وضعیت مالی'}
              </span>
            </button>

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
