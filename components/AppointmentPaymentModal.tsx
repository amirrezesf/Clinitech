import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, CreditCard, DollarSign, Smartphone, FileText, 
  Printer, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight,
  Receipt, Plus, Trash2, Calendar, User, Phone, Hash, Tag,
  Clock, Stethoscope, ChevronDown, CheckCheck, CalendarDays,
  Layers, Sparkles, Calculator, AlertTriangle, Info
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Appointment, Doctor, Patient, AppointmentReason, Payment, Insurance, Installment } from '../types';
import { formatCurrency, formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { PersianDatePicker } from './PersianDatePicker';
import { useData } from '../context/DataContext';

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
  onAddInstallment?: (installment: Installment) => Promise<void> | void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment['status']) => Promise<void> | void;
  getReasonTitle: (id: string) => string;
}

type SettlementMode = 'immediate' | 'pay_later' | 'installments';
type ImmediatePaymentMethod = 'pos' | 'cash' | 'card_to_card';
type InstallmentInterval = '15_days' | '1_month' | '45_days' | '2_months';

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
  onAddInstallment,
  onUpdateAppointmentStatus,
  getReasonTitle
}) => {
  const { addInstallment: contextAddInstallment } = useData();

  // Mode Selection: immediate payment, pay at another time (promise date), or installment plan
  const [settlementMode, setSettlementMode] = useState<SettlementMode>('immediate');

  // Immediate payment fields
  const [immediateMethod, setImmediateMethod] = useState<ImmediatePaymentMethod>('pos');
  const [payAmount, setPayAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [autoFinishVisit, setAutoFinishVisit] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Pay Later (Promise to pay / Deferred) fields
  const [payLaterDownPayment, setPayLaterDownPayment] = useState<string>('0');
  const [payLaterDownPaymentMethod, setPayLaterDownPaymentMethod] = useState<ImmediatePaymentMethod>('pos');
  const [payLaterDownPaymentRef, setPayLaterDownPaymentRef] = useState<string>('');
  const [payLaterDueDate, setPayLaterDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [payLaterReason, setPayLaterReason] = useState<string>('تسویه در مراجعه بعدی');

  // Installment Plan fields
  const [instDownPayment, setInstDownPayment] = useState<string>('0');
  const [instDownPaymentMethod, setInstDownPaymentMethod] = useState<ImmediatePaymentMethod>('pos');
  const [instDownPaymentRef, setInstDownPaymentRef] = useState<string>('');
  const [instCount, setInstCount] = useState<number>(3);
  const [instInterval, setInstInterval] = useState<InstallmentInterval>('1_month');
  const [instStartDate, setInstStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [instNotes, setInstNotes] = useState<string>('');

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

  // Pay Later calculations
  const payLaterDownNum = Math.min(remainingBeforeNewPay, Math.max(0, parseFloat(payLaterDownPayment) || 0));
  const payLaterDeferredAmount = Math.max(0, remainingBeforeNewPay - payLaterDownNum);

  // Installments calculations
  const instDownNum = Math.min(remainingBeforeNewPay, Math.max(0, parseFloat(instDownPayment) || 0));
  const instRemainToSplit = Math.max(0, remainingBeforeNewPay - instDownNum);
  const instPerMonthAmount = instCount > 0 ? Math.round(instRemainToSplit / instCount) : 0;

  // Generated Installments preview schedule
  const generatedSchedule = useMemo(() => {
    if (instRemainToSplit <= 0 || instCount <= 0) return [];
    const items = [];
    const baseDate = new Date(instStartDate || new Date());
    
    // Interval in days or months
    for (let i = 0; i < instCount; i++) {
      const dueDate = new Date(baseDate);
      if (instInterval === '15_days') {
        dueDate.setDate(baseDate.getDate() + (i * 15));
      } else if (instInterval === '1_month') {
        dueDate.setMonth(baseDate.getMonth() + i);
      } else if (instInterval === '45_days') {
        dueDate.setDate(baseDate.getDate() + (i * 45));
      } else if (instInterval === '2_months') {
        dueDate.setMonth(baseDate.getMonth() + (i * 2));
      }

      // Handle last installment rounding difference
      let itemAmount = instPerMonthAmount;
      if (i === instCount - 1) {
        itemAmount = instRemainToSplit - (instPerMonthAmount * (instCount - 1));
      }

      items.push({
        index: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: Math.max(0, itemAmount),
        description: `قسط شماره ${i + 1} از ${instCount} بابت نوبت درمان (${patient?.name || ''})`
      });
    }
    return items;
  }, [instRemainToSplit, instCount, instStartDate, instInterval, instPerMonthAmount, patient]);

  // Initialize form when appointment changes
  useEffect(() => {
    if (appointment && isOpen) {
      const rem = Math.max(0, totalServiceGrossPrice - alreadyGivenDiscount - alreadyPaidAmount);
      setSettlementMode('immediate');
      setPayAmount(rem > 0 ? rem.toString() : '0');
      setDiscountAmount('0');
      setReferenceNumber('');
      setDescription('');
      setImmediateMethod('pos');
      
      // Reset pay later
      setPayLaterDownPayment('0');
      setPayLaterDownPaymentMethod('pos');
      setPayLaterDownPaymentRef('');
      const defaultPayLaterDate = new Date();
      defaultPayLaterDate.setDate(defaultPayLaterDate.getDate() + 7);
      setPayLaterDueDate(defaultPayLaterDate.toISOString().split('T')[0]);
      setPayLaterReason('تسویه در مراجعه بعدی');

      // Reset installments
      setInstDownPayment('0');
      setInstDownPaymentMethod('pos');
      setInstDownPaymentRef('');
      setInstCount(3);
      setInstInterval('1_month');
      const defaultInstDate = new Date();
      defaultInstDate.setMonth(defaultInstDate.getMonth() + 1);
      setInstStartDate(defaultInstDate.toISOString().split('T')[0]);
      setInstNotes('');

      // Auto finish visit if currently in_visit or present
      setAutoFinishVisit(appointment.status === '3' || appointment.status === 'in_visit' || appointment.status === '4' || appointment.status === 'present');
    }
  }, [appointment, isOpen, totalServiceGrossPrice, alreadyGivenDiscount, alreadyPaidAmount]);

  if (!isOpen || !appointment || !patient) return null;

  const handleApplyFullSettlement = () => {
    setPayAmount(remainingBeforeNewPay.toString());
    setDiscountAmount('0');
  };

  const handleQuickPayLaterDays = (days: number, reasonLabel?: string) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setPayLaterDueDate(d.toISOString().split('T')[0]);
    if (reasonLabel) {
      setPayLaterReason(reasonLabel);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const targetDoctorId = appointment.doctor_id || (doctor ? doctor.id : undefined);

      // ==========================================
      // 1. MODE: IMMEDIATE PAYMENT
      // ==========================================
      if (settlementMode === 'immediate') {
        if (currentPayNum <= 0 && currentDiscountNum <= 0 && remainingBeforeNewPay > 0) {
          toast.error('لطفاً مبلغ پرداختی یا تخفیف معتبر وارد کنید.');
          setIsSubmitting(false);
          return;
        }

        const newPayment: Payment = {
          uuid: `pay-${Date.now()}`,
          patient_id: patient.uuid,
          doctor_id: targetDoctorId,
          appointment_uuid: appointment.uuid,
          amount: currentPayNum,
          discount: currentDiscountNum,
          date: new Date().toISOString(),
          payment_method: immediateMethod,
          reference_number: referenceNumber.trim() || undefined,
          description: description.trim() || `تسویه نوبت ${patient.name}`
        };

        await onAddPayment(newPayment);

        // If user opted to complete the visit
        if (autoFinishVisit && onUpdateAppointmentStatus && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(
          currentPayNum > 0 
            ? `پرداخت مبلغ ${formatCurrency(currentPayNum)} با موفقیت ثبت شد.`
            : 'وضعیت تخفیف و تسویه با موفقیت بروزرسانی شد.'
        );
      }

      // ==========================================
      // 2. MODE: PAY AT ANOTHER TIME (DEFERRED)
      // ==========================================
      else if (settlementMode === 'pay_later') {
        if (payLaterDeferredAmount <= 0 && payLaterDownNum <= 0) {
          toast.error('مبلغ معوقه‌ای برای ثبت وجود ندارد.');
          setIsSubmitting(false);
          return;
        }

        if (!payLaterDueDate) {
          toast.error('لطفاً تاریخ وعده / سررسید پرداخت را مشخص کنید.');
          setIsSubmitting(false);
          return;
        }

        // 2a. If there is a down payment right now
        if (payLaterDownNum > 0) {
          const downPaymentObj: Payment = {
            uuid: `pay-${Date.now()}-down`,
            patient_id: patient.uuid,
            doctor_id: targetDoctorId,
            appointment_uuid: appointment.uuid,
            amount: payLaterDownNum,
            discount: currentDiscountNum,
            date: new Date().toISOString(),
            payment_method: payLaterDownPaymentMethod,
            reference_number: payLaterDownPaymentRef.trim() || undefined,
            description: `پیش‌پرداخت نوبت (مانده به سررسید ${formatJalaliDate(payLaterDueDate)} موکول شد)`
          };
          await onAddPayment(downPaymentObj);
        }

        // 2b. Register the deferred amount as an Installment / Promise record for financial tracking
        const deferredInstallment: Installment = {
          uuid: `inst-${Date.now()}-def`,
          patient_id: patient.uuid,
          doctor_id: targetDoctorId,
          amount: payLaterDeferredAmount,
          due_date: new Date(payLaterDueDate).toISOString(),
          status: 'pending',
          description: `وعده پرداخت نوبت (${patient.name}) - ${payLaterReason.trim() || 'تسویه معوق'}`,
          created_at: new Date().toISOString()
        };

        if (onAddInstallment) {
          await onAddInstallment(deferredInstallment);
        } else if (contextAddInstallment) {
          await contextAddInstallment(deferredInstallment);
        }

        // Also record a debt payment entry for transparency
        const debtRecord: Payment = {
          uuid: `pay-${Date.now()}-debt`,
          patient_id: patient.uuid,
          doctor_id: targetDoctorId,
          appointment_uuid: appointment.uuid,
          amount: 0,
          discount: payLaterDownNum > 0 ? 0 : currentDiscountNum,
          date: new Date().toISOString(),
          payment_method: 'debt',
          description: `ثبت تعهد پرداخت مانده ${formatCurrency(payLaterDeferredAmount)} برای تاریخ ${formatJalaliDate(payLaterDueDate)} (${payLaterReason})`
        };
        await onAddPayment(debtRecord);

        if (autoFinishVisit && onUpdateAppointmentStatus && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(
          `وعده پرداخت مبلغ ${formatCurrency(payLaterDeferredAmount)} برای تاریخ ${formatJalaliDate(payLaterDueDate)} با موفقیت ثبت شد.`
        );
      }

      // ==========================================
      // 3. MODE: INSTALLMENT PLAN
      // ==========================================
      else if (settlementMode === 'installments') {
        if (instRemainToSplit <= 0) {
          toast.error('مبلغی برای تقسیط باقی نمانده است.');
          setIsSubmitting(false);
          return;
        }

        if (generatedSchedule.length === 0) {
          toast.error('برنامه اقساط معتبر نیست.');
          setIsSubmitting(false);
          return;
        }

        // 3a. Register down payment if any
        if (instDownNum > 0) {
          const downPaymentObj: Payment = {
            uuid: `pay-${Date.now()}-inst-down`,
            patient_id: patient.uuid,
            doctor_id: targetDoctorId,
            appointment_uuid: appointment.uuid,
            amount: instDownNum,
            discount: currentDiscountNum,
            date: new Date().toISOString(),
            payment_method: instDownPaymentMethod,
            reference_number: instDownPaymentRef.trim() || undefined,
            description: `پیش‌پرداخت طرح اقساط ${instCount} ماهه نوبت درمان`
          };
          await onAddPayment(downPaymentObj);
        }

        // 3b. Create all installments in database
        for (const instItem of generatedSchedule) {
          const newInst: Installment = {
            uuid: `inst-${Date.now()}-${instItem.index}`,
            patient_id: patient.uuid,
            doctor_id: targetDoctorId,
            amount: instItem.amount,
            due_date: new Date(instItem.dueDate).toISOString(),
            status: 'pending',
            description: instNotes.trim() ? `${instItem.description} - ${instNotes.trim()}` : instItem.description,
            created_at: new Date().toISOString()
          };

          if (onAddInstallment) {
            await onAddInstallment(newInst);
          } else if (contextAddInstallment) {
            await contextAddInstallment(newInst);
          }
        }

        if (autoFinishVisit && onUpdateAppointmentStatus && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(
          `طرح اقساط (${instCount} قسط به ارزش کل ${formatCurrency(instRemainToSplit)}) با موفقیت در پرونده بیمار ثبت شد.`
        );
      }

      // Close modal after brief confirmation
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('خطا در ثبت تسویه یا اقساط.');
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
                <h3 className="text-xl font-black">تسویه حساب و مدیریت پرداخت نوبت</h3>
                <span className="px-2.5 py-0.5 bg-white/25 rounded-full text-[10px] font-bold">
                  اتصال به پرونده مالی
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-right scrollbar-thin">
          
          {/* Patient & Doctor Card */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
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

            <div className="flex items-center gap-2.5 text-right">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 block">مبلغ کل خدمات</span>
                <span className="font-black text-xs text-gray-900 dark:text-white font-mono mt-0.5 block">
                  {formatCurrency(totalServiceGrossPrice)}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">تخفیف</span>
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
                  {remainingBeforeNewPay <= 0 ? 'وضعیت تسویه' : 'مانده قابل تسویه'}
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

          {/* ========================================================================= */}
          {/* PRIMARY SETTLEMENT METHOD TABS (Instant Pay / Pay Later / Installments) */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center justify-between">
              <span>نحوه تسویه و پرداخت مانده:</span>
              <span className="text-[11px] font-normal text-gray-400">
                انتخاب شیوه پرداخت بر اساس توافق با بیمار
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setSettlementMode('immediate')}
                className={clsx(
                  "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5",
                  settlementMode === 'immediate'
                    ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-800"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <CreditCard size={15} />
                <span>پرداخت آنی / نقدی</span>
              </button>

              <button
                type="button"
                onClick={() => setSettlementMode('pay_later')}
                className={clsx(
                  "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5",
                  settlementMode === 'pay_later'
                    ? "bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-800"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <CalendarDays size={15} />
                <span>پرداخت در زمان دیگر</span>
              </button>

              <button
                type="button"
                onClick={() => setSettlementMode('installments')}
                className={clsx(
                  "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5",
                  settlementMode === 'installments'
                    ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Layers size={15} />
                <span>پرداخت اقساطی</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: IMMEDIATE PAYMENT (POS, CASH, CARD TO CARD) */}
          {/* ========================================================================= */}
          {settlementMode === 'immediate' && (
            <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                  درگاه دریافت وجه:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setImmediateMethod('pos')}
                    className={clsx(
                      "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                      immediateMethod === 'pos'
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                        : "bg-white dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    <CreditCard size={18} />
                    <span>کارت‌خوان (POS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImmediateMethod('cash')}
                    className={clsx(
                      "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                      immediateMethod === 'cash'
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                        : "bg-white dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    <DollarSign size={18} />
                    <span>وجه نقد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImmediateMethod('card_to_card')}
                    className={clsx(
                      "p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center justify-center gap-1.5",
                      immediateMethod === 'card_to_card'
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                        : "bg-white dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    <Smartphone size={18} />
                    <span>کارت به کارت</span>
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
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr shadow-xs"
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
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr shadow-xs"
                  />
                </div>
              </div>

              {/* Reference Number */}
              {(immediateMethod === 'pos' || immediateMethod === 'card_to_card') && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    شماره پیگیری فیش / شماره ارجاع تراکنش (RRN):
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="مثال: 849201948271"
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr shadow-xs"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                  توضیحات و یادداشت:
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات اختیاری (مثلاً تخفیف با هماهنگی پزشک)..."
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PAY AT ANOTHER TIME (DEFERRED / PROMISE TO PAY) */}
          {/* ========================================================================= */}
          {settlementMode === 'pay_later' && (
            <div className="space-y-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 animate-in fade-in">
              <div className="flex items-start gap-2.5 p-3 bg-amber-100/60 dark:bg-amber-900/30 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">ثبت بدهی معوق با موعد سررسید و وعده پرداخت:</span>
                  <span className="text-[11px] opacity-90 block mt-0.5">
                    بیمار مانده حساب را در تاریخ مشخصی پرداخت خواهد کرد. این مبلغ در کاردکس مالی و لیست مطالبات ثبت می‌شود.
                  </span>
                </div>
              </div>

              {/* Optional Down Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    پیش‌پرداخت دریافتی هم‌اکنون (اختیاری):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={remainingBeforeNewPay}
                    step="1000"
                    value={payLaterDownPayment}
                    onChange={(e) => setPayLaterDownPayment(e.target.value)}
                    placeholder="۰ تومان"
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-amber-500 font-mono text-left dir-ltr shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    مانده معوق موکول‌شده به بعد:
                  </label>
                  <div className="p-3 bg-amber-100/70 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs font-black text-amber-950 dark:text-amber-200 font-mono text-left dir-ltr shadow-xs">
                    {formatCurrency(payLaterDeferredAmount)}
                  </div>
                </div>
              </div>

              {/* If down payment > 0, select its payment method */}
              {payLaterDownNum > 0 && (
                <div className="space-y-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    روش دریافت پیش‌پرداخت ({formatCurrency(payLaterDownNum)}):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayLaterDownPaymentMethod('pos')}
                      className={clsx(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1",
                        payLaterDownPaymentMethod === 'pos'
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <CreditCard size={14} />
                      <span>کارت‌خوان</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayLaterDownPaymentMethod('cash')}
                      className={clsx(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1",
                        payLaterDownPaymentMethod === 'cash'
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <DollarSign size={14} />
                      <span>نقدی</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayLaterDownPaymentMethod('card_to_card')}
                      className={clsx(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1",
                        payLaterDownPaymentMethod === 'card_to_card'
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <Smartphone size={14} />
                      <span>کارت به کارت</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Due Date / Promise Date Picker */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center justify-between">
                  <span>تاریخ وعده / سررسید پرداخت:</span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                    {payLaterDueDate ? `سررسید: ${formatJalaliDate(payLaterDueDate)}` : 'انتخاب نشده'}
                  </span>
                </label>
                
                <PersianDatePicker
                  value={payLaterDueDate}
                  onChange={(date) => setPayLaterDueDate(date)}
                  placeholder="انتخاب تاریخ سررسید پرداخت"
                />

                {/* Quick Date Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-gray-400 ml-1">انتخاب سریع:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPayLaterDays(3, 'تسویه ۳ روز آینده')}
                    className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    ۳ روز دیگر
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPayLaterDays(7, 'تسویه ۱ هفته آینده')}
                    className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    ۱ هفته دیگر
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPayLaterDays(14, 'تسویه ۲ هفته آینده')}
                    className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    ۲ هفته دیگر
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPayLaterDays(30, 'تسویه در انتهای ماه')}
                    className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    ۱ ماه دیگر
                  </button>
                </div>
              </div>

              {/* Pay Later Reason / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                  علت به تعویق انداختن و توافق پرداخت:
                </label>
                <input
                  type="text"
                  value={payLaterReason}
                  onChange={(e) => setPayLaterReason(e.target.value)}
                  placeholder="مثال: تسویه همزمان با جلسه تحویل پروتز / چک / دریافت حقوق..."
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-amber-500 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: INSTALLMENT PLAN (SPLIT INTO SCHEDULED INSTALLMENTS) */}
          {/* ========================================================================= */}
          {settlementMode === 'installments' && (
            <div className="space-y-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 animate-in fade-in">
              <div className="flex items-start gap-2.5 p-3 bg-blue-100/60 dark:bg-blue-900/30 rounded-xl text-blue-900 dark:text-blue-200 text-xs">
                <Sparkles size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">طرح تقسیط مانده درمان و ایجاد دفترچه اقساط:</span>
                  <span className="text-[11px] opacity-90 block mt-0.5">
                    مانده حساب بر اساس تعداد و فواصل زمانی انتخابی شما به صورت خودکار تقسیط شده و در سیستم مالی بیمار درج می‌گردد.
                  </span>
                </div>
              </div>

              {/* Down Payment & Number of Installments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    پیش‌پرداخت اولیه (تومان):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={remainingBeforeNewPay}
                    step="1000"
                    value={instDownPayment}
                    onChange={(e) => setInstDownPayment(e.target.value)}
                    placeholder="۰ تومان"
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-left dir-ltr shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    مانده قابل تقسیط:
                  </label>
                  <div className="p-3 bg-blue-100/70 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-black text-blue-950 dark:text-blue-200 font-mono text-left dir-ltr shadow-xs">
                    {formatCurrency(instRemainToSplit)}
                  </div>
                </div>
              </div>

              {/* Down payment method if > 0 */}
              {instDownNum > 0 && (
                <div className="space-y-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    روش دریافت پیش‌پرداخت اقساط ({formatCurrency(instDownNum)}):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setInstDownPaymentMethod('pos')}
                      className={clsx(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1",
                        instDownPaymentMethod === 'pos'
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <CreditCard size={14} />
                      <span>کارت‌خوان</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstDownPaymentMethod('cash')}
                      className={clsx(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1",
                        instDownPaymentMethod === 'cash'
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <DollarSign size={14} />
                      <span>نقدی</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstDownPaymentMethod('card_to_card')}
                      className={clsx(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1",
                        instDownPaymentMethod === 'card_to_card'
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <Smartphone size={14} />
                      <span>کارت به کارت</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Installment count and interval settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    تعداد اقساط:
                  </label>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 6].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setInstCount(num)}
                        className={clsx(
                          "flex-1 py-2.5 rounded-xl border text-xs font-black transition-all",
                          instCount === num
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        {num} قسط
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    فاصله زمانی هر قسط:
                  </label>
                  <select
                    value={instInterval}
                    onChange={(e) => setInstInterval(e.target.value as InstallmentInterval)}
                    className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 shadow-xs"
                  >
                    <option value="15_days">هر ۱۵ روز (دو بار در ماه)</option>
                    <option value="1_month">ماهانه (هر ۳۰ روز)</option>
                    <option value="45_days">هر ۴۵ روز (۱.۵ ماه)</option>
                    <option value="2_months">هر ۲ ماه یکبار</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                    تاریخ اولین قسط:
                  </label>
                  <PersianDatePicker
                    value={instStartDate}
                    onChange={(date) => setInstStartDate(date)}
                    placeholder="تاریخ سررسید قسط ۱"
                  />
                </div>
              </div>

              {/* Installments Schedule Preview Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Calculator size={15} className="text-blue-600 dark:text-blue-400" />
                    <span>پیش‌نمایش زمان‌بندی اقساط ({instCount} قسط):</span>
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                    هر قسط تقریبی: {formatCurrency(instPerMonthAmount)}
                  </span>
                </div>

                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 overflow-hidden bg-white dark:bg-gray-800 text-xs">
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto scrollbar-thin">
                    {generatedSchedule.map((inst) => (
                      <div key={inst.index} className="p-2.5 flex items-center justify-between hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-[11px] flex items-center justify-center">
                            {inst.index}
                          </span>
                          <div>
                            <span className="font-bold text-gray-800 dark:text-white">
                              قسط {inst.index} از {instCount}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              سررسید: {formatJalaliDate(inst.dueDate)}
                            </span>
                          </div>
                        </div>

                        <div className="font-mono text-left dir-ltr">
                          <span className="font-black text-blue-700 dark:text-blue-300">
                            {formatCurrency(inst.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Installment Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                  یادداشت قرارداد اقساط:
                </label>
                <input
                  type="text"
                  value={instNotes}
                  onChange={(e) => setInstNotes(e.target.value)}
                  placeholder="مثال: قرارداد ارتودنسی / دریافت چک ضمانت / توافق با سرپرست..."
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* Auto-mark Appointment as Finished Option */}
          {(appointment.status !== '0' && appointment.status !== 'finished') && (
            <label className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoFinishVisit}
                onChange={(e) => setAutoFinishVisit(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200">
                تغییر همزمان وضعیت نوبت به «پایان‌یافته» و خروج بیمار از صف ویزیت فعال
              </span>
            </label>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                "flex-1 py-3.5 px-6 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] text-white",
                settlementMode === 'immediate'
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25"
                  : settlementMode === 'pay_later'
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
              )}
            >
              <CheckCheck size={18} />
              <span>
                {isSubmitting 
                  ? 'در حال پردازش...' 
                  : settlementMode === 'immediate'
                    ? remainingAfterNewPay <= 0 && currentPayNum > 0
                      ? `ثبت تسویه کامل (${formatCurrency(currentPayNum)})`
                      : currentPayNum > 0
                        ? `ثبت پرداخت ${formatCurrency(currentPayNum)} (مانده: ${formatCurrency(remainingAfterNewPay)})`
                        : 'ثبت و بروزرسانی وضعیت مالی'
                    : settlementMode === 'pay_later'
                      ? `ثبت وعده پرداخت ${formatCurrency(payLaterDeferredAmount)} برای ${formatJalaliDate(payLaterDueDate)}`
                      : `ایجاد و ثبت ${instCount} قسط (${formatCurrency(instRemainToSplit)})`}
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
