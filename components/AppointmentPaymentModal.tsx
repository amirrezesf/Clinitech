import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Check, CreditCard, DollarSign, Smartphone, FileText, 
  Printer, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight,
  Receipt, Plus, Trash2, Calendar, User, Phone, Hash, Tag,
  Clock, Stethoscope, ChevronDown, ChevronUp, CheckCheck, CalendarDays,
  Layers, Sparkles, Calculator, AlertTriangle, Info, ArrowLeft,
  Search, Upload, Camera, RefreshCw, UserCheck, CheckCircle
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
  installment?: Installment | null;
  insurance?: Insurance | null;
  allReasons?: AppointmentReason[];
  existingPayments?: Payment[];
  initialMode?: 'immediate' | 'pay_later' | 'installments' | 'collect_installment';
  onAddPayment?: (payment: Payment) => Promise<void> | void;
  onAddInstallment?: (installment: Installment) => Promise<void> | void;
  onUpdateInstallment?: (id: string, updates: Partial<Installment>) => Promise<void> | void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment['status']) => Promise<void> | void;
  getReasonTitle?: (id: string) => string;
}

type SettlementMode = 'immediate' | 'pay_later' | 'installments' | 'collect_installment';
type ImmediatePaymentMethod = 'pos' | 'cash' | 'card_to_card';
type InstallmentInterval = '15_days' | '1_month' | '45_days' | '2_months';

