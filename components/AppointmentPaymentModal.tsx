import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Check, CreditCard, DollarSign, Smartphone, FileText, 
  Printer, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight,
  Receipt, Plus, Trash2, Calendar, User, Phone, Hash, Tag,
  Clock, Stethoscope, ChevronDown, CheckCheck, CalendarDays,
  Layers, Sparkles, Calculator, AlertTriangle, Info, ArrowLeft,
  Search, Upload, Camera, RefreshCw, UserCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Appointment, Doctor, Patient, AppointmentReason, Payment, Insurance, Installment } from '../types';
import { formatCurrency, formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { PersianDatePicker } from './PersianDatePicker';
import { useData } from '../context/DataContext';

export interface AppointmentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  doctor?: Doctor | null;
  patient?: Patient | null;
  patientId?: string | null;
  insurance?: Insurance | null;
  allReasons?: AppointmentReason[];
  existingPayments?: Payment[];
  initialMode?: 'immediate' | 'installments';
  onAddPayment?: (payment: Payment) => Promise<void> | void;
  onAddInstallment?: (installment: Installment) => Promise<void> | void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment['status']) => Promise<void> | void;
  getReasonTitle?: (id: string) => string;
}

type SettlementMode = 'immediate' | 'installments';
type ImmediatePaymentMethod = 'pos' | 'cash' | 'card_to_card';
type InstallmentInterval = '15_days' | '1_month' | '45_days' | '2_months';

