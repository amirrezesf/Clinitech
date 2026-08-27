import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, CreditCard, DollarSign, Smartphone, FileText, 
  Printer, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight,
  Receipt, Plus, Trash2, Calendar, User, Phone, Hash, Tag,
  Clock, Stethoscope, ChevronDown, CheckCheck, CalendarDays,
  Layers, Sparkles, Calculator, AlertTriangle, Info, ArrowLeft
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

type SettlementMode = 'immediate' | 'installments';
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

  // Mode Selection: 1. Immediate payment, 2. Installments & Deferred Payments (Merged)
  const [settlementMode, setSettlementMode] = useState<SettlementMode>('immediate');

  // Immediate payment fields
  const [immediateMethod, setImmediateMethod] = useState<ImmediatePaymentMethod>('pos');
  const [payAmount, setPayAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [autoFinishVisit, setAutoFinishVisit] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Merged Installment & Deferred Plan fields
  const [instDownPayment, setInstDownPayment] = useState<string>('0');
  const [instDownPaymentMethod, setInstDownPaymentMethod] = useState<ImmediatePaymentMethod>('pos');
  const [instCount, setInstCount] = useState<number>(3);
  const [instInterval, setInstInterval] = useState<InstallmentInterval>('1_month');
  const [instStartDate, setInstStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
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

  // Installments / Deferred calculations
  const instDownNum = Math.min(remainingBeforeNewPay, Math.max(0, parseFloat(instDownPayment) || 0));
  const instRemainToSplit = Math.max(0, remainingBeforeNewPay - instDownNum);
  const instPerMonthAmount = instCount > 0 ? Math.round(instRemainToSplit / instCount) : 0;

  // Generated Installments preview schedule
  const generatedSchedule = useMemo(() => {
    if (instRemainToSplit <= 0 || instCount <= 0) return [];
    const items = [];
    const baseDate = new Date(instStartDate || new Date());
    
    for (let i = 0; i < instCount; i++) {
      const dueDate = new Date(baseDate);
      if (instCount > 1) {
        if (instInterval === '15_days') {
          dueDate.setDate(baseDate.getDate() + (i * 15));
        } else if (instInterval === '1_month') {
          dueDate.setMonth(baseDate.getMonth() + i);
        } else if (instInterval === '45_days') {
          dueDate.setDate(baseDate.getDate() + (i * 45));
        } else if (instInterval === '2_months') {
          dueDate.setMonth(baseDate.getMonth() + (i * 2));
        }
      }

      let itemAmount = instPerMonthAmount;
      if (i === instCount - 1) {
        itemAmount = instRemainToSplit - (instPerMonthAmount * (instCount - 1));
      }

      const desc = instCount === 1
        ? `وعده پرداخت موکول به بعد (${patient?.name || ''})`
        : `قسط شماره ${i + 1} از ${instCount} (${patient?.name || ''})`;

      items.push({
        index: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: Math.max(0, itemAmount),
        description: desc
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
      setDescription('');
      setImmediateMethod('pos');
      
      setInstDownPayment('0');
      setInstDownPaymentMethod('pos');
      setInstCount(3);
      setInstInterval('1_month');
      const defaultInstDate = new Date();
      defaultInstDate.setDate(defaultInstDate.getDate() + 7);
      setInstStartDate(defaultInstDate.toISOString().split('T')[0]);
      setInstNotes('');

      setAutoFinishVisit(appointment.status === '3' || appointment.status === 'in_visit' || appointment.status === '4' || appointment.status === 'present');
    }
  }, [appointment, isOpen, totalServiceGrossPrice, alreadyGivenDiscount, alreadyPaidAmount]);

  if (!isOpen || !appointment || !patient) return null;

  const handleApplyFullSettlement = () => {
    setPayAmount(remainingBeforeNewPay.toString());
    setDiscountAmount('0');
  };

  const handleQuickDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setInstStartDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const targetDoctorId = appointment.doctor_id || (doctor ? doctor.id : undefined);

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
          description: description.trim() || `تسویه حساب نوبت ${patient.name}`
        };

        await onAddPayment(newPayment);

        if (autoFinishVisit && onUpdateAppointmentStatus && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(
          currentPayNum > 0 
            ? `پرداخت مبلغ ${formatCurrency(currentPayNum)} با موفقیت ثبت شد.`
            : 'وضعیت تخفیف و تسویه با موفقیت بروزرسانی شد.'
        );
      } else if (settlementMode === 'installments') {
        if (instRemainToSplit <= 0 && instDownNum <= 0) {
          toast.error('مبلغی برای تقسیط یا تعویق باقی نمانده است.');
          setIsSubmitting(false);
          return;
        }

        if (generatedSchedule.length === 0 && instRemainToSplit > 0) {
          toast.error('برنامه اقساط معتبر نیست.');
          setIsSubmitting(false);
          return;
        }

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
            description: instCount === 1 
              ? `پیش‌پرداخت نوبت (مانده به سررسید ${formatJalaliDate(instStartDate)} موکول شد)`
              : `پیش‌پرداخت طرح اقساط ${instCount} مرحله‌ای نوبت درمان`
          };
          await onAddPayment(downPaymentObj);
        }

        for (const instItem of generatedSchedule) {
          const isSingleDeferred = instCount === 1;
          const newInst: Installment = {
            uuid: `inst-${Date.now()}-${instItem.index}${isSingleDeferred ? '-def' : ''}`,
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

        if (instCount === 1 && instDownNum === 0) {
          const debtRecord: Payment = {
            uuid: `pay-${Date.now()}-debt`,
            patient_id: patient.uuid,
            doctor_id: targetDoctorId,
            appointment_uuid: appointment.uuid,
            amount: 0,
            discount: currentDiscountNum,
            date: new Date().toISOString(),
            payment_method: 'debt',
            description: `ثبت تعهد پرداخت مانده ${formatCurrency(instRemainToSplit)} برای سررسید ${formatJalaliDate(instStartDate)}`
          };
          await onAddPayment(debtRecord);
        }

        if (autoFinishVisit && onUpdateAppointmentStatus && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(
          instCount === 1
            ? `وعده پرداخت مبلغ ${formatCurrency(instRemainToSplit)} برای تاریخ ${formatJalaliDate(instStartDate)} ثبت شد.`
            : `طرح اقساط (${instCount} قسط به ارزش کل ${formatCurrency(instRemainToSplit)}) با موفقیت ثبت شد.`
        );
      }

      setTimeout(() => {
        onClose();
      }, 400);

    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('خطا در ثبت تسویه یا اقساط.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vibrant Primary Gradient Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">تسویه حساب مالی نوبت</h3>
                <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[11px] font-bold backdrop-blur-sm">
                  {patient.name}
                </span>
              </div>
              <p className="text-[11px] text-primary-100 mt-0.5 font-bold">
                نوبت ساعت {formatJalaliTime(appointment.for_date)} ({formatJalaliDate(appointment.for_date)}) {doctor && `• پزشک: ${doctor.name}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-Column Split-Pane Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row text-right">
          
          {/* ========================================================================= */}
          {/* COLUMN 1 (RIGHT SIDE): Patient & Service Summary & Balance Card (Sticky) */}
          {/* ========================================================================= */}
          <div className="w-full md:w-[340px] bg-slate-50/80 dark:bg-gray-800/40 p-5 border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-800 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
            
            {/* Patient Header */}
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black shrink-0">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs text-gray-900 dark:text-white block truncate">{patient.name}</span>
                <span className="text-[10px] text-gray-500 font-mono dir-ltr block truncate">
                  {patient.phone_number || 'بدون تماس'} {insurance && `• ${insurance.title}`}
                </span>
              </div>
            </div>

            {/* Services Mini-List */}
            <div className="space-y-1.5 flex-1 min-h-0">
              <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 block px-1">
                خدمات ارائه شده ({appointment.services.length}):
              </span>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 max-h-36 overflow-y-auto scrollbar-thin text-xs">
                {appointment.services.map((item, idx) => {
                  const serviceInfo = allReasons.find(r => r.uuid === item.reason_id);
                  const unitPrice = serviceInfo?.price || 0;
                  const totalItemPrice = unitPrice * (item.quantity || 1);

                  return (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-1">
                        <span className="font-bold text-gray-800 dark:text-gray-200 block truncate">
                          {serviceInfo?.title || getReasonTitle(item.reason_id)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-gray-400">
                            {item.quantity} عدد × {formatCurrency(unitPrice)}
                          </span>
                        )}
                      </div>
                      <span className="font-black font-mono text-gray-900 dark:text-white shrink-0">
                        {formatCurrency(totalItemPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>جمع کل خدمات:</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalServiceGrossPrice)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>تخفیف کل:</span>
                  <span className="font-mono font-bold">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}

              {alreadyPaidAmount > 0 && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400">
                  <span>پرداختی قبلی ({existingPayments.length}):</span>
                  <span className="font-mono font-bold">-{formatCurrency(alreadyPaidAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="font-black text-gray-900 dark:text-white">مانده قابل تسویه:</span>
                <span className={clsx(
                  "font-black font-mono text-sm",
                  remainingBeforeNewPay <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {remainingBeforeNewPay <= 0 ? 'تسویه شده ✓' : formatCurrency(remainingBeforeNewPay)}
                </span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* COLUMN 2 (LEFT SIDE): Payment Action Controls */}
          {/* ========================================================================= */}
          <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto scrollbar-thin space-y-4">
            
            <div className="space-y-4">
              {/* Segmented Mode Control */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setSettlementMode('immediate')}
                  className={clsx(
                    "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5",
                    settlementMode === 'immediate'
                      ? "bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <CreditCard size={15} />
                  <span>پرداخت آنی / نقدی (هم‌اکنون)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettlementMode('installments')}
                  className={clsx(
                    "py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5",
                    settlementMode === 'installments'
                      ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Layers size={15} />
                  <span>اقساط و موکول به بعد (تعهدی)</span>
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* MODE 1: IMMEDIATE PAYMENT FORM */}
              {/* ------------------------------------------------------------- */}
              {settlementMode === 'immediate' && (
                <div className="space-y-3.5 animate-in fade-in">
                  
                  {/* Gateways */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'pos', title: 'کارت‌خوان (POS)', icon: CreditCard },
                      { id: 'cash', title: 'وجه نقد', icon: DollarSign },
                      { id: 'card_to_card', title: 'کارت به کارت', icon: Smartphone }
                    ].map(gate => {
                      const Icon = gate.icon;
                      const isSelected = immediateMethod === gate.id;
                      return (
                        <button
                          key={gate.id}
                          type="button"
                          onClick={() => setImmediateMethod(gate.id as ImmediatePaymentMethod)}
                          className={clsx(
                            "p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                            isSelected
                              ? "bg-primary-600 border-primary-600 text-white shadow-xs"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <Icon size={15} />
                          <span>{gate.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount & Discount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          مبلغ پرداختی (تومان):
                        </label>
                        {remainingBeforeNewPay > 0 && (
                          <button
                            type="button"
                            onClick={handleApplyFullSettlement}
                            className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            تسویه کامل مانده ({formatCurrency(remainingBeforeNewPay)})
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
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 font-mono text-left dir-ltr shadow-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                        تخفیف موردی (تومان):
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="۰ تومان"
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 font-mono text-left dir-ltr shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Note / Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                      یادداشت و شرح پرداخت (اختیاری):
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="مثال: تسویه کامل حساب نوبت..."
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 shadow-xs"
                    />
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* MODE 2: INSTALLMENTS & DEFERRED PLAN FORM */}
              {/* ------------------------------------------------------------- */}
              {settlementMode === 'installments' && (
                <div className="space-y-3.5 animate-in fade-in">
                  
                  {/* Presets: 1 to 6 steps */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                        نوع و تعداد اقساط:
                      </label>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        {instCount === 1 ? 'تک‌سررسید (موکول به بعد)' : `${instCount} قسط دوره‌ای`}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { count: 1, label: '۱ (موکول به بعد)' },
                        { count: 2, label: '۲ قسط' },
                        { count: 3, label: '۳ قسط' },
                        { count: 4, label: '۴ قسط' },
                        { count: 6, label: '۶ قسط' }
                      ].map(item => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() => setInstCount(item.count)}
                          className={clsx(
                            "py-2 rounded-xl border text-xs font-black transition-all",
                            instCount === item.count
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Down Payment & Remaining */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                        پیش‌پرداخت نقدی هم‌اکنون (تومان):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={remainingBeforeNewPay}
                        step="1000"
                        value={instDownPayment}
                        onChange={(e) => setInstDownPayment(e.target.value)}
                        placeholder="۰ تومان (اختیاری)"
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-left dir-ltr shadow-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                        {instCount === 1 ? 'مبلغ موکول به سررسید:' : 'مانده کل قابل تقسیط:'}
                      </label>
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-black text-blue-900 dark:text-blue-200 font-mono text-left dir-ltr">
                        {formatCurrency(instRemainToSplit)}
                      </div>
                    </div>
                  </div>

                  {/* Due Date & Interval */}
                  <div className={clsx("grid gap-3", instCount > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                    {instCount > 1 && (
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          فاصله زمانی هر قسط:
                        </label>
                        <select
                          value={instInterval}
                          onChange={(e) => setInstInterval(e.target.value as InstallmentInterval)}
                          className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500"
                        >
                          <option value="15_days">هر ۱۵ روز (دو هفته)</option>
                          <option value="1_month">ماهانه (۳۰ روزه)</option>
                          <option value="45_days">هر ۴۵ روز (۱.۵ ماه)</option>
                          <option value="2_months">هر ۲ ماه</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          {instCount === 1 ? 'تاریخ موعد سررسید:' : 'تاریخ سررسید قسط اول:'}
                        </label>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleQuickDays(3)} className="text-[10px] text-blue-600 font-bold hover:underline">۳ روز</button>
                          <span className="text-gray-300">•</span>
                          <button type="button" onClick={() => handleQuickDays(7)} className="text-[10px] text-blue-600 font-bold hover:underline">۱ هفته</button>
                          <span className="text-gray-300">•</span>
                          <button type="button" onClick={() => handleQuickDays(30)} className="text-[10px] text-blue-600 font-bold hover:underline">۱ ماه</button>
                        </div>
                      </div>
                      <PersianDatePicker
                        value={instStartDate}
                        onChange={(date) => setInstStartDate(date)}
                        placeholder="انتخاب تاریخ سررسید"
                      />
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                      شرح توافق / یادداشت:
                    </label>
                    <input
                      type="text"
                      value={instNotes}
                      onChange={(e) => setInstNotes(e.target.value)}
                      placeholder={instCount === 1 ? 'مثال: تسویه همزمان با تحویل جواب / جلسه بعد' : 'مثال: قرارداد درمان تقسیطی'}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>

                </div>
              )}

              {/* Status Toggle */}
              {(appointment.status !== '0' && appointment.status !== 'finished') && (
                <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoFinishVisit}
                    onChange={(e) => setAutoFinishVisit(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    تغییر خودکار وضعیت نوبت به «پایان‌یافته»
                  </span>
                </label>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-white font-black text-xs transition-all shadow-md flex items-center gap-2",
                  settlementMode === 'immediate'
                    ? "bg-primary-600 hover:bg-primary-700 shadow-primary-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                )}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                <span>
                  {settlementMode === 'immediate' ? 'ثبت و تایید تسویه نقدی' : 'ثبت برنامه اقساط / سررسید'}
                </span>
              </button>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
};
