import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { 
  CreditCard, Search, Plus, Calendar, CheckCircle, Clock, 
  FileText, User, ChevronDown, Layers, X, Upload, Image as ImageIcon, 
  Stethoscope, Eye, Printer, Trash2, Tag, Hash, CalendarDays, 
  Download, Camera, Minus, PlusCircle, CheckCheck, AlertCircle, 
  DollarSign, Smartphone, Sparkles, Filter, AlertTriangle, ArrowUpRight,
  Receipt, SlidersHorizontal
} from 'lucide-react';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Payment, Installment } from '../types';

type PaymentTab = 'payments' | 'installments';
type PaymentMethodType = 'pos' | 'cash' | 'card_to_card' | 'debt';
type InstallmentInterval = '15_days' | '1_month' | '45_days' | '2_months';

export const Payments = () => {
  const { 
    payments, 
    installments, 
    patients, 
    reasons,
    allReasons,
    appointments,
    doctors,
    addPayment, 
    addInstallment, 
    updateInstallment, 
    getPatientName 
  } = useData();
  const { user } = useAuth();

  const location = useLocation();
  const [activeTab, setActiveTab] = useState<PaymentTab>('payments');
  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [installmentTypeFilter, setInstallmentTypeFilter] = useState<'all' | 'schedule' | 'pay_later'>('all');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [collectingInstallment, setCollectingInstallment] = useState<Installment | null>(null);

  // Quick Collect Installment Form State
  const [collectMethod, setCollectMethod] = useState<'pos' | 'cash' | 'card_to_card'>('pos');
  const [collectDiscount, setCollectDiscount] = useState('0');
  const [collectNotes, setCollectNotes] = useState('');

  // Searchable Dropdown State
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Payment Form States
  const [formDoctorId, setFormDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('pos');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [appointmentId, setAppointmentId] = useState<string | undefined>(undefined);

  // Merged Installment / Deferred Form States
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instDownPayment, setInstDownPayment] = useState('0');
  const [instDownPaymentMethod, setInstDownPaymentMethod] = useState<'pos' | 'cash' | 'card_to_card'>('pos');
  const [instCount, setInstCount] = useState(3);
  const [instInterval, setInstInterval] = useState<InstallmentInterval>('1_month');
  const [instStartDate, setInstStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [instDesc, setInstDesc] = useState('');

  // Calculate patient overall financial balance
  const selectedPatientBalance = useMemo(() => {
    if (!selectedPatientId) return { gross: 0, paid: 0, discount: 0, remaining: 0 };
    
    // Sum services from patient's appointments
    const patientApts = appointments.filter(a => a.patient_id === selectedPatientId);
    let totalServices = 0;
    let aptDiscounts = 0;
    patientApts.forEach(apt => {
      aptDiscounts += (apt.discount || 0);
      apt.services.forEach(s => {
        const r = allReasons.find(reason => reason.uuid === s.reason_id);
        totalServices += (r ? r.price * (s.quantity || 1) : 0);
      });
    });

    // Sum all payments made by patient
    const patientPays = payments.filter(p => p.patient_id === selectedPatientId);
    const totalPaid = patientPays.reduce((sum, p) => sum + p.amount, 0);
    const paymentDiscounts = patientPays.reduce((sum, p) => sum + (p.discount || 0), 0);

    const totalDiscount = aptDiscounts + paymentDiscounts;
    const netBill = Math.max(0, totalServices - totalDiscount);
    const remaining = Math.max(0, netBill - totalPaid);

    return {
      gross: totalServices,
      discount: totalDiscount,
      paid: totalPaid,
      remaining
    };
  }, [selectedPatientId, appointments, allReasons, payments]);

  // When patient is selected, auto-set amount to the patient remaining balance
  useEffect(() => {
    if (selectedPatientId && selectedPatientBalance.remaining > 0) {
      if (isPaymentModalOpen && !amount) {
        setAmount(selectedPatientBalance.remaining.toString());
      }
      if (isInstallmentModalOpen && !instTotalAmount) {
        setInstTotalAmount(selectedPatientBalance.remaining.toString());
      }
    }
  }, [selectedPatientId, selectedPatientBalance.remaining, isPaymentModalOpen, isInstallmentModalOpen]);

  useEffect(() => {
    if (location.state && location.state.openPaymentModal) {
        setIsPaymentModalOpen(true);
        if (location.state.patientId) {
            setSelectedPatientId(location.state.patientId);
            const p = patients.find(pat => pat.uuid === location.state.patientId);
            if (p) setPatientSearch(p.name);
        }
        if (location.state.appointmentId) {
            setAppointmentId(location.state.appointmentId);
            const apt = appointments.find(a => a.uuid === location.state.appointmentId);
            if (apt) {
              setFormDoctorId(apt.doctor_id.toString());
            }
        }
        if (location.state.amount) setAmount(location.state.amount.toString());
        if (location.state.description) setDescription(location.state.description);
        window.history.replaceState({}, document.title);
    }
  }, [location, patients, appointments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPatientList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPatientId || !amount) return;

      const finalAmount = parseFloat(amount) - (parseFloat(discount) || 0);
      const patientName = getPatientName(selectedPatientId);

      const newPayment: Payment = {
          uuid: `pay-${Date.now()}`,
          patient_id: selectedPatientId,
          doctor_id: parseInt(formDoctorId),
          appointment_uuid: appointmentId,
          amount: finalAmount,
          discount: parseFloat(discount) || 0,
          date: new Date(date).toISOString(),
          payment_method: paymentMethod,
          description: description || `تسویه حساب بیمار (${patientName})`,
          receipt_image: receiptImage
      };

      addPayment(newPayment);
      setIsPaymentModalOpen(false);
      resetForms();
      toast.success('تراکنش با موفقیت در صندوق ثبت شد.');
  };

  const handleCreateInstallments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !instTotalAmount || !instCount) {
        toast.error('لطفا تمام فیلدها را تکمیل کنید.');
        return;
    }

    const totalNum = parseFloat(instTotalAmount) || 0;
    const downNum = Math.min(totalNum, Math.max(0, parseFloat(instDownPayment) || 0));
    const remainToSplit = Math.max(0, totalNum - downNum);
    const amountPerInstallment = Math.round(remainToSplit / instCount);
    const startDate = new Date(instStartDate);
    const toastId = toast.loading('در حال ثبت تعهدات مالی...');

    const patientName = getPatientName(selectedPatientId);
    const baseDescription = `طرح درمان و تسویه حساب ${patientName}`;
    const finalDescription = instDesc ? `${baseDescription} - ${instDesc}` : baseDescription;

    // 1. If down payment > 0, record it as a direct payment
    if (downNum > 0) {
      const downPaymentObj: Payment = {
        uuid: `pay-${Date.now()}-inst-down`,
        patient_id: selectedPatientId,
        doctor_id: parseInt(formDoctorId),
        amount: downNum,
        date: new Date().toISOString(),
        payment_method: instDownPaymentMethod,
        description: instCount === 1 
          ? `پیش‌پرداخت نوبت (مانده به سررسید ${formatJalaliDate(instStartDate)} موکول شد)`
          : `پیش‌پرداخت طرح اقساط (${instCount} مرحله‌ای) - ${finalDescription}`
      };
      await addPayment(downPaymentObj);
    }

    // 2. Generate and save installments / promise
    for (let i = 0; i < instCount; i++) {
        const dueDate = new Date(startDate);
        if (instCount > 1) {
          if (instInterval === '15_days') {
            dueDate.setDate(startDate.getDate() + (i * 15));
          } else if (instInterval === '1_month') {
            dueDate.setMonth(startDate.getMonth() + i);
          } else if (instInterval === '45_days') {
            dueDate.setDate(startDate.getDate() + (i * 45));
          } else if (instInterval === '2_months') {
            dueDate.setMonth(startDate.getMonth() + (i * 2));
          }
        }

        let curAmount = amountPerInstallment;
        if (i === instCount - 1) {
          curAmount = remainToSplit - (amountPerInstallment * (instCount - 1));
        }

        const isSingle = instCount === 1;
        const itemDesc = isSingle 
          ? `وعده پرداخت موکول به بعد: ${finalDescription}` 
          : `${finalDescription} (قسط ${i + 1} از ${instCount})`;

        const newInst: Installment = {
            uuid: `inst-${Date.now()}-${i}${isSingle ? '-def' : ''}`,
            patient_id: selectedPatientId,
            doctor_id: parseInt(formDoctorId),
            amount: curAmount,
            due_date: dueDate.toISOString(),
            status: 'pending',
            description: itemDesc,
            created_at: new Date().toISOString()
        };
        await addInstallment(newInst);
    }

    toast.success(
      instCount === 1 
        ? `وعده پرداخت به ارزش ${formatCurrency(remainToSplit)} با موفقیت ثبت شد.` 
        : `${instCount} قسط به ارزش کل ${formatCurrency(remainToSplit)} با موفقیت ثبت شد.`, 
      { id: toastId }
    );
    setIsInstallmentModalOpen(false);
    setActiveTab('installments');
    resetForms();
  };

  const handleOpenCollectModal = (inst: Installment) => {
    setCollectingInstallment(inst);
    setCollectMethod('pos');
    setCollectDiscount('0');
    setCollectNotes('');
  };

  const handleConfirmCollectInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingInstallment) return;

    const discountNum = parseFloat(collectDiscount) || 0;
    const finalCollectAmount = Math.max(0, collectingInstallment.amount - discountNum);

    const newPayment: Payment = {
        uuid: `pay-inst-${Date.now()}`,
        patient_id: collectingInstallment.patient_id,
        doctor_id: collectingInstallment.doctor_id,
        amount: finalCollectAmount,
        discount: discountNum > 0 ? discountNum : undefined,
        date: new Date().toISOString(),
        payment_method: collectMethod,
        installment_uuid: collectingInstallment.uuid,
        description: collectNotes.trim() ? `وصول قسط / مطالبه: ${collectingInstallment.description} (${collectNotes.trim()})` : `وصول قسط / مطالبه: ${collectingInstallment.description}`
    };

    await addPayment(newPayment);
    await updateInstallment(collectingInstallment.uuid, { status: 'paid' });
    toast.success(`وصول مبلغ ${formatCurrency(finalCollectAmount)} با موفقیت در صندوق ثبت گردید.`);
    setCollectingInstallment(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            toast.error('حجم تصویر نباید بیشتر از ۲ مگابایت باشد.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setReceiptImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const resetForms = () => {
      setFormDoctorId(allowedDoctors[0]?.id.toString() || '');
      setSelectedPatientId('');
      setAppointmentId(undefined);
      setAmount('');
      setDiscount('');
      setPaymentMethod('pos');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setReceiptImage('');
      setInstTotalAmount('');
      setInstDownPayment('0');
      setInstDownPaymentMethod('pos');
      setInstCount(3);
      setInstInterval('1_month');
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      setInstStartDate(nextDate.toISOString().split('T')[0]);
      setInstDesc('');
      setPatientSearch('');
  };

  const getReasonText = (p: Payment) => {
      if (p.appointment_uuid) {
          const apt = appointments.find(a => a.uuid === p.appointment_uuid);
          if (apt) {
              const totalQty = apt.services.reduce((sum, s) => sum + s.quantity, 0);
              const qtyText = totalQty > 1 ? ` (${totalQty} عدد)` : '';
              return apt.services.map(s => reasons.find(r => r.uuid === s.reason_id)?.title).join('، ') + qtyText;
          }
      }
      if (p.installment_uuid) return 'وصول قسط / وعده معوق';
      const qText = (p.quantity && p.quantity > 1) ? ` (${p.quantity} عدد)` : '';
      return (p.description || 'سایر موارد') + qText;
  };

  const isPayLaterPromise = (inst: Installment) => {
    return inst.description?.includes('وعده پرداخت') || inst.uuid.includes('-def');
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
        if (filterDoctorId !== 'all') {
            if (p.doctor_id && p.doctor_id !== parseInt(filterDoctorId)) return false;
        }
        const pName = getPatientName(p.patient_id);
        return pName.includes(search) || (p.description && p.description.includes(search)) || (p.reference_number && p.reference_number.includes(search));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, filterDoctorId, search, getPatientName]);

  const filteredInstallments = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return installments.filter(i => {
        if (filterDoctorId !== 'all') {
            if (i.doctor_id && i.doctor_id !== parseInt(filterDoctorId)) return false;
        }

        const isPromise = isPayLaterPromise(i);
        if (installmentTypeFilter === 'schedule' && isPromise) return false;
        if (installmentTypeFilter === 'pay_later' && !isPromise) return false;

        const isOverdue = i.status === 'pending' && new Date(i.due_date) < now;

        if (installmentStatusFilter === 'pending' && i.status !== 'pending') return false;
        if (installmentStatusFilter === 'paid' && i.status !== 'paid') return false;
        if (installmentStatusFilter === 'overdue' && !isOverdue) return false;

        const pName = getPatientName(i.patient_id);
        return pName.includes(search) || (i.description && i.description.includes(search));
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [installments, filterDoctorId, installmentTypeFilter, installmentStatusFilter, search, getPatientName]);

  const stats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscounts = payments.reduce((sum, p) => sum + (p.discount || 0), 0);
    const pendingInstallments = installments.filter(i => i.status === 'pending');
    const pendingInstallmentsAmount = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueCount = pendingInstallments.filter(i => new Date(i.due_date) < now).length;

    return {
      totalCollected,
      totalDiscounts,
      pendingInstallmentsAmount,
      pendingCount: pendingInstallments.length,
      overdueCount
    };
  }, [payments, installments]);

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, nav, .no-print, button { display: none !important; }
          .min-h-screen { background: white !important; }
          .glass-card { 
            box-shadow: none !important; 
            border: none !important; 
            background: white !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .fixed { position: relative !important; inset: 0 !important; display: block !important; }
          .bg-black\\/60 { background: white !important; backdrop-filter: none !important; }
          .rounded-\\[2\\.5rem\\] { border-radius: 0 !important; }
          .shadow-2xl { box-shadow: none !important; }
          .p-8 { padding: 1rem !important; }
          .bg-primary-600 { background: #f8fafc !important; color: black !important; border-bottom: 2px solid #eee !important; }
          .text-white { color: black !important; }
          .opacity-80 { opacity: 1 !important; }
        }
      `}</style>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
        <div>
           <h2 className="text-2xl font-black text-gray-900 dark:text-white">مدیریت مالی و صندوق</h2>
           <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 font-bold">
             رهگیری تراکنش‌های نقدی/پوز، دفترچه اقساط درمانی و تعهدات معوق
           </p>
        </div>
        <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => { resetForms(); setIsInstallmentModalOpen(true); }} 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-xs transition-all font-black text-xs"
            >
                <Layers size={16} className="text-blue-600 dark:text-blue-400" />
                <span>تعریف اقساط / وعده معوق</span>
            </button>
            <button 
              onClick={() => { resetForms(); setIsPaymentModalOpen(true); }} 
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-md shadow-primary-600/20 transition-all font-black text-xs"
            >
                <Plus size={16} />
                <span>ثبت تراکنش صندوق</span>
            </button>
        </div>
      </div>

      {/* Financial Overview KPI Cards (Compact & Clean) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
          <div className="flex items-center justify-between text-primary-600 dark:text-primary-400 mb-0.5">
            <span className="text-[11px] font-bold">مجموع وصولی‌های صندوق</span>
            <CheckCircle size={15} />
          </div>
          <span className="text-base font-black text-gray-900 dark:text-white font-mono block">
            {formatCurrency(stats.totalCollected)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
            {payments.length} تراکنش ثبت‌شده
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-0.5">
            <span className="text-[11px] font-bold">مانده اقساط و معوقات</span>
            <Layers size={15} />
          </div>
          <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono block">
            {formatCurrency(stats.pendingInstallmentsAmount)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
            {stats.pendingCount} مورد در انتظار وصول
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-0.5">
            <span className="text-[11px] font-bold">اقساط سررسید گذشته</span>
            <AlertTriangle size={15} />
          </div>
          <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono block">
            {stats.overdueCount} قسط معوق
          </span>
          <span className="text-[10px] text-rose-500/80 font-bold block mt-0.5">
            نیاز به پیگیری
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-0.5">
            <span className="text-[11px] font-bold">مجموع تخفیف‌های ویژه</span>
            <Tag size={15} />
          </div>
          <span className="text-base font-black text-purple-600 dark:text-purple-400 font-mono block">
            {formatCurrency(stats.totalDiscounts)}
          </span>
          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
            کسورات لحاظ شده
          </span>
        </div>
      </div>

      {/* Unified Control Toolbar (Integrated Tabs + Search + Smart Dropdowns) */}
      <div className="glass-card p-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-2 no-print">
        
        {/* Row 1: Primary Tabs & Search */}
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
          
          {/* Main 2 Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200/70 dark:border-gray-700/60 shrink-0">
            <button 
              onClick={() => { setActiveTab('payments'); setInstallmentStatusFilter('all'); }} 
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5", 
                activeTab === 'payments' 
                  ? "bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-xs" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
                <CreditCard size={15} />
                <span>تراکنش‌های صندوق</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200/70 dark:bg-gray-700 font-mono">
                  {payments.length}
                </span>
            </button>

            <button 
              onClick={() => { setActiveTab('installments'); setInstallmentStatusFilter('all'); }} 
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5", 
                activeTab === 'installments' 
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
                <Layers size={15} />
                <span>دفترچه اقساط و معوقات</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-black">
                  {installments.length}
                </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="جستجوی نام بیمار، فیش، قسط..." 
              className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white font-bold text-xs" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          {/* Doctor Filter (if multiple doctors) */}
          {allowedDoctors.length > 1 && (
            <div className="relative w-full md:w-48 shrink-0">
                <Stethoscope className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select 
                  className="w-full pr-8 pl-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none font-bold text-xs dark:text-white" 
                  value={filterDoctorId} 
                  onChange={(e) => setFilterDoctorId(e.target.value)}
                >
                    <option value="all">همه پزشکان</option>
                    {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
            </div>
          )}
        </div>

        {/* Row 2: Sub-Filters for Installments (Sleek Inline Chips) */}
        {activeTab === 'installments' && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <SlidersHorizontal size={12} /> نوع تعهد:
              </span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg font-bold text-[11px]">
                <button
                  onClick={() => setInstallmentTypeFilter('all')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentTypeFilter === 'all' && "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs")}
                >
                  همه
                </button>
                <button
                  onClick={() => setInstallmentTypeFilter('schedule')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentTypeFilter === 'schedule' && "bg-white dark:bg-gray-900 text-blue-600 shadow-xs")}
                >
                  اقساط دوره‌ای
                </button>
                <button
                  onClick={() => setInstallmentTypeFilter('pay_later')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentTypeFilter === 'pay_later' && "bg-white dark:bg-gray-900 text-amber-600 shadow-xs")}
                >
                  موکول به بعد
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-400">وضعیت سررسید:</span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg font-bold text-[11px]">
                <button
                  onClick={() => setInstallmentStatusFilter('all')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentStatusFilter === 'all' && "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs")}
                >
                  همه
                </button>
                <button
                  onClick={() => setInstallmentStatusFilter('pending')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentStatusFilter === 'pending' && "bg-white dark:bg-gray-900 text-amber-600 shadow-xs")}
                >
                  در انتظار وصول
                </button>
                <button
                  onClick={() => setInstallmentStatusFilter('overdue')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentStatusFilter === 'overdue' && "bg-white dark:bg-gray-900 text-rose-600 shadow-xs")}
                >
                  سررسید گذشته ⚠️
                </button>
                <button
                  onClick={() => setInstallmentStatusFilter('paid')}
                  className={clsx("px-2 py-0.5 rounded-md transition-colors", installmentStatusFilter === 'paid' && "bg-white dark:bg-gray-900 text-emerald-600 shadow-xs")}
                >
                  وصول‌شده
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="glass-card rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xs min-h-[400px] no-print">
         {activeTab === 'payments' ? (
             <div className="overflow-x-auto">
                 <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">بیمار</th>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">درگاه و روش</th>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">بابت سرویس / شرح</th>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">مبلغ پرداختی</th>
                            <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[11px]">تاریخ ثبت</th>
                            <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[11px]">رسید</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredPayments.length > 0 ? (
                            filteredPayments.map(p => (
                                <tr key={p.uuid} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group">
                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                      <div className="flex flex-col">
                                        <span className="font-black text-xs text-gray-900 dark:text-white">{getPatientName(p.patient_id)}</span>
                                        {p.appointment_uuid ? (
                                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                            <CheckCheck size={11} /> متصل به نوبت
                                          </span>
                                        ) : p.installment_uuid ? (
                                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                                            <Layers size={11} /> وصول قسط / تعهد
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-gray-400">تراکنش مستقیم</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-0.5 items-start">
                                        <span className={clsx(
                                          "px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1",
                                          p.payment_method === 'pos' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" :
                                          p.payment_method === 'cash' ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" :
                                          p.payment_method === 'card_to_card' ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" :
                                          "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                        )}>
                                          {p.payment_method === 'pos' && <CreditCard size={10} />}
                                          {p.payment_method === 'cash' && <DollarSign size={10} />}
                                          {p.payment_method === 'card_to_card' && <Smartphone size={10} />}
                                          {p.payment_method === 'debt' && <Clock size={10} />}
                                          <span>
                                            {p.payment_method === 'pos' ? 'کارت‌خوان' :
                                             p.payment_method === 'cash' ? 'نقد' :
                                             p.payment_method === 'card_to_card' ? 'کارت به کارت' : 'بدهی / تعهد'}
                                          </span>
                                        </span>
                                        {p.reference_number && (
                                          <span className="text-[10px] text-gray-400 font-mono dir-ltr">
                                            RRN: {p.reference_number}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                                          {getReasonText(p)}
                                        </span>
                                        {p.discount && p.discount > 0 ? (
                                          <span className="text-[10px] text-emerald-600 font-black">
                                            تخفیف: {formatCurrency(p.discount)}
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 font-black text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                      {formatCurrency(p.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dir-ltr text-center font-bold text-xs">
                                      {formatJalaliDate(p.date)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                          onClick={() => setViewingPayment(p)} 
                                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all" 
                                          title="مشاهده فیش و چاپ رسید"
                                        >
                                          <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-gray-400 font-bold italic text-xs">
                                تراکنشی با فیلترهای انتخابی یافت نشد.
                              </td>
                            </tr>
                        )}
                    </tbody>
                 </table>
             </div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-right text-xs">
                    <thead className="bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">بیمار</th>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">نوع تعهد و شرح</th>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">مبلغ قسط</th>
                            <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[11px]">موعد سررسید</th>
                            <th className="px-4 py-3 font-black uppercase tracking-wider text-[11px]">وضعیت</th>
                            <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[11px]">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredInstallments.length > 0 ? (filteredInstallments.map(i => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            const dueDate = new Date(i.due_date);
                            const isOverdue = i.status === 'pending' && dueDate < now;
                            const isPromise = isPayLaterPromise(i);

                            return (
                              <tr key={i.uuid} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group">
                                  <td className="px-4 py-3 font-black text-xs text-gray-900 dark:text-white">
                                    {getPatientName(i.patient_id)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 max-w-sm">
                                      <span className={clsx(
                                        "px-1.5 py-0.5 rounded text-[10px] font-black shrink-0",
                                        isPromise 
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                      )}>
                                        {isPromise ? 'موکول به بعد' : 'قسط'}
                                      </span>
                                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate">
                                        {i.description}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-black text-xs text-gray-900 dark:text-white font-mono">
                                    {formatCurrency(i.amount)}
                                  </td>
                                  <td className="px-4 py-3 text-center dir-ltr font-bold text-xs">
                                    <span className={clsx(
                                      isOverdue ? "text-rose-600 dark:text-rose-400 font-black" : "text-gray-600 dark:text-gray-300"
                                    )}>
                                      {formatJalaliDate(i.due_date)}
                                      {isOverdue && <span className="block text-[10px] text-rose-500 font-bold">مهلت گذشته</span>}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                      {i.status === 'paid' ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle size={10} /> وصول‌شده
                                          </span>
                                      ) : isOverdue ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200 dark:border-rose-800">
                                            <AlertTriangle size={10} /> معوق / تاخیر
                                          </span>
                                      ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-200 dark:border-amber-800">
                                            <Clock size={10} /> در انتظار سررسید
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                      {i.status !== 'paid' ? (
                                        <button 
                                          onClick={() => handleOpenCollectModal(i)} 
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-xs flex items-center gap-1 mx-auto"
                                        >
                                          <CreditCard size={12} />
                                          <span>وصول قسط</span>
                                        </button>
                                      ) : (
                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1">
                                          <CheckCircle size={12} /> تسویه شد
                                        </span>
                                      )}
                                  </td>
                              </tr>
                            );
                        })) : (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-gray-400 font-bold italic text-xs">
                                موردی در دفترچه اقساط و مطالبات با فیلترهای انتخابی یافت نشد.
                              </td>
                            </tr>
                        )}
                    </tbody>
                 </table>
             </div>
         )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PAYMENT DETAIL & OFFICIAL PRINTABLE RECEIPT */}
      {/* ========================================================================= */}
      {viewingPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                  <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 text-white relative">
                      <button onClick={() => setViewingPayment(null)} className="absolute top-5 left-5 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors no-print"><X size={18} /></button>
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner"><Receipt size={26} /></div>
                          <div>
                            <h3 className="text-xl font-black">رسید تراکنش مالی صندوق</h3>
                            <p className="opacity-90 text-xs mt-0.5 font-bold">شناسه ثبت: {viewingPayment.uuid}</p>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs text-right">
                      <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-primary-600"><User size={18} /></div>
                                <div><p className="text-[10px] text-gray-400 font-black uppercase">نام بیمار</p><p className="font-extrabold text-xs text-gray-900 dark:text-white">{getPatientName(viewingPayment.patient_id)}</p></div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-teal-600"><Stethoscope size={18} /></div>
                                <div><p className="text-[10px] text-gray-400 font-black uppercase">پزشک معالج</p><p className="font-bold text-xs text-gray-800 dark:text-gray-200">{doctors.find(d => d.id === viewingPayment.doctor_id)?.name || 'پزشک مرکز'}</p></div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-blue-600"><Calendar size={18} /></div>
                                <div><p className="text-[10px] text-gray-400 font-black uppercase">تاریخ ثبت</p><p className="font-bold text-xs text-gray-700 dark:text-gray-300 dir-ltr">{formatJalaliDate(viewingPayment.date)}</p></div>
                              </div>
                          </div>
                          <div className="space-y-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-purple-600"><CreditCard size={18} /></div>
                                <div>
                                  <p className="text-[10px] text-gray-400 font-black uppercase">درگاه پرداخت</p>
                                  <p className="font-bold text-xs text-gray-800 dark:text-gray-200">
                                    {viewingPayment.payment_method === 'pos' ? 'کارت‌خوان (POS)' :
                                     viewingPayment.payment_method === 'cash' ? 'وجه نقد' :
                                     viewingPayment.payment_method === 'card_to_card' ? 'کارت به کارت' : 'بدهی / تعهد'}
                                  </p>
                                </div>
                              </div>
                              <div className="p-4 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-2xl text-center">
                                  <p className="text-[10px] text-primary-600 dark:text-primary-400 font-black uppercase mb-0.5">مبلغ دریافتی (تومان)</p>
                                  <p className="text-xl font-black text-primary-700 dark:text-primary-300 font-mono">{formatCurrency(viewingPayment.amount)}</p>
                                  {viewingPayment.discount && viewingPayment.discount > 0 && <p className="text-[10px] text-primary-600 font-bold mt-0.5">تخفیف: {formatCurrency(viewingPayment.discount)}</p>}
                              </div>
                          </div>
                      </div>

                      {viewingPayment.description && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                          <span className="font-bold text-gray-400 block mb-0.5">شرح / بابت:</span>
                          <span className="font-bold text-gray-900 dark:text-white">{viewingPayment.description}</span>
                        </div>
                      )}

                      {viewingPayment.receipt_image && (
                        <div className="space-y-1.5">
                           <p className="text-[10px] text-gray-400 font-black uppercase flex items-center gap-1"><ImageIcon size={13}/> تصویر فیش بانکی</p>
                           <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs relative">
                              <img src={viewingPayment.receipt_image} alt="Receipt" className="w-full h-auto max-h-48 object-contain bg-gray-50 dark:bg-gray-900" />
                           </div>
                        </div>
                      )}

                      <div className="flex gap-2.5 pt-2 no-print">
                        <button onClick={() => window.print()} className="flex-1 py-3 bg-gray-900 dark:bg-primary-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-black transition-all">
                          <Printer size={16} /> چاپ رسید رسمی
                        </button>
                        <button onClick={() => setViewingPayment(null)} className="px-5 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-all text-xs">
                          بستن
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK COLLECT INSTALLMENT */}
      {/* ========================================================================= */}
      {collectingInstallment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print !mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-5 text-white relative">
              <button onClick={() => setCollectingInstallment(null)} className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={16} /></button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><CreditCard size={20} /></div>
                <div>
                  <h3 className="text-lg font-black">وصول و تسویه قسط</h3>
                  <p className="text-primary-100 text-xs font-bold">{getPatientName(collectingInstallment.patient_id)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmCollectInstallment} className="p-5 space-y-3.5 text-xs text-right">
              <div className="p-3 bg-primary-50 dark:bg-primary-950/40 rounded-xl border border-primary-200 dark:border-primary-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">شرح تعهد:</span>
                  <span className="font-bold text-gray-900 dark:text-white text-xs">{collectingInstallment.description}</span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[10px] text-gray-400 block font-bold">مبلغ سررسید:</span>
                  <span className="text-sm font-black text-primary-600 dark:text-primary-400">{formatCurrency(collectingInstallment.amount)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1">
                <label className="font-black text-gray-700 dark:text-gray-200">درگاه دریافت وجه:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pos', label: 'کارت‌خوان', icon: CreditCard },
                    { id: 'cash', label: 'نقد', icon: DollarSign },
                    { id: 'card_to_card', label: 'کارت به کارت', icon: Smartphone }
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCollectMethod(m.id as any)}
                        className={clsx(
                          "py-2 px-2 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1",
                          collectMethod === m.id ? "bg-primary-600 border-primary-600 text-white shadow-xs" : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <Icon size={13} /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1">
                <label className="font-black text-gray-700 dark:text-gray-200">تخفیف موردی (تومان):</label>
                <input
                  type="number"
                  min="0"
                  value={collectDiscount}
                  onChange={(e) => setCollectDiscount(e.target.value)}
                  placeholder="۰"
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-mono dir-ltr text-left font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-gray-700 dark:text-gray-200">یادداشت:</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs shadow-md shadow-primary-600/20 transition-all mt-1"
              >
                تایید نهایی وصول و ثبت در صندوق
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAYMENT MODAL (ADD NEW DIRECT TRANSACTION) */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in no-print !mt-0">
             <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                 <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-5 text-white relative">
                     <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={18} /></button>
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><CreditCard size={22} /></div>
                         <div>
                          <h3 className="text-lg font-black">ثبت دریافت وجه و تسویه حساب</h3>
                          <p className="text-primary-100 text-xs font-bold">انتساب پرداخت به پرونده بیمار</p>
                         </div>
                     </div>
                 </div>
                 <form onSubmit={handleAddPayment} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs text-right">
                     
                     {/* Method selector */}
                     <div className="space-y-1">
                        <label className="font-black text-gray-700 dark:text-gray-200">روش دریافت وجه:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'pos', label: 'کارت‌خوان', icon: CreditCard },
                            { id: 'cash', label: 'وجه نقد', icon: DollarSign },
                            { id: 'card_to_card', label: 'کارت به کارت', icon: Smartphone }
                          ].map(m => {
                            const Icon = m.icon;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setPaymentMethod(m.id as any)}
                                className={clsx(
                                  "py-2 px-2 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1",
                                  paymentMethod === m.id ? "bg-primary-600 border-primary-600 text-white shadow-xs" : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                )}
                              >
                                <Icon size={13} /> {m.label}
                              </button>
                            );
                          })}
                        </div>
                     </div>

                     {/* Patient Selector */}
                     <div className="space-y-1" ref={dropdownRef}>
                        <label className="font-black text-gray-700 dark:text-gray-200">بیمار (پرونده طرف حساب):</label>
                        <div className="relative">
                            <input 
                              type="text" 
                              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold text-xs" 
                              placeholder="جستجو و انتخاب بیمار..." 
                              value={patientSearch} 
                              onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); setShowPatientList(true); }} 
                              onFocus={() => setShowPatientList(true)} 
                              readOnly={!!appointmentId} 
                            />
                            {showPatientList && !appointmentId && (
                              <div className="absolute top-full right-0 z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
                                {patients.filter(p => p.name.includes(patientSearch) || p.phone_number.includes(patientSearch)).map(p => (
                                  <div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); }} className="px-3.5 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/40 cursor-pointer flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <span className="font-bold dark:text-white">{p.name}</span>
                                    <span className="text-gray-400 text-[10px] dir-ltr font-black">{p.phone_number}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                     </div>

                     {/* Patient balance info banner */}
                     {selectedPatientId && (
                       <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                         <div>
                           <span className="text-[10px] text-gray-400 font-bold block">وضعیت حساب بیمار:</span>
                           <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                             {selectedPatientBalance.remaining > 0 
                               ? `دارای ${formatCurrency(selectedPatientBalance.remaining)} مانده بدهی` 
                               : 'حساب کاملاً تسویه است (۰ تومان)'}
                           </span>
                         </div>
                         {selectedPatientBalance.remaining > 0 && (
                           <button
                             type="button"
                             onClick={() => setAmount(selectedPatientBalance.remaining.toString())}
                             className="px-2.5 py-1 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 hover:bg-primary-100 rounded-lg text-[11px] font-black border border-primary-200 dark:border-primary-800 transition-all"
                           >
                             تسویه کل مانده
                           </button>
                         )}
                       </div>
                     )}

                     {/* Doctor select */}
                     <div className="space-y-1">
                        <label className="font-black text-gray-700 dark:text-gray-200">پزشک معالج:</label>
                        <div className="relative">
                            <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none dark:text-white font-bold text-xs" value={formDoctorId} onChange={(e) => setFormDoctorId(e.target.value)} disabled={!!appointmentId}>
                                {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-2.5">
                         <div className="space-y-1">
                           <label className="font-black text-gray-700 dark:text-gray-200">مبلغ دریافتی (تومان):</label>
                           <input required type="number" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black font-mono text-left dir-ltr text-xs" value={amount} onChange={(e) => setAmount(e.target.value)} />
                         </div>
                         <div className="space-y-1">
                           <label className="font-black text-gray-700 dark:text-gray-200">تخفیف موردی (تومان):</label>
                           <input type="number" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold font-mono text-left dir-ltr text-xs" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                         </div>
                     </div>

                     <div className="space-y-1">
                        <label className="font-black text-gray-700 dark:text-gray-200">یادداشت و شرح پرداخت (اختیاری):</label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="مثلاً: تسویه حساب نوبت، وجه بیعانه..."
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold text-xs"
                        />
                     </div>
                     
                     <PersianDatePicker label="تاریخ تراکنش" value={date} onChange={setDate} />

                     <div className="space-y-1">
                         <label className="font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5"><Camera size={13}/> تصویر فیش بانکی (اختیاری)</label>
                         <div onClick={() => fileInputRef.current?.click()} className={clsx("border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all cursor-pointer group", receiptImage ? "border-primary-500 bg-primary-50/10" : "border-gray-200 dark:border-gray-700 hover:border-primary-400")}>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            {receiptImage ? <img src={receiptImage} alt="Preview" className="w-full h-auto max-h-24 object-contain rounded-lg" /> : <><Upload className="text-gray-300 group-hover:text-primary-500 transition-colors" size={20} /><span className="text-[10px] text-gray-400 font-bold mt-1">بارگذاری تصویر فیش</span></>}
                         </div>
                     </div>

                     <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs shadow-md shadow-primary-600/20 mt-1 transition-all">تایید و ثبت نهایی در صندوق</button>
                 </form>
             </div>
         </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INSTALLMENT / DEFERRED PROMISE CREATION MODAL */}
      {/* ========================================================================= */}
      {isInstallmentModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print !mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white relative">
                    <button onClick={() => setIsInstallmentModalOpen(false)} className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={18} /></button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><Layers size={22} /></div>
                        <div>
                          <h3 className="text-lg font-black">تعریف اقساط یا موکول به بعد</h3>
                          <p className="text-blue-100 text-xs font-bold">تقسیط چندمرحله‌ای یا تعهد تک‌سررسید برای بیمار</p>
                        </div>
                    </div>
                </div>
                <form onSubmit={handleCreateInstallments} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs text-right">
                    
                    {/* Select Number of Stages (1 = Pay Later Promise, 2+ = Regular Installments) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-black text-gray-700 dark:text-gray-200">نوع تعهد / تعداد اقساط:</label>
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          {instCount === 1 ? 'تک‌پرداخت موکول به بعد' : `${instCount} قسط دوره‌ای`}
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
                                : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Patient search */}
                    <div className="space-y-1" ref={dropdownRef}>
                      <label className="font-black text-gray-700 dark:text-gray-200">انتخاب بیمار:</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold text-xs" 
                          placeholder="جستجوی بیمار..." 
                          value={patientSearch} 
                          onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); setShowPatientList(true); }} 
                          onFocus={() => setShowPatientList(true)} 
                        />
                        {showPatientList && (
                          <div className="absolute top-full right-0 z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-44 overflow-y-auto">
                            {patients.filter(p => p.name.includes(patientSearch)).map(p => (
                              <div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); }} className="px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-pointer flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-700 last:border-0 font-bold dark:text-white">
                                <span>{p.name}</span>
                                <span className="text-[10px] text-gray-400 font-black">{p.phone_number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patient balance info banner */}
                    {selectedPatientId && (
                       <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                         <div>
                           <span className="text-[10px] text-gray-400 font-bold block">مانده کل پرونده:</span>
                           <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                             {formatCurrency(selectedPatientBalance.remaining)}
                           </span>
                         </div>
                         {selectedPatientBalance.remaining > 0 && (
                           <button
                             type="button"
                             onClick={() => setInstTotalAmount(selectedPatientBalance.remaining.toString())}
                             className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-[11px] font-black border border-blue-200 dark:border-blue-800 transition-all"
                           >
                             تنظیم مبلغ کل
                           </button>
                         )}
                       </div>
                    )}

                    {/* Doctor select */}
                    <div className="space-y-1">
                      <label className="font-black text-gray-700 dark:text-gray-200">پزشک معالج:</label>
                      <div className="relative">
                        <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none dark:text-white font-bold text-xs" value={formDoctorId} onChange={(e) => setFormDoctorId(e.target.value)}>
                          {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="font-black text-gray-700 dark:text-gray-200">مبلغ کل تعهد (تومان):</label>
                          <input required type="number" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black font-mono text-left dir-ltr text-xs" value={instTotalAmount} onChange={(e) => setInstTotalAmount(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="font-black text-gray-700 dark:text-gray-200">پیش‌پرداخت نقدی اولیه:</label>
                          <input type="number" min="0" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold font-mono text-left dir-ltr text-xs" value={instDownPayment} onChange={(e) => setInstDownPayment(e.target.value)} />
                        </div>
                    </div>

                    {instCount > 1 && (
                      <div className="space-y-1">
                        <label className="font-black text-gray-700 dark:text-gray-200">فواصل زمانی بین اقساط:</label>
                        <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold dark:text-white text-xs" value={instInterval} onChange={(e) => setInstInterval(e.target.value as InstallmentInterval)}>
                          <option value="15_days">هر ۱۵ روز یکبار</option>
                          <option value="1_month">ماهانه (هر ۳۰ روز)</option>
                          <option value="45_days">هر ۴۵ روز یکبار</option>
                          <option value="2_months">هر ۲ ماه یکبار</option>
                        </select>
                      </div>
                    )}

                    <PersianDatePicker 
                      label={instCount === 1 ? "تاریخ موعد پرداخت مانده" : "تاریخ اولین سررسید قسط"} 
                      value={instStartDate} 
                      onChange={setInstStartDate} 
                    />

                    <div className="space-y-1">
                      <label className="font-black text-gray-700 dark:text-gray-200">توافق و توضیحات تکمیلی:</label>
                      <input className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-xs font-bold" value={instDesc} onChange={e => setInstDesc(e.target.value)} placeholder="مثلاً: توافق تسویه در جلسه بعد..." />
                    </div>

                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-600/20 mt-1 transition-all">
                      {instCount === 1 ? 'ثبت وعده پرداخت موکول به بعد' : `تایید و ایجاد ${instCount} قسط`}
                    </button>
                </form>
            </div>
         </div>
      )}
    </div>
  );
};