export const AppointmentPaymentModal: React.FC<AppointmentPaymentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  doctor: propDoctor,
  patient: propPatient,
  patientId: propPatientId,
  installment: propInstallment,
  insurance: propInsurance,
  allReasons: propAllReasons,
  existingPayments: propExistingPayments,
  initialMode = 'immediate',
  onAddPayment,
  onAddInstallment,
  onUpdateInstallment,
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
    installments: allInstallments = [],
    insurances = [],
    addPayment: ctxAddPayment,
    addInstallment: ctxAddInstallment,
    updateInstallment: ctxUpdateInstallment,
    getReasonTitle: ctxGetReasonTitle
  } = contextData || {};

  const allReasonsList = propAllReasons || ctxAllReasons;
  const getReasonTitle = propGetReasonTitle || ctxGetReasonTitle || ((id: string) => id);

  // Selected Patient State
  const [selected_patient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  
  // Selected Doctor State
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | string>('');

  // Primary Settlement Mode:
  // 1. 'immediate': پرداخت آنی (نقد / پوز / کارت به کارت)
  // 2. 'pay_later': موکول به بعد (وعده پرداخت در یک سررسید مشخص)
  // 3. 'installments': طرح تقسیط (اقساط چندمرحله‌ای با تقویم پرداخت)
  // 4. 'collect_installment': وصول قسط یا وصول وعده پرداخت موجود
  const [settlementMode, setSettlementMode] = useState<SettlementMode>(initialMode);

  // Active installment being collected (if any)
  const [activeInstallment, setActiveInstallment] = useState<Installment | null>(propInstallment || null);

  // Payment inputs
  const [immediateMethod, setImmediateMethod] = useState<ImmediatePaymentMethod>('pos');
  const [payAmount, setPayAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [autoFinishVisit, setAutoFinishVisit] = useState<boolean>(true);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Payment Date field (تاریخ پرداخت)
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Installments & Pay-later Fields
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

  // Single Pay-Later (Promised Date) fields
  const [promiseDueDate, setPromiseDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [promiseNotes, setPromiseNotes] = useState<string>('');

  // UI display toggles
  const [isServicesExpanded, setIsServicesExpanded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine if an installment is a single promised payment (موکول به بعد)
  const isPayLaterPromise = (inst: Installment | null | undefined): boolean => {
    if (!inst) return false;
    return (
      inst.description?.includes('وعده پرداخت') || 
      inst.uuid?.includes('-def') || 
      inst.description?.includes('موکول') ||
      false
    );
  };

  // Sync / Initialize state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setReceiptImage('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      
      let initialPatient: Patient | null = null;
      if (propPatient) {
        initialPatient = propPatient;
      } else if (propInstallment) {
        initialPatient = patients.find(p => p.uuid === propInstallment.patient_id) || null;
      } else if (appointment) {
        initialPatient = patients.find(p => p.uuid === appointment.patient_id) || null;
      } else if (propPatientId) {
        initialPatient = patients.find(p => p.uuid === propPatientId) || null;
      }

      setSelectedPatient(initialPatient);
      setPatientSearchQuery(initialPatient ? initialPatient.name : '');

      if (propInstallment) {
        setActiveInstallment(propInstallment);
        setSettlementMode('collect_installment');
        setPayAmount(propInstallment.amount.toString());
        setDiscountAmount('0');
        const isPromise = isPayLaterPromise(propInstallment);
        setDescription(isPromise ? `وصول وعده پرداخت: ${propInstallment.description}` : `وصول قسط: ${propInstallment.description}`);
        if (propInstallment.doctor_id) {
          setSelectedDoctorId(propInstallment.doctor_id);
        }
      } else {
        setActiveInstallment(null);
        setSettlementMode(initialMode);
      }

      if (appointment) {
        setSelectedDoctorId(appointment.doctor_id || doctors[0]?.id || 1);
        setAutoFinishVisit(appointment.status === '3' || appointment.status === 'in_visit' || appointment.status === '4' || appointment.status === 'present');
      } else if (propDoctor) {
        setSelectedDoctorId(propDoctor.id);
        setAutoFinishVisit(false);
      } else if (propInstallment?.doctor_id) {
        setSelectedDoctorId(propInstallment.doctor_id);
        setAutoFinishVisit(false);
      } else {
        setSelectedDoctorId(doctors[0]?.id || 1);
        setAutoFinishVisit(false);
      }
    }
  }, [isOpen, appointment, propPatient, propPatientId, propInstallment, propDoctor, patients, doctors, initialMode]);

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

  // Calculate Financials: Appointment or Patient ledger
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
  }, [selected_patient, appointment, allReasonsList, relevantExistingPayments, appointments, allAppointments]);

  const { gross, alreadyDiscount, alreadyPaid, remainingBeforeNewPay, appointmentServices } = financials;

  // Pending installments for this patient
  const patientPendingInstallments = useMemo(() => {
    if (!selected_patient) return [];
    return allInstallments.filter(
      inst => inst.patient_id === selected_patient.uuid && inst.status === 'pending'
    ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [selected_patient, allInstallments]);

  // Set default pay amount when mode switches or patient changes
  useEffect(() => {
    if (settlementMode === 'immediate' && remainingBeforeNewPay > 0 && !propInstallment) {
      setPayAmount(remainingBeforeNewPay.toString());
      setDiscountAmount('0');
    } else if (settlementMode === 'collect_installment' && activeInstallment) {
      setPayAmount(activeInstallment.amount.toString());
      setDiscountAmount('0');
    } else if (settlementMode === 'pay_later') {
      setInstDownPayment('0');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setPromiseDueDate(defaultDate.toISOString().split('T')[0]);
      setPromiseNotes('');
    } else if (settlementMode === 'installments') {
      setInstDownPayment('0');
      setInstDownPaymentMethod('pos');
      setInstCount(3);
      setInstInterval('1_month');
      const defaultInstDate = new Date();
      defaultInstDate.setDate(defaultInstDate.getDate() + 7);
      setInstStartDate(defaultInstDate.toISOString().split('T')[0]);
      setInstNotes('');
    }
  }, [selected_patient?.uuid, remainingBeforeNewPay, isOpen, settlementMode, propInstallment]);

  const currentDiscountNum = parseFloat(discountAmount) || 0;
  const currentPayNum = parseFloat(payAmount) || 0;
  const totalCalculatedDiscount = alreadyDiscount + currentDiscountNum;
  const netPayable = Math.max(0, gross - totalCalculatedDiscount);
  const effectiveRemainingToPay = Math.max(0, netPayable - alreadyPaid);

  // Installments calculations
  const instDownNum = Math.min(effectiveRemainingToPay, Math.max(0, parseFloat(instDownPayment) || 0));
  const instRemainToSplit = Math.max(0, effectiveRemainingToPay - instDownNum);
  const instPerMonthAmount = instCount > 0 ? Math.round(instRemainToSplit / instCount) : 0;

  // Generated Installments schedule (for multi-installment mode)
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
      const desc = `قسط شماره ${i + 1} از ${instCount} (${patientLabel})`;

      items.push({
        index: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: Math.max(0, itemAmount),
        description: desc
      });
    }
    return items;
  }, [instRemainToSplit, instCount, instStartDate, instInterval, instPerMonthAmount, selected_patient]);

  // Filtered patients for selection step
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

  const handleApplyFullInstallmentSettlement = (targetInst: Installment) => {
    setPayAmount(targetInst.amount.toString());
    setDiscountAmount('0');
  };

  const handleQuickPromiseDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setPromiseDueDate(d.toISOString().split('T')[0]);
  };

  const handleQuickInstDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setInstStartDate(d.toISOString().split('T')[0]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to convert date string (YYYY-MM-DD) into full ISO string preserving current time
  const getEffectivePaymentDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString();
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const now = new Date();
        const dateObj = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      const parsed = new Date(dateStr);
      return !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
    } catch {
      return new Date().toISOString();
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
      const updateInstallmentHandler = onUpdateInstallment || ctxUpdateInstallment;

      // -------------------------------------------------------------
      // 1. IMMEDIATE PAYMENT (نقدی / کارت‌خوان)
      // -------------------------------------------------------------
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
          discount: currentDiscountNum > 0 ? currentDiscountNum : undefined,
          date: getEffectivePaymentDate(paymentDate),
          payment_method: immediateMethod,
          description: description.trim() || `تسویه حساب نوبت ${selected_patient.name}`,
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
            : 'تخفیف و تسویه حساب با موفقیت اعمال شد.'
        );
      } 
      // -------------------------------------------------------------
      // 2. PROMISED / PAY LATER (موکول به بعد / تک‌سررسید)
      // -------------------------------------------------------------
      else if (settlementMode === 'pay_later') {
        if (instRemainToSplit <= 0 && instDownNum <= 0) {
          toast.error('مبلغی برای تعویق یا تسویه باقی نمانده است.');
          setIsSubmitting(false);
          return;
        }

        // Down payment recording (if any)
        if (instDownNum > 0 && addPaymentHandler) {
          const downPaymentObj: Payment = {
            uuid: `pay-${Date.now()}-down`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            appointment_uuid: appointment?.uuid,
            amount: instDownNum,
            discount: currentDiscountNum > 0 ? currentDiscountNum : undefined,
            date: getEffectivePaymentDate(paymentDate),
            payment_method: instDownPaymentMethod,
            description: `پیش‌پرداخت نوبت (مانده ${formatCurrency(instRemainToSplit)} به تاریخ ${formatJalaliDate(promiseDueDate)} موکول شد)`,
            receipt_image: receiptImage || undefined
          };
          await addPaymentHandler(downPaymentObj);
        }

        // Single Promised Payment / Installment
        if (instRemainToSplit > 0 && addInstallmentHandler) {
          const promiseDesc = promiseNotes.trim() 
            ? `وعده پرداخت موکول به بعد (${selected_patient.name}) - ${promiseNotes.trim()}`
            : `وعده پرداخت موکول به بعد (${selected_patient.name})`;

          const promisedInstallment: Installment = {
            uuid: `inst-${Date.now()}-def`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            amount: instRemainToSplit,
            due_date: new Date(promiseDueDate).toISOString(),
            status: 'pending',
            description: promiseDesc,
            created_at: new Date().toISOString()
          };
          await addInstallmentHandler(promisedInstallment);
        }

        // Record debt tracking entry if no down payment
        if (instDownNum === 0 && addPaymentHandler) {
          const debtRecord: Payment = {
            uuid: `pay-${Date.now()}-debt`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            appointment_uuid: appointment?.uuid,
            amount: 0,
            discount: currentDiscountNum > 0 ? currentDiscountNum : undefined,
            date: getEffectivePaymentDate(paymentDate),
            payment_method: 'debt',
            description: `ثبت تعهد پرداخت مانده ${formatCurrency(instRemainToSplit)} برای موعد ${formatJalaliDate(promiseDueDate)}`
          };
          await addPaymentHandler(debtRecord);
        }

        if (autoFinishVisit && onUpdateAppointmentStatus && appointment && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(`وعده پرداخت مبلغ ${formatCurrency(instRemainToSplit)} برای سررسید ${formatJalaliDate(promiseDueDate)} ثبت شد.`);
      }
      // -------------------------------------------------------------
      // 3. MULTI-STAGE INSTALLMENTS (طرح تقسیط چندمرحله‌ای)
      // -------------------------------------------------------------
      else if (settlementMode === 'installments') {
        if (instRemainToSplit <= 0 && instDownNum <= 0) {
          toast.error('مبلغی برای تقسیط باقی نمانده است.');
          setIsSubmitting(false);
          return;
        }

        if (generatedSchedule.length === 0 && instRemainToSplit > 0) {
          toast.error('برنامه اقساط معتبر نیست.');
          setIsSubmitting(false);
          return;
        }

        // Down payment recording (if any)
        if (instDownNum > 0 && addPaymentHandler) {
          const downPaymentObj: Payment = {
            uuid: `pay-${Date.now()}-inst-down`,
            patient_id: selected_patient.uuid,
            doctor_id: finalDocId,
            appointment_uuid: appointment?.uuid,
            amount: instDownNum,
            discount: currentDiscountNum > 0 ? currentDiscountNum : undefined,
            date: getEffectivePaymentDate(paymentDate),
            payment_method: instDownPaymentMethod,
            description: `پیش‌پرداخت طرح اقساط ${instCount} مرحله‌ای نوبت درمان`,
            receipt_image: receiptImage || undefined
          };
          await addPaymentHandler(downPaymentObj);
        }

        // Add Installments
        for (const instItem of generatedSchedule) {
          const newInst: Installment = {
            uuid: `inst-${Date.now()}-${instItem.index}`,
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

        if (autoFinishVisit && onUpdateAppointmentStatus && appointment && (appointment.status !== '0' && appointment.status !== 'finished')) {
          await onUpdateAppointmentStatus(appointment.uuid, '0');
        }

        toast.success(`طرح اقساط (${instCount} قسط به ارزش کل ${formatCurrency(instRemainToSplit)}) با موفقیت صادر شد.`);
      }
      // -------------------------------------------------------------
      // 4. COLLECT INSTALLMENT OR PROMISE (وصول قسط یا وعده پرداخت)
      // -------------------------------------------------------------
      else if (settlementMode === 'collect_installment') {
        const targetInst = activeInstallment || patientPendingInstallments[0];
        if (!targetInst) {
          toast.error('هیچ قسط یا تعهد فعالی برای وصول انتخاب نشده است.');
          setIsSubmitting(false);
          return;
        }

        if (currentPayNum <= 0) {
          toast.error('لطفاً مبلغ دریافتی جهت وصول را وارد نمایید.');
          setIsSubmitting(false);
          return;
        }

        const isPromise = isPayLaterPromise(targetInst);
        const netReceived = Math.max(0, currentPayNum - currentDiscountNum);

        const newPayment: Payment = {
          uuid: `pay-inst-${Date.now()}`,
          patient_id: selected_patient.uuid,
          doctor_id: finalDocId || targetInst.doctor_id,
          appointment_uuid: appointment?.uuid,
          amount: netReceived,
          discount: currentDiscountNum > 0 ? currentDiscountNum : undefined,
          date: getEffectivePaymentDate(paymentDate),
          payment_method: immediateMethod,
          installment_uuid: targetInst.uuid,
          receipt_image: receiptImage || undefined,
          description: description.trim() 
            ? `${isPromise ? 'وصول وعده پرداخت' : 'وصول قسط'}: ${targetInst.description} (${description.trim()})`
            : `${isPromise ? 'وصول وعده پرداخت' : 'وصول قسط'}: ${targetInst.description}`
        };

        if (addPaymentHandler) {
          await addPaymentHandler(newPayment);
        }

        if (updateInstallmentHandler) {
          if (currentPayNum >= targetInst.amount) {
            await updateInstallmentHandler(targetInst.uuid, { status: 'paid' });
            toast.success(`${isPromise ? 'تسویه کامل تعهد پرداخت' : 'وصول کامل قسط'} به مبلغ ${formatCurrency(netReceived)} با موفقیت در صندوق ثبت گردید.`);
          } else {
            const remainingAmount = Math.max(0, targetInst.amount - currentPayNum);
            await updateInstallmentHandler(targetInst.uuid, {
              amount: remainingAmount,
              description: `${targetInst.description} (مانده پس از وصول: ${formatCurrency(remainingAmount)})`
            });
            toast.success(`وصول علی‌الحساب به مبلغ ${formatCurrency(netReceived)} ثبت شد. مانده: ${formatCurrency(remainingAmount)}`);
          }
        }
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

  const isCollectingPromise = settlementMode === 'collect_installment' && isPayLaterPromise(activeInstallment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header with Dynamic Context Identification */}
        <div className={clsx(
          "px-5 py-3.5 text-white flex items-center justify-between shadow-sm shrink-0 transition-colors",
          settlementMode === 'collect_installment'
            ? isCollectingPromise 
              ? "bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700" 
              : "bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800"
            : "bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-600"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
              {settlementMode === 'collect_installment' ? (
                isCollectingPromise ? <Clock size={19} /> : <CheckCircle size={19} />
              ) : (
                <Receipt size={19} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black">
                  {settlementMode === 'collect_installment' ? (
                    isCollectingPromise ? 'وصول وعده پرداخت (موکول به بعد)' : 'وصول و تسویه قسط دوره‌ای'
                  ) : appointment ? (
                    'تسویه حساب نوبت بیمار'
                  ) : selected_patient ? (
                    'تسویه حساب و صندوق درمانگاه'
                  ) : (
                    'انتخاب پرونده بیمار جهت تسویه'
                  )}
                </h3>
                {selected_patient && (
                  <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-bold backdrop-blur-sm">
                    {selected_patient.name}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/90 mt-0.5 font-bold">
                {settlementMode === 'collect_installment' && activeInstallment ? (
                  `سررسید: ${formatJalaliDate(activeInstallment.due_date)} • مبلغ تعهد: ${formatCurrency(activeInstallment.amount)}`
                ) : appointment ? (
                  `نوبت ساعت ${formatJalaliTime(appointment.for_date)} (${formatJalaliDate(appointment.for_date)}) ${effectiveDoctor ? `• پزشک: دکتر ${effectiveDoctor.name}` : ''}`
                ) : selected_patient ? (
                  `پرونده مالی • ${effectiveDoctor ? `طرف حساب: دکتر ${effectiveDoctor.name}` : 'صندوق عمومی'}`
                ) : (
                  'لطفاً بیمار مورد نظر را برای تسویه یا ایجاد اقساط انتخاب کنید'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: PATIENT SELECTION VIEW (When selected_patient is NOT set) */}
        {/* ========================================================================= */}
        {!selected_patient ? (
          <div className="p-6 space-y-4 overflow-y-auto text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 dark:text-gray-200 block">
                جستجوی نام، کد ملی یا شماره همراه بیمار:
              </label>
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  autoFocus
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  placeholder="نام یا شماره همراه بیمار را وارد کنید..."
                  className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-gray-400 block px-1">
                {patientSearchQuery.trim() ? `نتایج جستجو (${filteredPatients.length}):` : 'بیماران درمانگاه:'}
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
                        <span>انتخاب پرونده</span>
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
          /* VIEW 2: 2-COLUMN BALANCED WORKFLOW (When selected_patient IS set) */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row text-right">
            
            {/* ========================================================================= */}
            {/* COLUMN 1 (RIGHT SIDE): Patient Summary & Financial Ledger */}
            {/* ========================================================================= */}
            <div className="w-full md:w-[280px] lg:w-[300px] bg-slate-50/70 dark:bg-gray-800/30 p-4 border-b md:border-b-0 md:border-l border-gray-200/80 dark:border-gray-800 flex flex-col gap-3 overflow-y-auto scrollbar-thin shrink-0">
              
              {/* Patient Card */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black shrink-0 border border-primary-200/60 dark:border-primary-800/60">
                    <User size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-black text-xs text-gray-900 dark:text-white block truncate">{selected_patient.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono dir-ltr block truncate">
                      {selected_patient.phone_number || 'بدون تماس'} {effectiveInsurance && `• ${effectiveInsurance.title}`}
                    </span>
                  </div>
                </div>

                {!appointment && !propInstallment && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="w-full py-1 px-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/60 dark:hover:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1 transition-all border border-gray-200/60 dark:border-gray-700"
                  >
                    <RefreshCw size={10} />
                    <span>تغییر بیمار</span>
                  </button>
                )}
              </div>

              {/* Financial Balance Summary or Installment Snapshot */}
              {settlementMode === 'collect_installment' && activeInstallment ? (
                <div className={clsx(
                  "p-3 rounded-xl border space-y-2 text-xs",
                  isCollectingPromise 
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[11px]">
                      {isCollectingPromise ? 'مبلغ وعده داده شده:' : 'مبلغ سررسید قسط:'}
                    </span>
                    <span className="font-mono font-black text-sm">
                      {formatCurrency(activeInstallment.amount)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold space-y-0.5 pt-1.5 border-t border-black/10 dark:border-white/10">
                    <div className="truncate font-black">{activeInstallment.description}</div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <span>تاریخ موعد:</span>
                      <span>{formatJalaliDate(activeInstallment.due_date)}</span>
                      {new Date(activeInstallment.due_date) < new Date() && (
                        <span className="text-red-500 font-black">(معوق / گذشته)</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 space-y-2 text-xs shadow-xs">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                    <span>جمع خدمات نوبت:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(gross)}</span>
                  </div>

                  {totalCalculatedDiscount > 0 && (
                    <div className="flex justify-between text-primary-600 dark:text-primary-400 text-[11px]">
                      <span>تخفیف:</span>
                      <span className="font-mono font-bold">-{formatCurrency(totalCalculatedDiscount)}</span>
                    </div>
                  )}

                  {alreadyPaid > 0 && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400 text-[11px]">
                      <span>پرداختی قبلی:</span>
                      <span className="font-mono font-bold">-{formatCurrency(alreadyPaid)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-black text-gray-900 dark:text-white text-xs">مانده نوبت:</span>
                    <span className={clsx(
                      "font-black font-mono text-sm",
                      effectiveRemainingToPay <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {effectiveRemainingToPay <= 0 ? 'تسویه شده ✓' : formatCurrency(effectiveRemainingToPay)}
                    </span>
                  </div>
                </div>
              )}

              {/* Collapsible Services List */}
              {appointmentServices.length > 0 && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsServicesExpanded(!isServicesExpanded)}
                    className="w-full py-1.5 px-2 bg-white dark:bg-gray-800 hover:bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between border border-gray-200/80 dark:border-gray-700 transition-all"
                  >
                    <span>ریز خدمات نوبت ({appointmentServices.length})</span>
                    {isServicesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {isServicesExpanded && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60 max-h-32 overflow-y-auto scrollbar-thin text-[11px] p-1 animate-in fade-in">
                      {appointmentServices.map((item, idx) => {
                        const serviceInfo = allReasonsList.find(r => r.uuid === item.reason_id);
                        const unitPrice = serviceInfo?.price || 0;
                        const totalItemPrice = unitPrice * (item.quantity || 1);

                        return (
                          <div key={idx} className="p-1.5 flex items-center justify-between">
                            <span className="font-bold text-gray-800 dark:text-gray-200 truncate pr-1">
                              {serviceInfo?.title || getReasonTitle(item.reason_id)}
                            </span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white shrink-0">
                              {formatCurrency(totalItemPrice)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Pending Installments Alert Pill */}
              {patientPendingInstallments.length > 0 && settlementMode !== 'collect_installment' && (
                <button
                  type="button"
                  onClick={() => {
                    setSettlementMode('collect_installment');
                    const inst = activeInstallment || patientPendingInstallments[0];
                    if (inst) {
                      setActiveInstallment(inst);
                      setPayAmount(inst.amount.toString());
                      setDiscountAmount('0');
                      const isPromise = isPayLaterPromise(inst);
                      setDescription(isPromise ? `وصول وعده پرداخت: ${inst.description}` : `وصول قسط: ${inst.description}`);
                    }
                  }}
                  className="p-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-xl border border-amber-200/80 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between transition-all text-right"
                >
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-amber-600 shrink-0" />
                    <span>{patientPendingInstallments.length} قسط/وعده در انتظار وصول</span>
                  </span>
                  <span className="text-primary-600 dark:text-primary-400 underline font-black shrink-0">وصول سریع ←</span>
                </button>
              )}

            </div>

            {/* ========================================================================= */}
            {/* COLUMN 2 (LEFT SIDE): Transparent Action Controls (No Misleading Tabs) */}
            {/* ========================================================================= */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto scrollbar-thin space-y-4">
              
              <div className="space-y-4">

                {/* ------------------------------------------------------------- */}
                {/* CONTEXT 1: DEDICATED INSTALLMENT / PROMISE COLLECTION BANNER */}
                {/* ------------------------------------------------------------- */}
                {settlementMode === 'collect_installment' ? (
                  <div className={clsx(
                    "p-3 rounded-2xl border flex items-center justify-between",
                    isCollectingPromise
                      ? "bg-amber-50/90 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200"
                      : "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200"
                  )}>
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0",
                        isCollectingPromise ? "bg-amber-600" : "bg-emerald-600"
                      )}>
                        {isCollectingPromise ? <Clock size={14} /> : <CheckCheck size={14} />}
                      </div>
                      <div>
                        <span className="text-xs font-black block">
                          {isCollectingPromise ? 'عملیات وصول وعده پرداخت (موکول به بعد)' : 'عملیات وصول و تسویه قسط'}
                        </span>
                        <span className="text-[10px] opacity-80 block">
                          {isCollectingPromise 
                            ? 'ثبت فیش و دریافتی تعهد به تعویق افتاده بیمار در صندوق درمانگاه' 
                            : 'ثبت واریزی قسط در دفترچه اقساط و صندوق مالی'}
                        </span>
                      </div>
                    </div>

                    {!propInstallment && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementMode('immediate');
                          if (remainingBeforeNewPay > 0) setPayAmount(remainingBeforeNewPay.toString());
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-[10px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all shadow-xs"
                      >
                        بازگشت به گزینه‌های تسویه نوبت
                      </button>
                    )}
                  </div>
                ) : (
                  /* ------------------------------------------------------------- */
                  /* CONTEXT 2: THREE CLEAR & DISTINCT TABS FOR APPOINTMENT / CASH CHECKOUT */
                  /* ------------------------------------------------------------- */
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 block px-1">
                      نحوه تسویه هزینه نوبت را انتخاب کنید:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700">
                      
                      {/* TAB 1: IMMEDIATE PAYMENT */}
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementMode('immediate');
                          if (remainingBeforeNewPay > 0) setPayAmount(remainingBeforeNewPay.toString());
                        }}
                        className={clsx(
                          "py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5",
                          settlementMode === 'immediate'
                            ? "bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-200/60 dark:border-primary-800/60"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <CreditCard size={14} />
                          <span>پرداخت آنی</span>
                        </div>
                        <span className="text-[9px] font-normal opacity-70">نقدی / پوز</span>
                      </button>

                      {/* TAB 2: PROMISED / PAY LATER */}
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementMode('pay_later');
                        }}
                        className={clsx(
                          "py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5",
                          settlementMode === 'pay_later'
                            ? "bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200/60 dark:border-amber-800/60"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>موکول به بعد</span>
                        </div>
                        <span className="text-[9px] font-normal opacity-70">وعده پرداخت</span>
                      </button>

                      {/* TAB 3: MULTI-INSTALLMENTS */}
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementMode('installments');
                        }}
                        className={clsx(
                          "py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5",
                          settlementMode === 'installments'
                            ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200/60 dark:border-blue-800/60"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Layers size={14} />
                          <span>طرح تقسیط</span>
                        </div>
                        <span className="text-[9px] font-normal opacity-70">چندمرحله‌ای</span>
                      </button>

                    </div>
                  </div>
                )}

                {/* Doctor Selection (Only if not fixed by appointment) */}
                {!appointment && settlementMode !== 'collect_installment' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-200 shrink-0">
                      پزشک طرف حساب:
                    </label>
                    <div className="relative flex-1">
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full py-1.5 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none appearance-none focus:border-primary-500"
                      >
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* FORM 1: IMMEDIATE PAYMENT (پرداخت آنی) */}
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
                              "py-2 px-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                              isSelected
                                ? "bg-primary-600 border-primary-600 text-white shadow-xs"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <Icon size={13} />
                            <span>{gate.title}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Amount Input & Payment Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                            مبلغ دریافتی هم‌اکنون (تومان):
                          </label>
                          {effectiveRemainingToPay > 0 && (
                            <button
                              type="button"
                              onClick={handleApplyFullSettlement}
                              className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              تسویه کل مانده ({formatCurrency(effectiveRemainingToPay)})
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
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1">
                            <Calendar size={13} className="text-primary-600 dark:text-primary-400" />
                            <span>تاریخ پرداخت:</span>
                          </label>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {appointment?.for_date && (
                              <button
                                type="button"
                                onClick={() => setPaymentDate(appointment.for_date.split('T')[0])}
                                className="text-gray-500 hover:text-primary-600 dark:text-gray-400 font-bold hover:underline"
                              >
                                تاریخ نوبت
                              </button>
                            )}
                            {paymentDate !== new Date().toISOString().split('T')[0] && (
                              <button
                                type="button"
                                onClick={() => setPaymentDate(new Date().toISOString().split('T')[0])}
                                className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
                              >
                                امروز
                              </button>
                            )}
                          </div>
                        </div>
                        <PersianDatePicker
                          value={paymentDate}
                          onChange={(d) => setPaymentDate(d)}
                          placeholder="انتخاب تاریخ پرداخت..."
                          className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Discount & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500 font-mono text-left dir-ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          شرح / یادداشت:
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="توضیحات اختیاری..."
                          className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Receipt Image Upload Pill */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Camera size={12}/> تصویر فیش واریز / تراکنش (اختیاری):
                      </label>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                      {receiptImage ? (
                        <div className="flex items-center justify-between p-2 bg-primary-50/50 dark:bg-primary-950/30 rounded-xl border border-primary-200 dark:border-primary-800">
                          <div className="flex items-center gap-2">
                            <img src={receiptImage} alt="Receipt" className="w-8 h-8 object-cover rounded-lg" />
                            <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300">تصویر فیش ضمیمه شد</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReceiptImage('')}
                            className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all text-xs"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-3 border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-400 rounded-xl text-[11px] font-bold text-gray-500 hover:text-primary-600 flex items-center justify-center gap-1.5 transition-all bg-gray-50/50 dark:bg-gray-800/40"
                        >
                          <Upload size={13} />
                          <span>بارگذاری تصویر فیش بانکی</span>
                        </button>
                      )}
                    </div>

                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* FORM 2: PROMISED PAYMENT / PAY LATER (موکول به بعد) */}
                {/* ------------------------------------------------------------- */}
                {settlementMode === 'pay_later' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    
                    {/* Notice Banner */}
                    <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block">تسویه تعهدی در یک تاریخ سررسید مشخص</span>
                        <span className="text-[10px] opacity-80 block mt-0.5">
                          مانده نوبت ({formatCurrency(instRemainToSplit)}) به یک موعد سررسید مشخص موکول می‌شود و در دفترچه مطالبات ثبت خواهد شد.
                        </span>
                      </div>
                    </div>

                    {/* Down Payment (Optional) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          پیش‌پرداخت نقد (هم‌اکنون):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={effectiveRemainingToPay}
                          step="1000"
                          value={instDownPayment}
                          onChange={(e) => setInstDownPayment(e.target.value)}
                          placeholder="۰ تومان (اختیاری)"
                          className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-amber-500 font-mono text-left dir-ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          مبلغ مانده موکول شده:
                        </label>
                        <div className="p-2 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-xl text-xs font-black text-amber-900 dark:text-amber-200 font-mono text-left dir-ltr">
                          {formatCurrency(instRemainToSplit)}
                        </div>
                      </div>
                    </div>

                    {/* Down Payment Method and Date */}
                    {instDownNum > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 rounded-xl animate-in fade-in">
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-gray-700 dark:text-gray-200">
                            روش پرداخت پیش‌پرداخت:
                          </label>
                          <select
                            value={instDownPaymentMethod}
                            onChange={(e) => setInstDownPaymentMethod(e.target.value as ImmediatePaymentMethod)}
                            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none"
                          >
                            <option value="pos">کارت‌خوان (POS)</option>
                            <option value="cash">وجه نقد</option>
                            <option value="card_to_card">کارت به کارت</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-gray-700 dark:text-gray-200 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-amber-600" />
                              <span>تاریخ پرداخت پیش‌پرداخت:</span>
                            </span>
                            {paymentDate !== new Date().toISOString().split('T')[0] && (
                              <button
                                type="button"
                                onClick={() => setPaymentDate(new Date().toISOString().split('T')[0])}
                                className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline"
                              >
                                امروز
                              </button>
                            )}
                          </label>
                          <PersianDatePicker
                            value={paymentDate}
                            onChange={(d) => setPaymentDate(d)}
                            placeholder="تاریخ پرداخت پیش‌پرداخت"
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* Promised Due Date Picker with Quick Shortcuts */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          تاریخ موعد سررسید پرداخت:
                        </label>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button type="button" onClick={() => handleQuickPromiseDays(7)} className="text-amber-700 dark:text-amber-300 font-bold hover:underline">۱ هفته</button>
                          <span className="text-gray-300">•</span>
                          <button type="button" onClick={() => handleQuickPromiseDays(14)} className="text-amber-700 dark:text-amber-300 font-bold hover:underline">۲ هفته</button>
                          <span className="text-gray-300">•</span>
                          <button type="button" onClick={() => handleQuickPromiseDays(30)} className="text-amber-700 dark:text-amber-300 font-bold hover:underline">۱ ماه</button>
                        </div>
                      </div>
                      <PersianDatePicker
                        value={promiseDueDate}
                        onChange={(date) => setPromiseDueDate(date)}
                        placeholder="انتخاب تاریخ موعد سررسید..."
                      />
                    </div>

                    {/* Description Note */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                        شرح تعهد / شماره چک صیادی:
                      </label>
                      <input
                        type="text"
                        value={promiseNotes}
                        onChange={(e) => setPromiseNotes(e.target.value)}
                        placeholder="مثال: تسویه با دریافت حقوق ماهانه یا شماره چک صیادی..."
                        className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-amber-500"
                      />
                    </div>

                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* FORM 3: MULTI-STAGE INSTALLMENTS (طرح تقسیط) */}
                {/* ------------------------------------------------------------- */}
                {settlementMode === 'installments' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    
                    {/* Presets */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200 block">
                        تعداد اقساط:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
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

                    {/* Down Payment & Remaining to Split */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          پیش‌پرداخت نقد (اختیاری):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={effectiveRemainingToPay}
                          step="1000"
                          value={instDownPayment}
                          onChange={(e) => setInstDownPayment(e.target.value)}
                          placeholder="۰ تومان"
                          className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-left dir-ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          مانده قابل تقسیط:
                        </label>
                        <div className="p-2 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 rounded-xl text-xs font-black text-blue-900 dark:text-blue-200 font-mono text-left dir-ltr">
                          {formatCurrency(instRemainToSplit)}
                        </div>
                      </div>
                    </div>

                    {/* Down Payment Method and Date */}
                    {instDownNum > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40 rounded-xl animate-in fade-in">
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-gray-700 dark:text-gray-200">
                            روش دریافت پیش‌پرداخت:
                          </label>
                          <select
                            value={instDownPaymentMethod}
                            onChange={(e) => setInstDownPaymentMethod(e.target.value as ImmediatePaymentMethod)}
                            className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none"
                          >
                            <option value="pos">کارت‌خوان (POS)</option>
                            <option value="cash">وجه نقد</option>
                            <option value="card_to_card">کارت به کارت</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-gray-700 dark:text-gray-200 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-blue-600" />
                              <span>تاریخ پرداخت پیش‌پرداخت:</span>
                            </span>
                            {paymentDate !== new Date().toISOString().split('T')[0] && (
                              <button
                                type="button"
                                onClick={() => setPaymentDate(new Date().toISOString().split('T')[0])}
                                className="text-[10px] text-blue-600 font-bold hover:underline"
                              >
                                امروز
                              </button>
                            )}
                          </label>
                          <PersianDatePicker
                            value={paymentDate}
                            onChange={(d) => setPaymentDate(d)}
                            placeholder="تاریخ پرداخت پیش‌پرداخت"
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* Interval & First Due Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          فاصله زمانی اقساط:
                        </label>
                        <select
                          value={instInterval}
                          onChange={(e) => setInstInterval(e.target.value as InstallmentInterval)}
                          className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500"
                        >
                          <option value="15_days">هر ۱۵ روز (دو هفته)</option>
                          <option value="1_month">ماهانه (۳۰ روزه)</option>
                          <option value="45_days">هر ۴۵ روز</option>
                          <option value="2_months">هر ۲ ماه</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                            سررسید قسط اول:
                          </label>
                          <div className="flex items-center gap-1 text-[10px]">
                            <button type="button" onClick={() => handleQuickInstDays(7)} className="text-blue-600 font-bold hover:underline">۱ هفته</button>
                            <span className="text-gray-300">•</span>
                            <button type="button" onClick={() => handleQuickInstDays(30)} className="text-blue-600 font-bold hover:underline">۱ ماه</button>
                          </div>
                        </div>
                        <PersianDatePicker
                          value={instStartDate}
                          onChange={(date) => setInstStartDate(date)}
                          placeholder="تاریخ سررسید قسط اول"
                        />
                      </div>
                    </div>

                    {/* Visual Schedule Preview */}
                    {generatedSchedule.length > 0 && (
                      <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl space-y-1.5">
                        <div className="text-[11px] font-black text-blue-900 dark:text-blue-300 flex items-center justify-between">
                          <span>پیش‌نمایش جدول سررسید اقساط:</span>
                          <span className="font-mono">{formatCurrency(instPerMonthAmount)} / هر قسط</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
                          {generatedSchedule.map(item => (
                            <div key={item.index} className="p-1.5 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900 text-[10px] space-y-0.5">
                              <div className="flex justify-between font-bold text-gray-600 dark:text-gray-300">
                                <span>قسط {item.index}</span>
                                <span className="font-mono">{formatJalaliDate(item.dueDate)}</span>
                              </div>
                              <div className="font-black font-mono text-blue-700 dark:text-blue-300 dir-ltr text-left">
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    <div className="space-y-1">
                      <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                        شرح توافق / شماره قرارداد:
                      </label>
                      <input
                        type="text"
                        value={instNotes}
                        onChange={(e) => setInstNotes(e.target.value)}
                        placeholder="توضیحات اختیاری تقسیط..."
                        className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>

                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* FORM 4: COLLECT INSTALLMENT OR PROMISE (وصول قسط / تعهد) */}
                {/* ------------------------------------------------------------- */}
                {settlementMode === 'collect_installment' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    
                    {/* Switcher if multiple pending installments */}
                    {patientPendingInstallments.length > 1 && (
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-700">
                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                          انتخاب از میان ({patientPendingInstallments.length}) قسط باز:
                        </span>
                        <select
                          value={activeInstallment?.uuid || ''}
                          onChange={(e) => {
                            const found = patientPendingInstallments.find(i => i.uuid === e.target.value);
                            if (found) {
                              setActiveInstallment(found);
                              setPayAmount(found.amount.toString());
                              setDiscountAmount('0');
                              const isPromise = isPayLaterPromise(found);
                              setDescription(isPromise ? `وصول وعده پرداخت: ${found.description}` : `وصول قسط: ${found.description}`);
                            }
                          }}
                          className="text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 text-gray-800 dark:text-gray-200 outline-none"
                        >
                          {patientPendingInstallments.map(pi => (
                            <option key={pi.uuid} value={pi.uuid}>
                              {pi.description} ({formatCurrency(pi.amount)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
                              "py-2 px-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all",
                              isSelected
                                ? isCollectingPromise
                                  ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                                  : "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <Icon size={13} />
                            <span>{gate.title}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Amount & Payment Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                            مبلغ دریافتی (تومان):
                          </label>
                          {activeInstallment && (
                            <button
                              type="button"
                              onClick={() => handleApplyFullInstallmentSettlement(activeInstallment)}
                              className={clsx(
                                "text-[10px] font-bold hover:underline",
                                isCollectingPromise ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              تسویه کامل ({formatCurrency(activeInstallment.amount)})
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="مبلغ دریافتی..."
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr shadow-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1">
                            <Calendar size={13} className={isCollectingPromise ? "text-amber-600" : "text-emerald-600"} />
                            <span>تاریخ پرداخت / وصول:</span>
                          </label>
                          {paymentDate !== new Date().toISOString().split('T')[0] && (
                            <button
                              type="button"
                              onClick={() => setPaymentDate(new Date().toISOString().split('T')[0])}
                              className={clsx(
                                "text-[10px] font-bold hover:underline",
                                isCollectingPromise ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              امروز
                            </button>
                          )}
                        </div>
                        <PersianDatePicker
                          value={paymentDate}
                          onChange={(d) => setPaymentDate(d)}
                          placeholder="انتخاب تاریخ پرداخت..."
                          className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Discount & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-700 dark:text-gray-200">
                          شرح وصول:
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="توضیحات اختیاری وصول..."
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Receipt Image Upload */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Camera size={12}/> تصویر فیش بانکی وصول (اختیاری):
                      </label>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                      {receiptImage ? (
                        <div className="flex items-center justify-between p-2 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-2">
                            <img src={receiptImage} alt="Receipt" className="w-8 h-8 object-cover rounded-lg" />
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">تصویر فیش ضمیمه شد</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReceiptImage('')}
                            className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all text-xs"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-3 border border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-400 rounded-xl text-[11px] font-bold text-gray-500 hover:text-emerald-600 flex items-center justify-center gap-1.5 transition-all bg-gray-50/50 dark:bg-gray-800/40"
                        >
                          <Upload size={13} />
                          <span>بارگذاری تصویر فیش بانکی وصول</span>
                        </button>
                      )}
                    </div>

                  </div>
                )}

                {/* Status Auto-Finish Toggle (Only if appointment is not finished yet) */}
                {appointment && (appointment.status !== '0' && appointment.status !== 'finished') && (
                  <label className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoFinishVisit}
                      onChange={(e) => setAutoFinishVisit(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      تغییر خودکار وضعیت نوبت به «پایان‌یافته»
                    </span>
                  </label>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-gray-200/80 dark:border-gray-700 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={clsx(
                    "px-5 py-2.5 rounded-xl text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5",
                    settlementMode === 'immediate'
                      ? "bg-primary-600 hover:bg-primary-700 shadow-primary-600/20"
                      : settlementMode === 'pay_later'
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      : settlementMode === 'installments'
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                      : isCollectingPromise
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  <span>
                    {settlementMode === 'immediate'
                      ? 'ثبت پرداخت در صندوق'
                      : settlementMode === 'pay_later'
                      ? 'ثبت وعده پرداخت'
                      : settlementMode === 'installments'
                      ? 'صدور دفترچه اقساط'
                      : isCollectingPromise
                      ? 'ثبت تسویه تعهد در صندوق'
                      : 'ثبت وصول قسط در صندوق'}
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
