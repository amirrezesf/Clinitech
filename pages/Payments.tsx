
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { 
  CreditCard, Search, Plus, Calendar, CheckCircle, Clock, 
  FileText, User, ChevronDown, Layers, X, Upload, Image as ImageIcon, 
  Stethoscope, Eye, Printer, Trash2, Tag, Hash, CalendarDays, 
  Download, Camera, Minus, PlusCircle
} from 'lucide-react';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Payment, Installment } from '../types';

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
  const [activeTab, setActiveTab] = useState<'payments' | 'installments'>('payments');
  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  // Searchable Dropdown State
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Payment Form States
  const [formDoctorId, setFormDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [appointmentId, setAppointmentId] = useState<string | undefined>(undefined);

  // Installment Form States
  const [instServiceId, setInstServiceId] = useState('');
  const [instQuantity, setInstQuantity] = useState<number>(1);
  const [instTotalAmount, setInstTotalAmount] = useState('');
  const [instCount, setInstCount] = useState(2);
  const [instStartDate, setInstStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [instDesc, setInstDesc] = useState('');

  const doctorServices = allReasons.filter(r => r.doctor_id === parseInt(formDoctorId));

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
              if (apt.services.length > 0) {
                setSelectedServiceId(apt.services[0].reason_id);
                setQuantity(apt.services[0].quantity);
              }
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

  // Sync amount for Payment Modal
  useEffect(() => {
    if (selectedServiceId && isPaymentModalOpen) {
      const service = allReasons.find(r => r.uuid === selectedServiceId);
      if (service) {
        setAmount((service.price * quantity).toString());
      }
    }
  }, [selectedServiceId, quantity, allReasons, isPaymentModalOpen]);

  // Sync amount for Installment Modal
  useEffect(() => {
    if (instServiceId && isInstallmentModalOpen) {
        const service = allReasons.find(r => r.uuid === instServiceId);
        if (service) {
            setInstTotalAmount((service.price * instQuantity).toString());
        }
    }
  }, [instServiceId, instQuantity, allReasons, isInstallmentModalOpen]);

  const handleAddPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPatientId || !amount) return;

      const finalAmount = parseFloat(amount) - (parseFloat(discount) || 0);
      const serviceObj = allReasons.find(r => r.uuid === selectedServiceId);

      const newPayment: Payment = {
          uuid: `pay-${Date.now()}`,
          patient_id: selectedPatientId,
          doctor_id: parseInt(formDoctorId),
          appointment_uuid: appointmentId,
          amount: finalAmount,
          discount: parseFloat(discount) || 0,
          quantity: quantity,
          date: new Date(date).toISOString(),
          description: description || (serviceObj ? `پرداخت بابت ${serviceObj.title}` : 'پرداخت دستی'),
          receipt_image: receiptImage
      };

      addPayment(newPayment);
      setIsPaymentModalOpen(false);
      resetForms();
      toast.success('پرداخت با موفقیت ثبت شد.');
  };

  const handleCreateInstallments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !instTotalAmount || !instCount) {
        toast.error('لطفا تمام فیلدها را تکمیل کنید.');
        return;
    }

    const amountPerInstallment = Math.round(parseFloat(instTotalAmount) / instCount);
    const startDate = new Date(instStartDate);
    const serviceObj = allReasons.find(r => r.uuid === instServiceId);
    const toastId = toast.loading('در حال تولید برنامه اقساط...');

    const qtyText = instQuantity > 1 ? ` (${instQuantity} عدد)` : '';
    const baseDescription = serviceObj ? `بابت ${serviceObj.title}${qtyText}` : 'اقساط درمانی';
    const finalDescription = instDesc ? `${baseDescription} - ${instDesc}` : baseDescription;

    for (let i = 0; i < instCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        const newInst: Installment = {
            uuid: `inst-${Date.now()}-${i}`,
            patient_id: selectedPatientId,
            doctor_id: parseInt(formDoctorId),
            amount: amountPerInstallment,
            due_date: dueDate.toISOString(),
            status: 'pending',
            description: `${finalDescription} (قسط ${i + 1} از ${instCount})`,
            created_at: new Date().toISOString()
        };
        await addInstallment(newInst);
    }

    toast.success(`${instCount} قسط با موفقیت ثبت شد.`, { id: toastId });
    setIsInstallmentModalOpen(false);
    setActiveTab('installments');
    resetForms();
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

  const handlePayInstallment = (inst: Installment) => {
      if (!confirm(`آیا از پرداخت قسط مبلغ ${formatCurrency(inst.amount)} اطمینان دارید؟`)) return;
      const newPayment: Payment = {
          uuid: `pay-inst-${Date.now()}`,
          patient_id: inst.patient_id,
          doctor_id: inst.doctor_id,
          amount: inst.amount,
          date: new Date().toISOString(),
          installment_uuid: inst.uuid,
          description: `پرداخت قسط: ${inst.description}`
      };
      addPayment(newPayment);
      updateInstallment(inst.uuid, { status: 'paid' });
      toast.success('قسط با موفقیت وصول شد.');
  };

  const resetForms = () => {
      setFormDoctorId(allowedDoctors[0]?.id.toString() || '');
      setSelectedPatientId('');
      setSelectedServiceId('');
      setInstServiceId('');
      setInstQuantity(1);
      setQuantity(1);
      setAppointmentId(undefined);
      setAmount('');
      setDiscount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setReceiptImage('');
      setInstTotalAmount('');
      setInstCount(2);
      setInstStartDate(new Date().toISOString().split('T')[0]);
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
      if (p.installment_uuid) return 'وصول قسط';
      const qText = (p.quantity && p.quantity > 1) ? ` (${p.quantity} عدد)` : '';
      return (p.description || 'سایر موارد') + qText;
  };

  const filteredPayments = payments.filter(p => {
      if (filterDoctorId !== 'all') {
          if (p.doctor_id && p.doctor_id !== parseInt(filterDoctorId)) return false;
      }
      const pName = getPatientName(p.patient_id);
      return pName.includes(search) || (p.description && p.description.includes(search));
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredInstallments = installments.filter(i => {
      if (filterDoctorId !== 'all') {
          if (i.doctor_id && i.doctor_id !== parseInt(filterDoctorId)) return false;
      }
      const pName = getPatientName(i.patient_id);
      return pName.includes(search) || i.description.includes(search);
  }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">مدیریت مالی و صندوق</h2>
           <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-bold">رهگیری تمامی تراکنش‌های مالی و اقساط بیماران</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => { resetForms(); setIsInstallmentModalOpen(true); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs uppercase tracking-wider">
                <Layers size={20} className="text-indigo-600" /><span>تعریف اقساط</span>
            </button>
            <button onClick={() => { resetForms(); setIsPaymentModalOpen(true); }} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all font-bold text-xs uppercase tracking-wider">
                <Plus size={20} /><span>ثبت تراکنش جدید</span>
            </button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit no-print">
          <button onClick={() => setActiveTab('payments')} className={clsx("px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2", activeTab === 'payments' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
              <CreditCard size={18} /> تراکنش‌های صندوق
          </button>
          <button onClick={() => setActiveTab('installments')} className={clsx("px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2", activeTab === 'installments' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
              <Layers size={18} /> مدیریت اقساط
          </button>
      </div>

      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center no-print">
         {allowedDoctors.length > 1 && (
            <div className="relative w-full md:w-56">
                <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none font-medium dark:text-white" value={filterDoctorId} onChange={(e) => setFilterDoctorId(e.target.value)}>
                    <option value="all">همه پزشکان</option>
                    {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
         )}
         <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="جستجوی بیمار یا توضیحات تراکنش..." className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white font-bold" value={search} onChange={(e) => setSearch(e.target.value)} />
         </div>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm min-h-[400px] no-print">
         {activeTab === 'payments' ? (
             <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">بیمار</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">بابت سرویس / علت</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">مبلغ وصول شده</th>
                            <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">تاریخ ثبت</th>
                            <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredPayments.length > 0 ? (
                            filteredPayments.map(p => (
                                <tr key={p.uuid} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{getPatientName(p.patient_id)}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-black border border-blue-100 dark:border-blue-800 w-fit">{getReasonText(p)}</span>
                                        {p.discount && p.discount > 0 && <span className="text-[10px] text-emerald-600 font-black">-{formatCurrency(p.discount)} تخفیف</span>}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</td>
                                    <td className="px-6 py-4 text-gray-500 dir-ltr text-center font-bold">{formatJalaliDate(p.date)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => setViewingPayment(p)} className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-all" title="مشاهده جزئیات فاکتور"><Eye size={20} /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="text-center py-12 text-gray-400 font-bold italic">تراکنشی در این بازه یافت نشد.</td></tr>
                        )}
                    </tbody>
                 </table>
             </div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">بیمار</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">مبلغ هر قسط</th>
                            <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">تاریخ سررسید</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">وضعیت قسط</th>
                            <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredInstallments.length > 0 ? (filteredInstallments.map(i => (
                            <tr key={i.uuid} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                <td className="px-6 py-4 font-bold dark:text-white">{getPatientName(i.patient_id)}</td>
                                <td className="px-6 py-4 font-black text-gray-800 dark:text-gray-200">{formatCurrency(i.amount)}</td>
                                <td className="px-6 py-4 text-center text-gray-500 dir-ltr font-bold">{formatJalaliDate(i.due_date)}</td>
                                <td className="px-6 py-4">
                                    {i.status === 'paid' ? 
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black border border-green-200 uppercase"><CheckCircle size={10} /> Paid</span> : 
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black border border-amber-200 uppercase"><Clock size={10} /> Pending</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {i.status !== 'paid' && <button onClick={() => handlePayInstallment(i)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-xl text-[10px] font-black transition-all shadow-sm">وصول نقدی</button>}
                                </td>
                            </tr>
                        ))) : (<tr><td colSpan={5} className="text-center py-12 text-gray-400 font-bold italic">قسطی در سیستم ثبت نشده است.</td></tr>)}
                    </tbody>
                 </table>
             </div>
         )}
      </div>

      {/* Payment Detail Modal / RECEIPT */}
      {viewingPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 mt-0">
                  <div className="bg-primary-600 p-8 text-white relative">
                      <button onClick={() => setViewingPayment(null)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors no-print"><X size={20} /></button>
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><CreditCard size={32} /></div>
                          <div><h3 className="text-2xl font-black">رسید تراکنش مالی</h3><p className="opacity-80 text-xs mt-1 font-bold">کد رهگیری سیستم: {viewingPayment.uuid}</p></div>
                      </div>
                  </div>

                  <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><User size={20} /></div><div><p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Patient Name</p><p className="font-black text-gray-800 dark:text-white">{getPatientName(viewingPayment.patient_id)}</p></div></div>
                              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><Stethoscope size={20} /></div><div><p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Provider</p><p className="font-bold text-gray-700 dark:text-gray-300">{doctors.find(d => d.id === viewingPayment.doctor_id)?.name || 'پزشک مرکز'}</p></div></div>
                              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><Calendar size={20} /></div><div><p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Transaction Date</p><p className="font-bold text-gray-700 dark:text-gray-300 dir-ltr">{formatJalaliDate(viewingPayment.date)}</p></div></div>
                          </div>
                          <div className="space-y-4">
                              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400"><FileText size={20} /></div><div><p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Description</p><p className="font-bold text-blue-600 dark:text-blue-400">{getReasonText(viewingPayment)}</p></div></div>
                              <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-3xl text-center">
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase mb-1">Final Amount (Toman)</p>
                                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(viewingPayment.amount)}</p>
                                  {viewingPayment.discount && viewingPayment.discount > 0 && <p className="text-[10px] text-emerald-500 font-bold mt-1">Applied Discount: {formatCurrency(viewingPayment.discount)}</p>}
                              </div>
                          </div>
                      </div>

                      {viewingPayment.receipt_image && (
                        <div className="space-y-3">
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> رسید دیجیتال پیوست شده</p>
                           <div className="rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm group relative">
                              <img src={viewingPayment.receipt_image} alt="Receipt" className="w-full h-auto max-h-[400px] object-contain bg-gray-50 dark:bg-gray-900/50" />
                              <a href={viewingPayment.receipt_image} download={`receipt-${viewingPayment.uuid}.png`} className="absolute bottom-6 left-6 p-4 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all no-print">
                                 <Download size={24} className="text-primary-600" />
                              </a>
                           </div>
                        </div>
                      )}

                      <div className="flex gap-4 pt-4 no-print">
                        <button onClick={() => window.print()} className="flex-1 py-4 bg-gray-900 dark:bg-primary-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black transition-all transform active:scale-[0.98]">
                          <Printer size={24} /> چاپ رسید رسمی
                        </button>
                        <button onClick={() => setViewingPayment(null)} className="px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                          بستن
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Payment Modal (Add New) */}
      {isPaymentModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in no-print !mt-0">
             <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                 <div className="bg-primary-600 p-8 text-white relative">
                     <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><CreditCard size={32} /></div>
                         <h3 className="text-2xl font-black">ثبت تراکنش صندوق</h3>
                     </div>
                 </div>
                 <form onSubmit={handleAddPayment} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">پزشک معالج</label>
                           <div className="relative">
                               <select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none dark:text-white font-bold" value={formDoctorId} onChange={(e) => { setFormDoctorId(e.target.value); setSelectedServiceId(''); }} disabled={!!appointmentId}>
                                   {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                               </select>
                               <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">سرویس / خدمت</label>
                           <div className="relative">
                               <select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none dark:text-white font-bold" value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                                   <option value="">سایر / متفرقه</option>
                                   {doctorServices.map(r => <option key={r.uuid} value={r.uuid}>{r.title}</option>)}
                               </select>
                               <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-4" ref={dropdownRef}>
                        <div className="space-y-1 col-span-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">تعداد</label>
                            <input type="number" min="1" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">انتخاب بیمار</label>
                            <div className="relative">
                                <input type="text" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold" placeholder="نام بیمار..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); setShowPatientList(true); }} onFocus={() => setShowPatientList(true)} readOnly={!!appointmentId} />
                                {showPatientList && !appointmentId && (<div className="absolute top-full right-0 z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">{patients.filter(p => p.name.includes(patientSearch) || p.phone_number.includes(patientSearch)).map(p => (<div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); }} className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/40 cursor-pointer flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-700 last:border-0"><span className="font-bold dark:text-white">{p.name}</span><span className="text-gray-400 text-[10px] dir-ltr font-black">{p.phone_number}</span></div>))}</div>)}
                            </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">مبلغ دریافتی (تومان)</label><input required type="number" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                         <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">تخفیف دستی</label><input type="number" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
                     </div>
                     
                     <PersianDatePicker label="تاریخ تراکنش" value={date} onChange={setDate} />

                     <div className="space-y-1">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mr-1"><Camera size={12}/> تصویر فیش بانکی (اختیاری)</label>
                         <div onClick={() => fileInputRef.current?.click()} className={clsx("border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer group", receiptImage ? "border-primary-500 bg-primary-50/10" : "border-gray-200 dark:border-gray-700 hover:border-primary-400")}>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            {receiptImage ? <img src={receiptImage} alt="Preview" className="w-full h-auto max-h-32 object-contain rounded-xl" /> : <><Upload className="text-gray-300 group-hover:text-primary-500 transition-colors" size={32} /><span className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tighter">Tap to upload receipt</span></>}
                         </div>
                     </div>

                     <button type="submit" className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 mt-4 transition-all transform active:scale-[0.98]">تایید و ثبت نهایی صندوق</button>
                 </form>
             </div>
         </div>
      )}

      {/* Installment Modal (REFACTORED) */}
      {isInstallmentModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print !mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 mt-0">
                <div className="bg-indigo-600 p-8 text-white relative">
                    <button onClick={() => setIsInstallmentModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><Layers size={32} /></div>
                        <div><h3 className="text-2xl font-black">تعریف برنامه اقساط</h3><p className="opacity-80 text-xs mt-1 font-bold">تولید خودکار سررسیدهای پرداخت بیمار</p></div>
                    </div>
                </div>
                <form onSubmit={handleCreateInstallments} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">پزشک مربوطه</label><div className="relative"><select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none dark:text-white font-bold" value={formDoctorId} onChange={(e) => setFormDoctorId(e.target.value)}>{allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select><ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">سرویس قسطی</label><div className="relative"><select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none dark:text-white font-bold" value={instServiceId} onChange={(e) => setInstServiceId(e.target.value)}><option value="">سایر (طرح درمان)</option>{doctorServices.map(r => <option key={r.uuid} value={r.uuid}>{r.title}</option>)}</select><ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div></div>
                    </div>

                    <div className="grid grid-cols-3 gap-4" ref={dropdownRef}>
                        <div className="space-y-1 col-span-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">تعداد واحد</label><input type="number" min="1" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black" value={instQuantity} onChange={(e) => setInstQuantity(parseInt(e.target.value) || 1)} /></div>
                        <div className="space-y-1 col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">انتخاب بیمار</label><div className="relative"><input type="text" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold" placeholder="جستجوی بیمار..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); setShowPatientList(true); }} onFocus={() => setShowPatientList(true)} />{showPatientList && (<div className="absolute top-full right-0 z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">{patients.filter(p => p.name.includes(patientSearch)).map(p => (<div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); }} className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/40 cursor-pointer flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 font-bold dark:text-white"><span>{p.name}</span><span className="text-[10px] text-gray-400 font-black">{p.phone_number}</span></div>))}</div>)}</div></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">مبلغ کل اقساط (تومان)</label><input required type="number" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black" value={instTotalAmount} onChange={(e) => setInstTotalAmount(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">تعداد اقساط (ماهانه)</label><input required type="number" min="2" max="60" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-black" value={instCount} onChange={(e) => setInstCount(parseInt(e.target.value) || 2)} /></div>
                    </div>

                    <PersianDatePicker label="تاریخ اولین قسط" value={instStartDate} onChange={setInstStartDate} />

                    <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">توضیحات تکمیلی</label><textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none dark:text-white text-xs resize-none" rows={2} value={instDesc} onChange={e => setInstDesc(e.target.value)} placeholder="مثلاً: بابت طرح درمان ارتودنسی فاز دوم" /></div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex items-start gap-3 mt-2"><CalendarDays className="text-indigo-600 shrink-0 mt-0.5" size={18} /><p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold leading-relaxed">سیستم به صورت خودکار مبلغ را بر تعداد اقساط تقسیم کرده و سررسیدها را با فاصله ۳۰ روز از تاریخ شروع تنظیم می‌کند.</p></div>

                    <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 mt-4 transition-all transform active:scale-[0.98]">تولید هوشمند برنامه اقساط</button>
                </form>
            </div>
         </div>
      )}
    </div>
  );
};
