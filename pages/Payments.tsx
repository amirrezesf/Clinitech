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
  Receipt, SlidersHorizontal, Coins
} from 'lucide-react';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { AppointmentPaymentModal } from '../components/AppointmentPaymentModal';
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
  const allowedDoctors = useMemo(() => {
    if (!user?.allowedDoctorIds || user.allowedDoctorIds.length === 0) return doctors;
    return doctors.filter(d => user.allowedDoctorIds.includes(d.id));
  }, [doctors, user]);

  const [activeTab, setActiveTab] = useState<PaymentTab>('payments');
  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [installmentTypeFilter, setInstallmentTypeFilter] = useState<'all' | 'schedule' | 'pay_later'>('all');

  // Shared Payment Modal State
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [sharedModalMode, setSharedModalMode] = useState<'immediate' | 'installments' | 'collect_installment'>('immediate');
  const [sharedModalPatientId, setSharedModalPatientId] = useState<string | null>(null);
  const [sharedModalAppointment, setSharedModalAppointment] = useState<any>(null);
  const [sharedModalInstallment, setSharedModalInstallment] = useState<Installment | null>(null);

  // Other Modals (Receipt viewing)
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (location.state && location.state.openPaymentModal) {
      setSharedModalMode('immediate');
      setSharedModalInstallment(null);
      if (location.state.patientId) {
        setSharedModalPatientId(location.state.patientId);
      }
      if (location.state.appointmentId) {
        const apt = appointments.find(a => a.uuid === location.state.appointmentId);
        if (apt) {
          setSharedModalAppointment(apt);
          setSharedModalPatientId(apt.patient_id);
        }
      }
      setIsSharedModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location, appointments]);

  const handleOpenCollectModal = (inst: Installment) => {
    setSharedModalInstallment(inst);
    setSharedModalPatientId(inst.patient_id);
    setSharedModalAppointment(null);
    setSharedModalMode('collect_installment');
    setIsSharedModalOpen(true);
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
              onClick={() => {
                setSharedModalMode('installments');
                setSharedModalPatientId(null);
                setSharedModalAppointment(null);
                setIsSharedModalOpen(true);
              }} 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3.5 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-xs transition-all font-black text-xs"
            >
                <Layers size={16} className="text-blue-600 dark:text-blue-400" />
                <span>تعریف اقساط / وعده معوق</span>
            </button>
            <button 
              onClick={() => {
                setSharedModalMode('immediate');
                setSharedModalPatientId(null);
                setSharedModalAppointment(null);
                setIsSharedModalOpen(true);
              }} 
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-h-[400px] no-print">
         {/* Table Top Bar */}
         <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-800/30">
           <div className="flex items-center gap-2">
             {activeTab === 'payments' ? (
               <>
                 <CreditCard size={16} className="text-primary-600 dark:text-primary-400" />
                 <span className="text-xs font-black text-gray-800 dark:text-gray-200">دفتر کل تراکنش‌های ثبت‌شده</span>
                 <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                   {filteredPayments.length} تراکنش
                 </span>
               </>
             ) : (
               <>
                 <Layers size={16} className="text-blue-600 dark:text-blue-400" />
                 <span className="text-xs font-black text-gray-800 dark:text-gray-200">دفتر اقساط و تعهدات پرداختی</span>
                 <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                   {filteredInstallments.length} قسط / تعهد
                 </span>
               </>
             )}
           </div>
           <div className="text-[11px] font-bold text-gray-400 md:hidden flex items-center gap-1">
             <span>← برای مشاهده همه ستون‌ها اسکرول کنید</span>
           </div>
         </div>

         {activeTab === 'payments' ? (
              <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-right text-xs min-w-[820px]">
                     <thead className="bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black tracking-wider">
                         <tr>
                             <th className="px-5 py-3.5">
                               <div className="flex items-center gap-1.5">
                                 <User size={13} className="text-gray-400" />
                                 <span>بیمار و پرونده</span>
                               </div>
                             </th>
                             <th className="px-5 py-3.5">
                               <div className="flex items-center gap-1.5">
                                 <CreditCard size={13} className="text-gray-400" />
                                 <span>درگاه و روش پرداخت</span>
                               </div>
                             </th>
                             <th className="px-5 py-3.5">
                               <div className="flex items-center gap-1.5">
                                 <FileText size={13} className="text-gray-400" />
                                 <span>بابت سرویس / شرح</span>
                               </div>
                             </th>
                             <th className="px-5 py-3.5">
                               <div className="flex items-center gap-1.5">
                                 <Coins size={13} className="text-gray-400" />
                                 <span>مبلغ پرداختی</span>
                               </div>
                             </th>
                             <th className="px-5 py-3.5 text-center">
                               <div className="flex items-center justify-center gap-1.5">
                                 <Calendar size={13} className="text-gray-400" />
                                 <span>تاریخ ثبت</span>
                               </div>
                             </th>
                             <th className="px-5 py-3.5 text-center">رسید و فیش</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                         {filteredPayments.length > 0 ? (
                             filteredPayments.map(p => (
                                 <tr key={p.uuid} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors group">
                                     <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">
                                       <div className="flex flex-col">
                                         <span className="font-black text-xs text-gray-900 dark:text-white">{getPatientName(p.patient_id)}</span>
                                         {p.appointment_uuid ? (
                                           <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                                             <CheckCheck size={11} /> متصل به نوبت
                                           </span>
                                         ) : p.installment_uuid ? (
                                           <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 mt-0.5">
                                             <Layers size={11} /> وصول قسط / تعهد
                                           </span>
                                         ) : (
                                           <span className="text-[10px] text-gray-400 mt-0.5">تراکنش مستقیم</span>
                                         )}
                                       </div>
                                     </td>
                                     <td className="px-5 py-3.5">
                                       <div className="flex flex-col gap-0.5 items-start">
                                         <span className={clsx(
                                           "px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5",
                                           p.payment_method === 'pos' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" :
                                           p.payment_method === 'cash' ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" :
                                           p.payment_method === 'card_to_card' ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" :
                                           "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                         )}>
                                           {p.payment_method === 'pos' && <CreditCard size={11} />}
                                           {p.payment_method === 'cash' && <DollarSign size={11} />}
                                           {p.payment_method === 'card_to_card' && <Smartphone size={11} />}
                                           {p.payment_method === 'debt' && <Clock size={11} />}
                                           <span>
                                             {p.payment_method === 'pos' ? 'کارت‌خوان' :
                                              p.payment_method === 'cash' ? 'نقد' :
                                              p.payment_method === 'card_to_card' ? 'کارت به کارت' : 'بدهی / تعهد'}
                                           </span>
                                         </span>
                                         {p.reference_number && (
                                           <span className="text-[10px] text-gray-400 font-mono dir-ltr mt-0.5">
                                             RRN: {p.reference_number}
                                           </span>
                                         )}
                                       </div>
                                     </td>
                                     <td className="px-5 py-3.5">
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
                                     <td className="px-5 py-3.5 font-black text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                       {formatCurrency(p.amount)}
                                     </td>
                                     <td className="px-5 py-3.5 text-gray-500 dir-ltr text-center font-bold text-xs">
                                       {formatJalaliDate(p.date)}
                                     </td>
                                     <td className="px-5 py-3.5 text-center">
                                         <button 
                                           onClick={() => setViewingPayment(p)} 
                                           className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl transition-all border border-emerald-200 dark:border-emerald-800 shadow-xs" 
                                           title="مشاهده فیش و چاپ رسید"
                                         >
                                           <Eye size={15} />
                                         </button>
                                     </td>
                                 </tr>
                             ))
                         ) : (
                             <tr>
                               <td colSpan={6} className="text-center py-14 text-gray-400 font-bold text-xs">
                                 تراکنشی با فیلترهای انتخابی یافت نشد.
                               </td>
                             </tr>
                         )}
                     </tbody>
                  </table>
              </div>
         ) : (
             <div className="overflow-x-auto scrollbar-thin">
                 <table className="w-full text-right text-xs min-w-[840px]">
                    <thead className="bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black tracking-wider">
                        <tr>
                            <th className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-gray-400" />
                                <span>بیمار و متعهد</span>
                              </div>
                            </th>
                            <th className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <FileText size={13} className="text-gray-400" />
                                <span>نوع تعهد و شرح</span>
                              </div>
                            </th>
                            <th className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <Coins size={13} className="text-gray-400" />
                                <span>مبلغ تعهد</span>
                              </div>
                            </th>
                            <th className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Calendar size={13} className="text-gray-400" />
                                <span>موعد سررسید</span>
                              </div>
                            </th>
                            <th className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Clock size={13} className="text-gray-400" />
                                <span>وضعیت</span>
                              </div>
                            </th>
                            <th className="px-5 py-3.5 text-center">عملیات مالی</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                        {filteredInstallments.length > 0 ? (filteredInstallments.map(i => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            const dueDate = new Date(i.due_date);
                            const isOverdue = i.status === 'pending' && dueDate < now;
                            const isPromise = isPayLaterPromise(i);

                            return (
                              <tr key={i.uuid} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors group">
                                  <td className="px-5 py-3.5 font-black text-xs text-gray-900 dark:text-white">
                                    {getPatientName(i.patient_id)}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-1.5 max-w-sm">
                                      <span className={clsx(
                                        "px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 border",
                                        isPromise 
                                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" 
                                          : "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                      )}>
                                        {isPromise ? 'موکول به بعد' : 'قسط'}
                                      </span>
                                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate">
                                        {i.description}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 font-black text-xs text-gray-900 dark:text-white font-mono">
                                    {formatCurrency(i.amount)}
                                  </td>
                                  <td className="px-5 py-3.5 text-center dir-ltr font-bold text-xs">
                                    <span className={clsx(
                                      isOverdue ? "text-rose-600 dark:text-rose-400 font-black" : "text-gray-600 dark:text-gray-300"
                                    )}>
                                      {formatJalaliDate(i.due_date)}
                                      {isOverdue && <span className="block text-[10px] text-rose-500 font-bold">مهلت گذشته</span>}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                      {i.status === 'paid' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle size={10} /> وصول‌شده
                                          </span>
                                      ) : isOverdue ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200 dark:border-rose-800">
                                            <AlertTriangle size={10} /> معوق / تاخیر
                                          </span>
                                      ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-200 dark:border-amber-800">
                                            <Clock size={10} /> در انتظار سررسید
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                      {i.status !== 'paid' ? (
                                        <button 
                                          onClick={() => handleOpenCollectModal(i)} 
                                          className={clsx(
                                            "text-white px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-xs flex items-center gap-1.5 mx-auto",
                                            isPromise 
                                              ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" 
                                              : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                          )}
                                        >
                                          {isPromise ? <Clock size={12} /> : <CreditCard size={12} />}
                                          <span>{isPromise ? 'وصول وعده' : 'وصول قسط'}</span>
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
                              <td colSpan={6} className="text-center py-14 text-gray-400 font-bold text-xs">
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
      {/* SHARED APPOINTMENT, DIRECT PAYMENT & INSTALLMENT COLLECTION MODAL */}
      {/* ========================================================================= */}
      <AppointmentPaymentModal
        isOpen={isSharedModalOpen}
        onClose={() => {
          setIsSharedModalOpen(false);
          setSharedModalPatientId(null);
          setSharedModalAppointment(null);
          setSharedModalInstallment(null);
        }}
        initialMode={sharedModalMode}
        patientId={sharedModalPatientId}
        appointment={sharedModalAppointment}
        patient={patients.find(p => p.uuid === sharedModalPatientId) || null}
        installment={sharedModalInstallment}
        onAddPayment={addPayment}
        onAddInstallment={addInstallment}
        onUpdateInstallment={updateInstallment}
      />
    </div>
  );
};