export const AppointmentPaymentModal: React.FC<AppointmentPaymentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  doctor: propDoctor,
  patient: propPatient,
  patientId: propPatientId,
  insurance: propInsurance,
  allReasons: propAllReasons,
  existingPayments: propExistingPayments,
  initialMode = 'immediate',
  onAddPayment,
  onAddInstallment,
  onUpdateAppointmentStatus,
  getReasonTitle: propGetReasonTitle
}) => {
  const contextData = useData();
  const { 
    patients = [], 
    doctors = [], 
    allReasons: ctxAllReasons = [], 
    appointments = [],
    allAppointments = [],
    payments: allPayments = [],
    insurances = [],
    addPayment: ctxAddPayment,
    addInstallment: ctxAddInstallment,
    getReasonTitle: ctxGetReasonTitle
  } = contextData || {};

  const allReasonsList = propAllReasons || ctxAllReasons;
  const getReasonTitle = propGetReasonTitle || ctxGetReasonTitle || ((id: string) => id);

  // Selected Patient State (as requested: named selected_patient)
  const [selected_patient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // Selected Doctor State
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>('');

  // Mode Selection: 1. Immediate payment, 2. Installments & Deferred Payments (Merged)
  const [settlementMode, setSettlementMode] = useState<SettlementMode>(initialMode);

  // Immediate payment fields
  const [immediateMethod, setImmediateMethod] = useState<ImmediatePaymentMethod>('pos');
  const [payAmount, setPayAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [autoFinishVisit, setAutoFinishVisit] = useState<boolean>(true);
  const [receiptImage, setReceiptImage] = useState<string>('');
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync / Initialize selected_patient and defaults when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSettlementMode(initialMode);
      setReceiptImage('');
      
      let initialPatient: Patient | null = null;
      if (propPatient) {
        initialPatient = propPatient;
      } else if (appointment) {
        initialPatient = patients.find(p => p.uuid === appointment.patient_id) || null;
      } else if (propPatientId) {
        initialPatient = patients.find(p => p.uuid === propPatientId) || null;
      }

      setSelectedPatient(initialPatient);
      setPatientSearchQuery(initialPatient ? initialPatient.name : '');

      if (appointment) {
        setSelectedDoctorId(appointment.doctor_id || doctors[0]?.id || 1);
        setAutoFinishVisit(appointment.status === '3' || appointment.status === 'in_visit' || appointment.status === '4' || appointment.status === 'present');
      } else if (propDoctor) {
        setSelectedDoctorId(propDoctor.id);
        setAutoFinishVisit(false);
      } else {
        setSelectedDoctorId(doctors[0]?.id || 1);
        setAutoFinishVisit(false);
      }
    }
  }, [isOpen, appointment, propPatient, propPatientId, propDoctor, patients, doctors, initialMode]);

  // Derived effective insurance
  const effectiveInsurance = useMemo(() => {
    if (propInsurance) return propInsurance;
    if (selected_patient?.insurance_id) {
      return insurances.find(i => i.id === selected_patient.insurance_id);
    }
    return undefined;
  }, [propInsurance, selected_patient, insurances]);

  // Derived effective doctor
  const effectiveDoctor = useMemo(() => {
    if (propDoctor) return propDoctor;
    const docIdNum = typeof selectedDoctorId === 'string' ? parseInt(selectedDoctorId) : selectedDoctorId;
    return doctors.find(d => d.id === docIdNum) || doctors[0];
  }, [propDoctor, selectedDoctorId, doctors]);

  // Relevant payments for calculations
  const relevantExistingPayments = useMemo(() => {
    if (propExistingPayments) return propExistingPayments;
    if (appointment) {
      return allPayments.filter(p => p.appointment_uuid === appointment.uuid);
    }
    if (selected_patient) {
      return allPayments.filter(p => p.patient_id === selected_patient.uuid);
    }
    return [];
  }, [propExistingPayments, appointment, selected_patient, allPayments]);

  // Calculate Financials: If appointment exists, calculate for that appointment; otherwise calculate for the patient's entire ledger
  const financials = useMemo(() => {
    if (!selected_patient) {
      return {
        gross: 0,
        alreadyDiscount: 0,
        alreadyPaid: 0,
        remainingBeforeNewPay: 0,
        appointmentServices: []
      };
    }

    if (appointment) {
      // Single appointment context
      const gross = appointment.services.reduce((sum, item) => {
        const r = allReasonsList.find(reason => reason.uuid === item.reason_id);
        return sum + (r ? r.price * (item.quantity || 1) : 0);
      }, 0);

      const aptPayments = relevantExistingPayments;
      const alreadyPaid = aptPayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentDiscounts = aptPayments.reduce((sum, p) => sum + (p.discount || 0), 0);
      const aptDiscount = appointment.discount || 0;
      const alreadyDiscount = paymentDiscounts + aptDiscount;

      const net = Math.max(0, gross - alreadyDiscount);
      const remaining = Math.max(0, net - alreadyPaid);

      return {
        gross,
        alreadyDiscount,
        alreadyPaid,
        remainingBeforeNewPay: remaining,
        appointmentServices: appointment.services
      };
    } else {
      // Whole patient account context
      const aptsList = (allAppointments.length > 0 ? allAppointments : appointments).filter(
        a => a.patient_id === selected_patient.uuid
      );

      let totalGross = 0;
      let totalAptDiscounts = 0;
      const allServices: Array<{ reason_id: string; quantity: number }> = [];

      aptsList.forEach(apt => {
        totalAptDiscounts += (apt.discount || 0);
        apt.services.forEach(s => {
          allServices.push(s);
          const r = allReasonsList.find(reason => reason.uuid === s.reason_id);
          totalGross += (r ? r.price * (s.quantity || 1) : 0);
        });
      });

      const patientPayments = relevantExistingPayments;
      const alreadyPaid = patientPayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentDiscounts = patientPayments.reduce((sum, p) => sum + (p.discount || 0), 0);

      const alreadyDiscount = totalAptDiscounts + paymentDiscounts;
      const net = Math.max(0, totalGross - alreadyDiscount);
      const remaining = Math.max(0, net - alreadyPaid);

      return {
        gross: totalGross,
        alreadyDiscount,
        alreadyPaid,
        remainingBeforeNewPay: remaining,
        appointmentServices: allServices
      };
    }
  }, [selected_patient, appointment, allReasonsList, relevantExistingPayments, allAppointments, appointments]);

  const { gross, alreadyDiscount, alreadyPaid, remainingBeforeNewPay, appointmentServices } = financials;

  // Auto-fill amount when selected_patient changes or modal opens
  useEffect(() => {
    if (selected_patient && isOpen) {
      if (remainingBeforeNewPay > 0) {
        setPayAmount(remainingBeforeNewPay.toString());
      } else {
        setPayAmount('0');
      }
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
    }
  }, [selected_patient?.uuid, remainingBeforeNewPay, isOpen]);

  const currentDiscountNum = parseFloat(discountAmount) || 0;
  const currentPayNum = parseFloat(payAmount) || 0;
  const totalCalculatedDiscount = alreadyDiscount + currentDiscountNum;
  const netPayable = Math.max(0, gross - totalCalculatedDiscount);
  const effectiveRemainingToPay = Math.max(0, netPayable - alreadyPaid);

  // Installments / Deferred calculations
  const instDownNum = Math.min(effectiveRemainingToPay, Math.max(0, parseFloat(instDownPayment) || 0));
  const instRemainToSplit = Math.max(0, effectiveRemainingToPay - instDownNum);
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

      const patientLabel = selected_patient ? selected_patient.name : '';
      const desc = instCount === 1
        ? `وعده پرداخت موکول به بعد (${patientLabel})`
        : `قسط شماره ${i + 1} از ${instCount} (${patientLabel})`;

      items.push({
        index: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: Math.max(0, itemAmount),
        description: desc
      });
    }
    return items;
  }, [instRemainToSplit, instCount, instStartDate, instInterval, instPerMonthAmount, selected_patient]);

  // Filtered patients for selection step (when selected_patient is null)
  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients.slice(0, 8);
    const q = patientSearchQuery.trim().toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.phone_number && p.phone_number.includes(q)) ||
      (p.national_id && p.national_id.includes(q))
    ).slice(0, 12);
  }, [patients, patientSearchQuery]);

  const handleApplyFullSettlement = () => {
    setPayAmount(effectiveRemainingToPay.toString());
    setDiscountAmount('0');
  };

  const handleQuickDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setInstStartDate(d.toISOString().split('T')[0]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selected_patient) {
      toast.error('لطفاً بیمار را انتخاب کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalDocId = appointment?.doctor_id || (effectiveDoctor ? effectiveDoctor.id : (typeof selectedDoctorId === 'number' ? selectedDoctorId : parseInt(selectedDoctorId) || undefined));
      const addPaymentHandler = onAddPayment || ctxAddPayment;
      const addInstallmentHandler = onAddInstallment || ctxAddInstallment;

      if (settlementMode === 'immediate') {
        if (currentPayNum <= 0 && currentDiscountNum <= 0 && effectiveRemainingToPay > 0) {
          toast.error('لطفاً مبلغ پرداختی یا تخفیف معتبر وارد کنید.');
          setIsSubmitting(false);
          return;
        }

        const newPayment: Payment = {
          uuid: `pay-${Date.now()}`,
          patient_id: selected_patient.uuid,
          doctor_id: finalDocId,
          appointment_uuid: appointment?.uuid,
          amount: currentPayNum,
          discount: currentDiscountNum,
          date: new Date().toISOString(),
          payment_method: immediateMethod,
          description: description.trim() || `تسویه حساب ${selected_patient.name}`,
          receipt_image: receiptImage || undefined
        };

        if (addPaymentHandler) {
          await addPaymentHandler(newPayment);
        }

        if (autoFinishVisit && onUpdateAppointmentStatus && appointment && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(
          currentPayNum > 0 
            ? `پرداخت مبلغ ${formatCurrency(currentPayNum)} با موفقیت در صندوق ثبت شد.`
            : 'تخفیف و تسویه حساب با موفقیت بروزرسانی شد.'
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

        // Down payment recording
        if (instDownNum > 0 && addPaymentHandler) {
          const downPaymentObj: Payment = {
            uuid: `pay-${Date.now()}-inst-down`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            appointment_uuid: appointment?.uuid,
            amount: instDownNum,
            discount: currentDiscountNum,
            date: new Date().toISOString(),
            payment_method: instDownPaymentMethod,
            description: instCount === 1 
              ? `پیش‌پرداخت نوبت (مانده به سررسید ${formatJalaliDate(instStartDate)} موکول شد)`
              : `پیش‌پرداخت طرح اقساط ${instCount} مرحله‌ای نوبت درمان`,
            receipt_image: receiptImage || undefined
          };
          await addPaymentHandler(downPaymentObj);
        }

        // Add Installments
        for (const instItem of generatedSchedule) {
          const isSingleDeferred = instCount === 1;
          const newInst: Installment = {
            uuid: `inst-${Date.now()}-${instItem.index}${isSingleDeferred ? '-def' : ''}`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            amount: instItem.amount,
            due_date: new Date(instItem.dueDate).toISOString(),
            status: 'pending',
            description: instNotes.trim() ? `${instItem.description} - ${instNotes.trim()}` : instItem.description,
            created_at: new Date().toISOString()
          };

          if (addInstallmentHandler) {
            await addInstallmentHandler(newInst);
          }
        }

        if (instCount === 1 && instDownNum === 0 && addPaymentHandler) {
          const debtRecord: Payment = {
            uuid: `pay-${Date.now()}-debt`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            appointment_uuid: appointment?.uuid,
            amount: 0,
            discount: currentDiscountNum,
            date: new Date().toISOString(),
            payment_method: 'debt',
            description: `ثبت تعهد پرداخت مانده ${formatCurrency(instRemainToSplit)} برای سررسید ${formatJalaliDate(instStartDate)}`
          };
          await addPaymentHandler(debtRecord);
        }

        if (autoFinishVisit && onUpdateAppointmentStatus && appointment && (appointment.status !== '0' && appointment.status !== 'finished')) {
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
      }, 350);

    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('خطا در ثبت تسویه یا اقساط.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
      <div 
        className={clsx(
          "w-full bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 transition-all duration-300",
          selected_patient ? "max-w-4xl" : "max-w-xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vibrant Primary Gradient Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-600 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">
                  {selected_patient ? 'تسویه حساب و دریافت وجه' : 'انتخاب پرونده طرف حساب'}
                </h3>
                {selected_patient && (
                  <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[11px] font-bold backdrop-blur-sm">
                    {selected_patient.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-primary-100 mt-0.5 font-bold">
                {appointment ? (
                  `نوبت ساعت ${formatJalaliTime(appointment.for_date)} (${formatJalaliDate(appointment.for_date)}) ${effectiveDoctor ? `• پزشک: ${effectiveDoctor.name}` : ''}`
                ) : selected_patient ? (
                  `پرونده مالی بیمار • ${effectiveDoctor ? `پزشک معالج: ${effectiveDoctor.name}` : 'صندوق درمانگاه'}`
                ) : (
                  'برای شروع تسویه یا ایجاد اقساط، لطفاً پرونده بیمار را جستجو و انتخاب کنید'
                )}
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

        {/* ========================================================================= */}
        {/* VIEW 1: PATIENT SELECTION VIEW (When selected_patient is NOT set) */}
        {/* ========================================================================= */}
        {!selected_patient ? (
          <div className="p-6 space-y-4 overflow-y-auto text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 dark:text-gray-200 block">
                جستجوی نام یا شماره تماس بیمار:
              </label>
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  autoFocus
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  placeholder="نام، کد ملی یا شماره همراه بیمار..."
                  className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-gray-400 block px-1">
                {patientSearchQuery.trim() ? `نتایج جستجو (${filteredPatients.length}):` : 'بیماران اخیر درمانگاه:'}
              </span>
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 max-h-64 overflow-y-auto scrollbar-thin">
                {filteredPatients.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <User size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">بیماری با این مشخصات یافت نشد.</p>
                  </div>
                ) : (
                  filteredPatients.map(p => (
                    <div
                      key={p.uuid}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientSearchQuery(p.name);
                      }}
                      className="p-3.5 hover:bg-primary-50/70 dark:hover:bg-primary-950/40 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-xs">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono dir-ltr">{p.phone_number || 'بدون شماره تماس'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary-600 text-xs font-bold">
                        <span>انتخاب و ورود به تسویه</span>
                        <ArrowLeft size={14} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: 2-COLUMN SPLIT PANE (When selected_patient IS set) */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row text-right">
            
            {/* ========================================================================= */}
            {/* COLUMN 1 (RIGHT SIDE): Patient & Financial Balance Card (Sticky) */}
            {/* ========================================================================= */}
            <div className="w-full md:w-[340px] bg-slate-50/80 dark:bg-gray-800/40 p-5 border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-800 flex flex-col gap-4 overflow-y-auto scrollbar-thin shrink-0">
              
              {/* Patient Header with switch option */}
              <div className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black shrink-0 border border-primary-200 dark:border-primary-800">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-black text-xs text-gray-900 dark:text-white block truncate">{selected_patient.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono dir-ltr block truncate">
                        {selected_patient.phone_number || 'بدون تماس'} {effectiveInsurance && `• ${effectiveInsurance.title}`}
                      </span>
                    </div>
                  </div>
                </div>

                {!appointment && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="w-full mt-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1 transition-all border border-gray-200 dark:border-gray-600"
                  >
                    <RefreshCw size={11} />
                    <span>تغییر یا انتخاب بیمار دیگر</span>
                  </button>
                )}
              </div>

              {/* Services or Treatment Breakdown */}
              {appointmentServices.length > 0 && (
                <div className="space-y-1.5 flex-1 min-h-0">
                  <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 block px-1">
                    {appointment ? `خدمات ارائه شده در نوبت (${appointmentServices.length}):` : `خدمات و طرح‌های درمان بیمار (${appointmentServices.length}):`}
                  </span>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 max-h-36 overflow-y-auto scrollbar-thin text-xs">
                    {appointmentServices.map((item, idx) => {
                      const serviceInfo = allReasonsList.find(r => r.uuid === item.reason_id);
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
              )}

              {/* Financial Ledger Breakdown */}
              <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>جمع کل خدمات:</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(gross)}</span>
                </div>

                {totalCalculatedDiscount > 0 && (
                  <div className="flex justify-between text-primary-600 dark:text-primary-400">
                    <span>تخفیف کل:</span>
                    <span className="font-mono font-bold">-{formatCurrency(totalCalculatedDiscount)}</span>
                  </div>
                )}

                {alreadyPaid > 0 && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>پرداختی قبلی ({relevantExistingPayments.length}):</span>
                    <span className="font-mono font-bold">-{formatCurrency(alreadyPaid)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-black text-gray-900 dark:text-white">مانده قابل تسویه:</span>
                  <span className={clsx(
                    "font-black font-mono text-sm",
                    effectiveRemainingToPay <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {effectiveRemainingToPay <= 0 ? 'تسویه شده ✓' : formatCurrency(effectiveRemainingToPay)}
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

                {/* Doctor Selection if not tied to fixed appointment */}
                {!appointment && (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                      پزشک معالج طرف حساب:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none appearance-none focus:border-primary-500 shadow-xs"
                      >
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                )}

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
                          {effectiveRemainingToPay > 0 && (
                            <button
                              type="button"
                              onClick={handleApplyFullSettlement}
                              className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              تسویه کامل مانده ({formatCurrency(effectiveRemainingToPay)})
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
                        placeholder="مثال: تسویه کامل حساب، بیعانه..."
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 shadow-xs"
                      />
                    </div>

                    {/* Receipt Image Upload */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <Camera size={13}/> تصویر فیش بانکی (اختیاری):
                      </label>
                      <div 
                        onClick={() => fileInputRef.current?.click()} 
                        className={clsx(
                          "border-2 border-dashed rounded-xl p-2.5 flex flex-col items-center justify-center transition-all cursor-pointer group",
                          receiptImage ? "border-primary-500 bg-primary-50/10" : "border-gray-200 dark:border-gray-700 hover:border-primary-400"
                        )}
                      >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                        {receiptImage ? (
                          <div className="relative w-full flex items-center justify-center">
                            <img src={receiptImage} alt="Receipt Preview" className="w-full h-auto max-h-20 object-contain rounded-lg" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setReceiptImage(''); }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-xs"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 group-hover:text-primary-500">
                            <Upload size={16} />
                            <span className="text-[10px] font-bold">بارگذاری تصویر فیش</span>
                          </div>
                        )}
                      </div>
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
                          max={effectiveRemainingToPay}
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
                {appointment && (appointment.status !== '0' && appointment.status !== 'finished') && (
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
        )}
      </div>
    </div>
  );
};
