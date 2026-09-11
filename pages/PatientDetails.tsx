
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { formatJalaliDate, formatJalaliTime, statusLabels, formatCurrency } from '../utils/helpers';
import { 
  ArrowRight, User, Phone, FileText, Calendar, Clock, 
  Activity, CheckCircle, AlertCircle, Edit, Siren, 
  ShieldCheck, Layers, ChevronDown, ChevronUp, ExternalLink, 
  TrendingUp, CalendarRange, X, Stethoscope, ClipboardList, History,
  Printer, Image as ImageIcon, Upload, Trash2, Eye, Plus, Camera, Download, Fingerprint, Hash, StickyNote,
  CreditCard, DollarSign, Receipt, CheckCircle2, AlertTriangle, Wallet, ArrowDownLeft, Landmark, Check,
  Tag, CalendarDays, Filter, Search
} from 'lucide-react';
import clsx from 'clsx';
import { Appointment, MedicalImage, Patient, Payment, Installment } from '../types';
import toast from 'react-hot-toast';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { AppointmentPaymentModal } from '../components/AppointmentPaymentModal';

const IMAGE_TYPES = [
    { id: 'radiology', label: 'رادیولوژی' },
    { id: 'ct-scan', label: 'CT-Scan' },
    { id: 'mri', label: 'MRI' },
    { id: 'sonography', label: 'سونوگرافی' },
    { id: 'pathology', label: 'پاتولوژی' },
    { id: 'other', label: 'سایر موارد' },
];

const COMMON_DISEASES = [
  'دیابت', 'فشار خون', 'بیماری قلبی', 'تیروئید', 'آسم', 'کبد چرب', 'تشنج', 'حساسیت دارویی', 'کم‌خونی', 'ام اس'
];

const PAYMENT_METHOD_INFO: Record<string, { label: string; color: string; icon: any }> = {
  pos: { label: 'کارت‌خوان (POS)', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', icon: CreditCard },
  cash: { label: 'وجه نقد', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800', icon: Wallet },
  card_to_card: { label: 'کارت به کارت', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', icon: ArrowDownLeft },
  debt: { label: 'تعهد پرداخت / دفتری', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800', icon: Clock },
  insurance: { label: 'پوشش بیمه', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800', icon: ShieldCheck },
  other: { label: 'سایر روش‌ها', color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: FileText }
};

export const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    patients, 
    allAppointments, 
    allReasons,
    getReasonTitle, 
    insurances, 
    doctors, 
    medicalImages, 
    addMedicalImage, 
    deleteMedicalImage,
    updatePatient,
    payments,
    installments,
    addPayment,
    addInstallment,
    updateInstallment
  } = useData();

  const [activeTab, setActiveTab] = useState<'history' | 'images' | 'financial'>('history');
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Appointment | null>(null);

  // Financial & Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState<'immediate' | 'pay_later' | 'installments' | 'collect_installment'>('immediate');
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<Installment | null>(null);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [receiptImageToPreview, setReceiptImageToPreview] = useState<string | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  
  // Edit Patient State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({
    name: '',
    phone_number: '',
    id_number: '',
    insurance_id: '',
    insurance_code: '',
    notes: '',
    medical_history: []
  });
  const [customDisease, setCustomDisease] = useState('');

  // Image Management State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImgForPreview, setSelectedImgForPreview] = useState<MedicalImage | null>(null);
  const [uploadData, setUploadData] = useState({
      type: 'radiology',
      date: new Date().toISOString().split('T')[0],
      description: '',
      image_data: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patient = useMemo(() => patients.find(p => p.uuid === id), [patients, id]);
  const patientAppointments = useMemo(() => allAppointments.filter(a => a.patient_id === id), [allAppointments, id]);
  const patientImages = useMemo(() => medicalImages.filter(i => i.patient_id === id), [medicalImages, id]);

  const patientPayments = useMemo(() => {
    if (!id) return [];
    const patientAptUuids = new Set(patientAppointments.map(a => a.uuid));
    return payments
      .filter(p => p.patient_id === id || (p.appointment_uuid && patientAptUuids.has(p.appointment_uuid)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, id, patientAppointments]);

  const patientInstallments = useMemo(() => {
    if (!id) return [];
    return installments
      .filter(inst => inst.patient_id === id)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [installments, id]);

  const financialStats = useMemo(() => {
    // 1. Total treatment invoices across all patient's appointments
    const totalTreatmentsBilled = patientAppointments.reduce((sum, apt) => {
      const servicesCost = (apt.services || []).reduce((sub, s) => {
        const reason = allReasons.find(r => r.uuid === s.reason_id);
        return sub + ((reason?.price || 0) * (s.quantity || 1));
      }, 0);
      return sum + Math.max(0, servicesCost - (apt.discount || 0));
    }, 0);

    // 2. Total collected payments
    const totalCollected = patientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 3. Total payment discounts
    const totalDiscounts = patientPayments.reduce((sum, p) => sum + (p.discount || 0), 0) +
      patientAppointments.reduce((sum, a) => sum + (a.discount || 0), 0);

    // 4. Balance (positive = debt / 0 = settled)
    const remainingDebt = Math.max(0, totalTreatmentsBilled - totalCollected);

    // 5. Active/pending installments
    const pendingInstallments = patientInstallments.filter(inst => inst.status === 'pending' || inst.status === 'overdue');
    const pendingInstallmentsAmount = pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0);

    return {
      totalTreatmentsBilled,
      totalCollected,
      totalDiscounts,
      remainingDebt,
      isSettled: remainingDebt === 0,
      pendingInstallmentsCount: pendingInstallments.length,
      pendingInstallmentsAmount
    };
  }, [patientAppointments, patientPayments, patientInstallments, allReasons]);

  const filteredPatientPayments = useMemo(() => {
    return patientPayments.filter(p => {
      if (paymentMethodFilter !== 'all' && p.payment_method !== paymentMethodFilter) return false;
      if (paymentSearch.trim()) {
        const q = paymentSearch.trim().toLowerCase();
        const descMatch = p.description?.toLowerCase().includes(q);
        const refMatch = p.reference_number?.toLowerCase().includes(q);
        const amountMatch = p.amount.toString().includes(q);
        return Boolean(descMatch || refMatch || amountMatch);
      }
      return true;
    });
  }, [patientPayments, paymentMethodFilter, paymentSearch]);

  // Sync edit form with patient data
  useEffect(() => {
    if (patient && isEditModalOpen) {
      setEditFormData({
        name: patient.name || '',
        phone_number: patient.phone_number || '',
        id_number: patient.id_number || '',
        insurance_id: patient.insurance_id || '',
        insurance_code: patient.insurance_code || '',
        notes: patient.notes || '',
        medical_history: patient.medical_history || []
      });
    }
  }, [patient, isEditModalOpen]);

  const toggleDisease = (disease: string) => {
    setEditFormData((prev: any) => {
        const history = prev.medical_history || [];
        return {
            ...prev,
            medical_history: history.includes(disease) ? history.filter((d: string) => d !== disease) : [...history, disease]
        };
    });
  };

  const addCustomDisease = () => {
    if (customDisease.trim() && !editFormData.medical_history.includes(customDisease.trim())) {
      setEditFormData((prev: any) => ({
          ...prev,
          medical_history: [...prev.medical_history, customDisease.trim()]
      }));
      setCustomDisease('');
    }
  };

  const { recurringSeries, standaloneVisits } = useMemo(() => {
    const seriesMap: Record<string, any> = {};
    const standalone: any[] = [];
    patientAppointments.forEach(apt => {
      if (apt.recurring_id) {
        if (!seriesMap[apt.recurring_id]) {
          seriesMap[apt.recurring_id] = { id: apt.recurring_id, title: apt.recurring_title || 'دوره درمانی بدون نام', appointments: [], startDate: apt.for_date, doctor_id: apt.doctor_id };
        }
        seriesMap[apt.recurring_id].appointments.push(apt);
        if (new Date(apt.for_date) < new Date(seriesMap[apt.recurring_id].startDate)) seriesMap[apt.recurring_id].startDate = apt.for_date;
      } else {
        standalone.push(apt);
      }
    });
    return {
      recurringSeries: Object.values(seriesMap).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
      standaloneVisits: standalone.sort((a, b) => new Date(b.for_date).getTime() - new Date(a.for_date).getTime())
    };
  }, [patientAppointments]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await updatePatient(id, editFormData);
    toast.success('اطلاعات پرونده با موفقیت بروزرسانی شد.');
    setIsEditModalOpen(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { toast.error('حجم تصویر نباید بیشتر از ۲ مگابایت باشد.'); return; }
        const reader = new FileReader();
        reader.onloadend = () => setUploadData({ ...uploadData, image_data: reader.result as string });
        reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.image_data) { toast.error('لطفا یک تصویر انتخاب کنید.'); return; }
    
    const newImage: MedicalImage = {
        uuid: `img-${Date.now()}`,
        patient_id: id!,
        type: uploadData.type as any,
        date: new Date(uploadData.date).toISOString(),
        description: uploadData.description,
        image_data: uploadData.image_data,
        created_at: new Date().toISOString()
    };

    await addMedicalImage(newImage);
    toast.success('تصویر پزشکی با موفقیت آرشیو شد.');
    setIsUploadModalOpen(false);
    setUploadData({ type: 'radiology', date: new Date().toISOString().split('T')[0], description: '', image_data: '' });
  };

  const handleDeleteImage = async (uuid: string) => {
      if (confirm('آیا از حذف این مدرک تصویری اطمینان دارید؟')) {
          await deleteMedicalImage(uuid);
          toast.success('تصویر حذف شد.');
      }
  };

  if (!patient) return <div className="p-20 text-center text-gray-500">بیمار یافت نشد.</div>;

  const insuranceName = patient.insurance_id ? insurances.find(i => i.id === patient.insurance_id)?.name : 'آزاد (بدون بیمه)';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"><ArrowRight size={24} /></button>
        <div><h2 className="text-2xl font-black text-gray-800 dark:text-white">پرونده الکترونیک سلامت</h2><p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Medical Record & Archiving</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl border-t-4 border-primary-500">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20 border-2 border-white dark:border-gray-700 shadow-xl flex items-center justify-center text-primary-600 mb-4 transform rotate-3"><User size={40} /></div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-white">{patient.name}</h3>
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 mt-2 dir-ltr">ID: {patient.uuid}</span>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors group"><div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-primary-500 transition-colors shadow-sm"><Phone size={18} /></div><div><p className="text-[10px] text-gray-400 font-black uppercase">Mobile</p><p className="font-bold text-gray-700 dark:text-gray-200 dir-ltr text-right">{patient.phone_number}</p></div></div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl"><div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-blue-500 shadow-sm"><ShieldCheck size={18} /></div><div><p className="text-[10px] text-blue-400 font-black uppercase tracking-tighter">Insurance</p><p className="font-bold text-blue-700 dark:text-blue-300 text-xs">{insuranceName}</p></div></div>
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                      <h4 className="text-[11px] font-black text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2 uppercase tracking-wide">
                        <AlertCircle size={14} /> Medical Alerts
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-bold">
                        {patient.notes || 'یادداشت خاصی ثبت نشده است.'}
                      </p>
                    </div>

                    {/* Medical History Tags - Moved Below Alerts */}
                    {patient.medical_history && patient.medical_history.length > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800/30">
                            <h4 className="text-[11px] font-black text-red-700 dark:text-red-400 mb-2 flex items-center gap-2 uppercase tracking-wide"><Activity size={14} /> Medical History</h4>
                            <div className="flex flex-wrap gap-1">
                                {patient.medical_history.map(d => (
                                    <span key={d} className="px-2 py-0.5 bg-white dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded text-[9px] font-black border border-red-100 dark:border-red-900 shadow-sm">{d}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Financial Summary Widget */}
                    <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                          <Wallet size={14} /> تراز مالی پرونده
                        </span>
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[9px] font-black border",
                          financialStats.remainingDebt > 0 
                            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300"
                        )}>
                          {financialStats.remainingDebt > 0 ? `بدهی: ${formatCurrency(financialStats.remainingDebt)}` : 'تسویه کامل'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-600 dark:text-gray-300 pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                        <span className="text-gray-400 font-bold">مجموع پرداختی‌ها:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(financialStats.totalCollected)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAppointmentForPayment(null);
                          setSelectedInstallmentForPayment(null);
                          setPaymentModalMode('immediate');
                          setIsPaymentModalOpen(true);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                      >
                        <CreditCard size={14} />
                        <span>ثبت دریافت وجه / پرداخت</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button onClick={() => setIsEditModalOpen(true)} className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                        <Edit size={14} /> ویرایش
                      </button>
                      <button onClick={() => navigate(`/appointment/urgent?patientId=${patient.uuid}`)} className="py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"><Siren size={16} /> نوبت فوری</button>
                    </div>
                </div>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-8 pb-10">
            {/* TABS HEADER */}
            <div className="flex flex-wrap sm:flex-nowrap gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full sm:w-fit overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('history')} className={clsx("px-3.5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap", activeTab === 'history' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                    <History size={16} /> سوابق درمان
                </button>
                <button onClick={() => setActiveTab('images')} className={clsx("px-3.5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap", activeTab === 'images' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                    <ImageIcon size={16} /> تصاویر و مدارک {patientImages.length > 0 && <span className="bg-primary-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{patientImages.length}</span>}
                </button>
                <button onClick={() => setActiveTab('financial')} className={clsx("px-3.5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap", activeTab === 'financial' ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                    <CreditCard size={16} /> سوابق مالی و پرداخت‌ها {patientPayments.length > 0 && <span className="bg-emerald-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{patientPayments.length}</span>}
                </button>
            </div>

            {activeTab === 'history' ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-3"><div className="p-1.5 bg-primary-600 text-white rounded-lg"><Layers size={20} /></div>دوره‌های درمانی فعال و طرح درمان</h3>
                        {recurringSeries.length > 0 ? (
                            <div className="space-y-4">
                                {recurringSeries.map((series) => {
                                    const completedCount = series.appointments.filter((a: any) => a.status === '0').length, totalCount = series.appointments.length, progress = Math.round((completedCount / totalCount) * 100), isExpanded = expandedSeries === series.id;
                                    return (
                                        <div key={series.id} className="glass-card rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all hover:shadow-lg">
                                            <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center shadow-inner shrink-0"><TrendingUp size={24} /></div><div><h4 className="font-black text-gray-800 dark:text-white text-lg">{series.title}</h4><div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1"><span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><CalendarRange size={12}/> شروع: {formatJalaliDate(series.startDate)}</span><span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded text-[9px] font-black">{completedCount} از {totalCount} جلسه تکمیل شده</span></div></div></div><div className="flex items-center gap-4 w-full md:w-auto"><div className="flex-1 md:w-32"><div className="flex justify-between items-center mb-1 text-[10px] font-bold text-gray-400 uppercase"><span>Progress</span><span>{progress}%</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div></div></div><button onClick={() => setExpandedSeries(isExpanded ? null : series.id)} className={clsx("px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0", isExpanded ? "bg-gray-900 text-white" : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50")}><span>مشاهده جلسات</span>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></div></div>
                                            {isExpanded && <div className="px-5 pb-5 animate-in slide-in-from-top-4 duration-500"><div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-x-auto"><table className="w-full text-right text-xs min-w-[480px]"><thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 font-black"><tr><th className="px-4 py-3"># جلسه</th><th className="px-4 py-3">تاریخ و ساعت</th><th className="px-4 py-3">نوع خدمت</th><th className="px-4 py-3">وضعیت</th><th className="px-4 py-3 text-center">جزئیات</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">{series.appointments.map((session: any, idx: number) => (<tr key={session.uuid} className="hover:bg-white dark:hover:bg-gray-800 transition-colors group"><td className="px-4 py-3 font-black text-gray-400">{(idx + 1).toString().padStart(2, '۰')}</td><td className="px-4 py-3"><div className="flex flex-col"><span className="font-bold text-gray-700 dark:text-gray-300">{formatJalaliDate(session.for_date)}</span><span className="text-[10px] opacity-60 font-bold">{formatJalaliTime(session.for_date)}</span></div></td><td className="px-4 py-3 font-bold text-primary-600">{session.services.map((s: any) => getReasonTitle(s.reason_id)).join('، ')}</td><td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-black border", statusLabels[session.status].color)}>{statusLabels[session.status].label}</span></td><td className="px-4 py-3 text-center"><button onClick={() => setSelectedVisit(session)} className="p-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-600 hover:text-white"><ExternalLink size={14} /></button></td></tr>))}</tbody></table></div></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800"><p className="text-gray-400 text-sm font-bold">هیچ طرح درمانی فعالی برای این بیمار ثبت نشده است.</p></div>}
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-3"><div className="p-1.5 bg-blue-600 text-white rounded-lg"><Activity size={20} /></div>سوابق مراجعات عمومی</h3>
                        {standaloneVisits.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {standaloneVisits.map((apt) => (
                                    <div key={apt.uuid} onClick={() => setSelectedVisit(apt)} className="glass-card p-4 rounded-3xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all flex gap-4 items-center group cursor-pointer"><div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex flex-col items-center justify-center shrink-0"><span className="text-lg font-black leading-none">{new Date(apt.for_date).getDate()}</span><span className="text-[8px] font-bold uppercase">{new Intl.DateTimeFormat('fa-IR', { month: 'short' }).format(new Date(apt.for_date))}</span></div><div className="flex-1 min-w-0"><h4 className="text-sm font-black text-gray-800 dark:text-white truncate">{apt.services.map(s => getReasonTitle(s.reason_id)).join('، ')}</h4><div className="flex items-center gap-2 mt-1"><Clock size={10} className="text-gray-400" /><span className="text-[10px] text-gray-500 font-bold">{formatJalaliTime(apt.for_date)}</span><span className={clsx("px-2 py-0.5 rounded-full text-[8px] font-black border ml-auto", statusLabels[apt.status].color)}>{statusLabels[apt.status].label}</span></div></div><button className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink size={18} className="text-primary-500" /></button></div>
                                ))}
                            </div>
                        ) : <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800"><p className="text-gray-400 text-sm font-bold">سابقه مراجعه تکی یافت نشد.</p></div>}
                    </div>
                </div>
            ) : activeTab === 'images' ? (
                /* MEDICAL IMAGES TAB */
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-600 text-white rounded-lg"><ImageIcon size={20} /></div>
                            آرشیو تصاویر پزشکی (PACS)
                        </h3>
                        <button 
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all text-sm font-bold"
                        >
                            <Plus size={18} /> افزودن تصویر جدید
                        </button>
                    </div>

                    {patientImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {patientImages.map((img) => (
                                <div key={img.uuid} className="glass-card rounded-3xl overflow-hidden group border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all">
                                    <div className="relative aspect-square cursor-pointer" onClick={() => setSelectedImgForPreview(img)}>
                                        <img src={img.image_data} alt={img.type} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <div className="p-2 bg-white rounded-full text-primary-600"><Eye size={20} /></div>
                                        </div>
                                        <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-lg text-[9px] font-black text-indigo-600 uppercase shadow-sm">
                                            {IMAGE_TYPES.find(t => t.id === img.type)?.label}
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Calendar size={10} /> {formatJalaliDate(img.date)}</span>
                                            <button onClick={() => handleDeleteImage(img.uuid)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{img.description || 'بدون توضیح'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-400 text-sm font-bold">هنوز هیچ تصویر یا مدرکی برای این بیمار ثبت نشده است.</p>
                            <p className="text-gray-300 text-xs mt-2">تصاویر رادیولوژی، آزمایشات و اسکن‌ها را در این بخش آرشیو کنید.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* FINANCIAL & PAYMENTS TAB */
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Header with Quick Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20">
                                    <CreditCard size={20} />
                                </div>
                                پرونده مالی و سوابق پرداخت بیمار
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                                مدیریت جامع تراکنش‌ها، فیش‌های واریزی، اقساط و تراز حساب پرونده
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setSelectedAppointmentForPayment(null);
                                    setSelectedInstallmentForPayment(null);
                                    setPaymentModalMode('installments');
                                    setIsPaymentModalOpen(true);
                                }}
                                className="px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Layers size={16} className="text-primary-600" />
                                <span>طرح اقساط / وعده</span>
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedAppointmentForPayment(null);
                                    setSelectedInstallmentForPayment(null);
                                    setPaymentModalMode('immediate');
                                    setIsPaymentModalOpen(true);
                                }}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                            >
                                <Plus size={18} />
                                <span>ثبت دریافت وجه</span>
                            </button>
                        </div>
                    </div>

                    {/* Financial KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                                <Receipt size={22} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-400">کل صورتحساب خدمات</p>
                                <p className="text-base font-black text-gray-900 dark:text-white truncate">
                                    {formatCurrency(financialStats.totalTreatmentsBilled)}
                                </p>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={22} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-400">کل پرداختی‌های بیمار</p>
                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                                    {formatCurrency(financialStats.totalCollected)}
                                </p>
                            </div>
                        </div>

                        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
                                <Tag size={22} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-400">مجموع تخفیف‌ها</p>
                                <p className="text-base font-black text-purple-600 dark:text-purple-400 truncate">
                                    {formatCurrency(financialStats.totalDiscounts)}
                                </p>
                            </div>
                        </div>

                        <div className={clsx(
                            "p-4 rounded-2xl border flex items-center gap-3 transition-all",
                            financialStats.remainingDebt > 0 
                                ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40" 
                                : "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                        )}>
                            <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                financialStats.remainingDebt > 0 
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            )}>
                                {financialStats.remainingDebt > 0 ? <AlertTriangle size={22} /> : <Check size={22} />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-500">وضعیت تراز حساب</p>
                                <p className={clsx(
                                    "text-base font-black truncate",
                                    financialStats.remainingDebt > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                                )}>
                                    {financialStats.remainingDebt > 0 ? `مانده: ${formatCurrency(financialStats.remainingDebt)}` : 'تسویه کامل'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Installments & Promises Section */}
                    {patientInstallments.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                                    <Layers size={16} className="text-primary-600" />
                                    <span>اقساط و تعهدات پرداخت بیمار</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-black">
                                        {patientInstallments.length} مورد
                                    </span>
                                </h4>
                                {financialStats.pendingInstallmentsCount > 0 && (
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                        {financialStats.pendingInstallmentsCount} قسط معوق یا در انتظار ({formatCurrency(financialStats.pendingInstallmentsAmount)})
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {patientInstallments.map((inst) => {
                                    const isPaid = inst.status === 'paid';
                                    return (
                                        <div
                                            key={inst.id}
                                            className={clsx(
                                                "glass-card p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden",
                                                isPaid 
                                                    ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20" 
                                                    : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                                                    <CalendarDays size={14} className="text-gray-400" />
                                                    قسط شماره {inst.installment_number}
                                                </span>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1",
                                                    isPaid 
                                                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800"
                                                        : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                                                )}>
                                                    {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                    {isPaid ? 'پرداخت شده' : 'در انتظار سررسید'}
                                                </span>
                                            </div>

                                            <div className="flex items-baseline justify-between pt-1">
                                                <span className="text-lg font-black text-gray-900 dark:text-white">
                                                    {formatCurrency(inst.amount)}
                                                </span>
                                                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                                                    سررسید: {formatJalaliDate(inst.due_date)}
                                                </span>
                                            </div>

                                            {inst.description && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                                    {inst.description}
                                                </p>
                                            )}

                                            {!isPaid && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedAppointmentForPayment(null);
                                                        setSelectedInstallmentForPayment(inst);
                                                        setPaymentModalMode('collect_installment');
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-600/20"
                                                >
                                                    <DollarSign size={14} />
                                                    <span>وصول و ثبت پرداخت این قسط</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="glass-card p-3 rounded-2xl flex flex-col md:flex-row gap-3 items-center border border-gray-100 dark:border-gray-800">
                        <div className="relative w-full md:w-56">
                            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                className="w-full pr-9 pl-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none appearance-none font-bold dark:text-white text-xs"
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            >
                                <option value="all">همه روش‌های پرداخت</option>
                                <option value="pos">کارت‌خوان (POS)</option>
                                <option value="cash">وجه نقد</option>
                                <option value="card_to_card">کارت به کارت</option>
                                <option value="debt">تعهد دفتری</option>
                                <option value="insurance">بیمه</option>
                            </select>
                            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="relative flex-1 w-full">
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="جستجو در فیش‌ها بر اساس شرح، مبلغ یا کد پیگیری..."
                                className="w-full pl-4 pr-9 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white text-xs font-medium"
                                value={paymentSearch}
                                onChange={(e) => setPaymentSearch(e.target.value)}
                            />
                        </div>

                        <div className="text-xs font-bold text-gray-400 px-2 shrink-0">
                            {filteredPatientPayments.length} تراکنش ثبت شده
                        </div>
                    </div>

                    {/* Detailed Payment Transactions Table */}
                    <div className="glass-card rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs min-w-[760px]">
                                <thead className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-black">
                                    <tr>
                                        <th className="px-5 py-4">#</th>
                                        <th className="px-5 py-4">تاریخ و ساعت</th>
                                        <th className="px-5 py-4">مبلغ دریافتی</th>
                                        <th className="px-5 py-4">روش پرداخت</th>
                                        <th className="px-5 py-4">خدمت / نوبت مربوطه</th>
                                        <th className="px-5 py-4">شماره پیگیری / فیش</th>
                                        <th className="px-5 py-4">شرح و توضیحات</th>
                                        <th className="px-5 py-4 text-center">فیش واریزی</th>
                                        <th className="px-5 py-4 text-center">رسید رسمی</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredPatientPayments.length > 0 ? (
                                        filteredPatientPayments.map((pmt, idx) => {
                                            const methodMeta = PAYMENT_METHOD_INFO[pmt.payment_method || 'other'] || PAYMENT_METHOD_INFO.other;
                                            const MethodIcon = methodMeta.icon;
                                            const relatedAppointment = pmt.appointment_uuid 
                                                ? patientAppointments.find(a => a.uuid === pmt.appointment_uuid)
                                                : null;

                                            return (
                                                <tr key={pmt.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                                    <td className="px-5 py-4 text-gray-400 font-bold">
                                                        {(idx + 1).toString().padStart(2, '۰')}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                                {formatJalaliDate(pmt.date)}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-semibold">
                                                                {formatJalaliTime(pmt.date)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(pmt.amount)}
                                                        </span>
                                                        {pmt.discount ? (
                                                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                                                تخفیف: {formatCurrency(pmt.discount)}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={clsx(
                                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border",
                                                            methodMeta.color
                                                        )}>
                                                            <MethodIcon size={12} />
                                                            <span>{methodMeta.label}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {relatedAppointment ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-primary-600 line-clamp-1">
                                                                    {relatedAppointment.services?.map((s: any) => getReasonTitle(s.reason_id)).join('، ') || 'ویزیت عمومی'}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    نوبت {formatJalaliDate(relatedAppointment.for_date)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-[11px] font-bold italic">
                                                                پرداخت مستقیم حساب
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {pmt.reference_number ? (
                                                            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 dir-ltr text-right inline-block">
                                                                {pmt.reference_number}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="text-gray-600 dark:text-gray-300 text-xs font-medium max-w-xs truncate" title={pmt.description || ''}>
                                                            {pmt.description || <span className="text-gray-400 italic">بدون توضیحات</span>}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        {pmt.receipt_image ? (
                                                            <button
                                                                onClick={() => setReceiptImageToPreview(pmt.receipt_image!)}
                                                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm inline-flex items-center gap-1"
                                                                title="مشاهده تصویر فیش"
                                                            >
                                                                <ImageIcon size={14} />
                                                                <span className="text-[10px] font-bold">فیش</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <button
                                                            onClick={() => setSelectedPaymentForReceipt(pmt)}
                                                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-xl transition-all inline-flex items-center gap-1"
                                                            title="مشاهده و چاپ رسید پرداخت"
                                                        >
                                                            <Printer size={16} />
                                                            <span className="text-[10px] font-bold">رسید</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="py-14 text-center text-gray-400">
                                                <Receipt size={40} className="mx-auto mb-3 text-gray-300" />
                                                <p className="text-sm font-bold">هیچ پرداخت یا تراکنشی برای این بیمار ثبت نشده است.</p>
                                                <p className="text-xs text-gray-400 mt-1">با کلیک روی «ثبت دریافت وجه»، اولین فیش پرداختی بیمار را ثبت کنید.</p>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAppointmentForPayment(null);
                                                        setSelectedInstallmentForPayment(null);
                                                        setPaymentModalMode('immediate');
                                                        setIsPaymentModalOpen(true);
                                                    }}
                                                    className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 shadow-md shadow-primary-600/20"
                                                >
                                                    <Plus size={16} />
                                                    <span>ثبت اولین پرداخت</span>
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* EDIT PATIENT MODAL */}
      {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                  <div className="bg-primary-600 p-8 text-white relative shrink-0">
                      <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><User size={32} /></div>
                          <div><h3 className="text-2xl font-black">ویرایش پرونده بیمار</h3><p className="opacity-80 text-sm mt-1 font-bold">اصلاح اطلاعات هویتی و تنظیمات بیمه</p></div>
                      </div>
                  </div>
                  <form onSubmit={handleEditSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><User size={14} /> نام و نام خانوادگی</label>
                              <input required className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 outline-none transition-all dark:text-white font-bold" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Phone size={14} /> شماره تماس</label>
                              <input required type="tel" className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 outline-none transition-all dir-ltr text-right dark:text-white font-bold" value={editFormData.phone_number} onChange={e => setEditFormData({...editFormData, phone_number: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Fingerprint size={14} /> کد ملی</label>
                              <input className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 outline-none transition-all dir-ltr text-right dark:text-white font-bold" value={editFormData.id_number} onChange={e => setEditFormData({...editFormData, id_number: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14} /> سازمان بیمه‌گر</label>
                              <div className="relative">
                                  <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 outline-none transition-all appearance-none dark:text-white font-bold" value={editFormData.insurance_id} onChange={e => setEditFormData({...editFormData, insurance_id: e.target.value})}>
                                      <option value="">آزاد (بدون بیمه)</option>
                                      {insurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                  </select>
                                  <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                              </div>
                          </div>
                      </div>

                      {/* Medical History Section In Modal */}
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-red-500" /> سابقه بیماری و حساسیت‌ها
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_DISEASES.map(disease => (
                                <button
                                    key={disease}
                                    type="button"
                                    onClick={() => toggleDisease(disease)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                                        editFormData.medical_history?.includes(disease) 
                                            ? "bg-red-50 border-red-500 text-white" 
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500"
                                    )}
                                >
                                    {disease}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 text-xs dark:text-white"
                                placeholder="بیماری دیگر..."
                                value={customDisease}
                                onChange={e => setCustomDisease(e.target.value)}
                            />
                            <button type="button" onClick={addCustomDisease} className="bg-gray-100 dark:bg-gray-800 px-4 rounded-xl text-xs font-bold transition-all">افزودن</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {editFormData.medical_history?.filter((d: string) => !COMMON_DISEASES.includes(d)).map((d: string) => (
                                <span key={d} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-lg text-[10px] font-black border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                    {d}
                                    <button type="button" onClick={() => toggleDisease(d)}><X size={12}/></button>
                                </span>
                            ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><StickyNote size={14} /> یادداشت‌های پزشکی</label>
                          <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 outline-none transition-all dark:text-white min-h-[100px] resize-none text-sm" value={editFormData.notes} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} />
                      </div>

                      <div className="flex gap-4 pt-2 shrink-0">
                          <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-2"><CheckCircle size={24} /> ذخیره تغییرات</button>
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all">انصراف</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* UPLOAD IMAGE MODAL */}
      {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 p-8 text-white relative shrink-0">
                      <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><ImageIcon size={32} /></div>
                          <div><h3 className="text-2xl font-black">افزودن مدرک تصویری</h3><p className="opacity-80 text-sm mt-1 font-bold">آرشیو اسکن‌ها، آزمایشات و تصاویر پزشکی</p></div>
                      </div>
                  </div>
                  <form onSubmit={handleUploadSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="space-y-4">
                          <div onClick={() => fileInputRef.current?.click()} className={clsx("border-3 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer", uploadData.image_data ? "border-indigo-500 bg-indigo-50/10" : "border-gray-200 dark:border-gray-700 hover:border-indigo-400 group")}>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                              {uploadData.image_data ? (
                                  <img src={uploadData.image_data} alt="Preview" className="w-full h-40 object-contain rounded-xl" />
                              ) : (
                                  <>
                                      <Upload className="text-gray-300 group-hover:text-indigo-500 transition-colors" size={48} />
                                      <div className="text-center"><p className="text-sm font-bold text-gray-700 dark:text-gray-300">کلیک کنید یا تصویر را اینجا رها کنید</p><p className="text-[10px] text-gray-400 mt-1 uppercase font-black">Max: 2MB (JPG, PNG)</p></div>
                                  </>
                              )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2"><label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> نوع مدرک</label><select className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white" value={uploadData.type} onChange={e => setUploadData({...uploadData, type: e.target.value})}>{IMAGE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                              <div className="space-y-2"><PersianDatePicker label="تاریخ مدرک" value={uploadData.date} onChange={d => setUploadData({...uploadData, date: d})} /></div>
                          </div>
                          <div className="space-y-2"><label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14}/> توضیحات تکمیلی</label><textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm resize-none" rows={3} placeholder="مثلا: ناهنجاری در بخش فک فوقانی مشاهده شد..." value={uploadData.description} onChange={e => setUploadData({...uploadData, description: e.target.value})} /></div>
                      </div>
                      <div className="flex gap-4 pt-2">
                          <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><CheckCircle size={24} /> ثبت در پرونده</button>
                          <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all">انصراف</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {selectedImgForPreview && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in !mt-0">
              <div className="w-full max-w-5xl h-[90vh] flex flex-col animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4 text-white">
                      <div><h3 className="text-xl font-black">{IMAGE_TYPES.find(t => t.id === selectedImgForPreview.type)?.label}</h3><p className="text-xs opacity-70">تاریخ: {formatJalaliDate(selectedImgForPreview.date)}</p></div>
                      <div className="flex items-center gap-3">
                          <a 
                              href={selectedImgForPreview.image_data} 
                              download={`${patient.name}-${IMAGE_TYPES.find(t => t.id === selectedImgForPreview.type)?.label}-${formatJalaliDate(selectedImgForPreview.date)}.png`}
                              className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                              title="دانلود تصویر"
                          >
                              <Download size={32} />
                          </a>
                          <button onClick={() => setSelectedImgForPreview(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                              <X size={32} />
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 bg-black/50 rounded-[3rem] overflow-hidden flex items-center justify-center border border-white/10 shadow-2xl relative">
                      <img src={selectedImgForPreview.image_data} alt="Full View" className="max-w-full max-h-full object-contain" />
                  </div>
                  {selectedImgForPreview.description && (
                      <div className="mt-4 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 text-white text-center"><p className="text-sm font-bold leading-relaxed">{selectedImgForPreview.description}</p></div>
                  )}
              </div>
          </div>
      )}

      {/* --- STANDALONE SESSION DETAILS MODAL --- */}
      {selectedVisit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 flex flex-col">
                  <div className="bg-gradient-to-l from-blue-600 to-blue-500 p-8 text-white relative shrink-0">
                      <button onClick={() => setSelectedVisit(null)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                      <div className="flex items-center gap-4"><div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><FileText size={32} /></div><div><h3 className="text-2xl font-black">خلاصه گزارش ویزیت</h3><div className="flex items-center gap-3 mt-1 opacity-90 text-sm font-bold"><span className="flex items-center gap-1"><Calendar size={14}/> {formatJalaliDate(selectedVisit.for_date)}</span><span className="flex items-center gap-1"><Clock size={14}/> ساعت {formatJalaliTime(selectedVisit.for_date)}</span></div></div></div>
                  </div>
                  <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100 dark:border-gray-700"><div><p className="text-[10px] font-black text-gray-400 uppercase">نوع خدمت</p><p className="text-sm font-black text-primary-600 mt-1">{selectedVisit.services.map(s => getReasonTitle(s.reason_id)).join('، ')}</p></div><div><p className="text-[10px] font-black text-gray-400 uppercase">پزشک معالج</p><p className="text-sm font-black text-gray-700 dark:text-gray-300 mt-1">{doctors.find(d => d.id === selectedVisit.doctor_id)?.name || 'ناشناس'}</p></div></div>
                      <div className="space-y-6"><div className="space-y-2"><div className="flex items-center gap-2 text-amber-600"><History size={18} /><h4 className="font-black text-xs">شرح حال و علائم</h4></div><div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{selectedVisit.history || <span className="text-gray-400 italic">موردی توسط پزشک ثبت نشده است.</span>}</div></div><div className="space-y-2"><div className="flex items-center gap-2 text-red-600"><Stethoscope size={18} /><h4 className="font-black text-xs">تشخیص (Diagnosis)</h4></div><div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 border-red-800/30 text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-bold">{selectedVisit.diagnosis || <span className="text-gray-400 italic font-normal">موردی توسط پزشک ثبت نشده است.</span>}</div></div><div className="space-y-2"><div className="flex items-center gap-2 text-blue-600"><ClipboardList size={18} /><h4 className="font-black text-xs">اقدامات و دستورات</h4></div><div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{selectedVisit.actions || <span className="text-gray-400 italic">موردی توسط پزشک ثبت نشده است.</span>}</div></div></div>

                      {/* Appointment Financial Status & Payment Action */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">وضعیت مالی این نوبت</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {(() => {
                                const visitPayments = payments.filter(p => p.appointment_uuid === selectedVisit.uuid);
                                const totalPaid = visitPayments.reduce((s, p) => s + p.amount, 0);
                                const totalCost = (selectedVisit.services || []).reduce((sum, s) => {
                                  const r = allReasons.find(reason => reason.uuid === s.reason_id);
                                  return sum + ((r?.price || 0) * (s.quantity || 1));
                                }, 0);
                                const rem = Math.max(0, totalCost - (selectedVisit.discount || 0) - totalPaid);
                                return (
                                  <>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                      هزینه: {formatCurrency(totalCost)} | دریافتی: {formatCurrency(totalPaid)}
                                    </span>
                                    <span className={clsx(
                                      "px-2 py-0.5 rounded text-[9px] font-black border",
                                      rem > 0 ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    )}>
                                      {rem > 0 ? `مانده: ${formatCurrency(rem)}` : 'تسویه شده'}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppointmentForPayment(selectedVisit);
                            setSelectedInstallmentForPayment(null);
                            setPaymentModalMode('immediate');
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                        >
                          <CreditCard size={14} />
                          <span>ثبت دریافت وجه این نوبت</span>
                        </button>
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0"><button className="flex-1 py-3 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"><Printer size={18} /> چاپ گزارش</button><button onClick={() => setSelectedVisit(null)} className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all">بستن</button></div>
              </div>
          </div>
      )}

      {/* OFFICIAL PAYMENT RECEIPT SLIP MODAL */}
      {selectedPaymentForReceipt && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in !mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Printable Receipt Area */}
            <div id="payment-receipt-slip" className="p-8 space-y-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
              {/* Receipt Header */}
              <div className="text-center border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-5">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 mb-2">
                  <Receipt size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">رسید دریافت وجه کلینیک</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">Official Clinic Payment Receipt</p>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500 font-bold">
                  <span>شماره رسید: <b className="font-mono text-gray-800 dark:text-gray-200">{selectedPaymentForReceipt.id}</b></span>
                  <span>|</span>
                  <span>تاریخ: <b>{formatJalaliDate(selectedPaymentForReceipt.date)}</b></span>
                  <span>|</span>
                  <span>ساعت: <b>{formatJalaliTime(selectedPaymentForReceipt.date)}</b></span>
                </div>
              </div>

              {/* Patient & Financial Details */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-400 font-bold">نام و نام خانوادگی بیمار:</span>
                  <span className="font-black text-gray-900 dark:text-white text-sm">{patient.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-400 font-bold">شماره تماس:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 dir-ltr text-right">{patient.phone_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-400 font-bold">روش پرداخت:</span>
                  <span className="font-black text-gray-800 dark:text-gray-200">
                    {PAYMENT_METHOD_INFO[selectedPaymentForReceipt.payment_method || 'other']?.label || selectedPaymentForReceipt.payment_method}
                  </span>
                </div>
                {selectedPaymentForReceipt.reference_number && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                    <span className="text-gray-400 font-bold">کد پیگیری / شماره فیش:</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-gray-200 dir-ltr">{selectedPaymentForReceipt.reference_number}</span>
                  </div>
                )}
                {selectedPaymentForReceipt.discount ? (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60 text-purple-600">
                    <span className="font-bold">تخفیف اعمال شده:</span>
                    <span className="font-black">{formatCurrency(selectedPaymentForReceipt.discount)}</span>
                  </div>
                ) : null}
                {selectedPaymentForReceipt.description && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                    <span className="text-gray-400 font-bold">بابت / توضیحات:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{selectedPaymentForReceipt.description}</span>
                  </div>
                )}
              </div>

              {/* Total Paid Amount Highlight */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">مبلغ دریافت شده</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">تسویه و ثبت در صندوق</span>
                </div>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(selectedPaymentForReceipt.amount)}
                </span>
              </div>

              {/* Signature / Stamp Area */}
              <div className="flex justify-between items-end pt-6 text-[11px] text-gray-400 font-bold border-t border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <p>مهر و امضای صندوق کلینیک</p>
                  <div className="h-12 w-28 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl mt-2 mx-auto flex items-center justify-center text-[10px] text-gray-300">
                    مهر کلینیک
                  </div>
                </div>
                <div className="text-center">
                  <p>امضای پرداخت‌کننده / بیمار</p>
                  <div className="h-12 w-28 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl mt-2 mx-auto flex items-center justify-center text-[10px] text-gray-300">
                    امضا
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
              >
                <Printer size={18} />
                <span>چاپ فیش رسید</span>
              </button>
              <button
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE VIEWER MODAL */}
      {receiptImageToPreview && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in !mt-0">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 animate-in zoom-in-95">
            <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <h4 className="text-sm font-black">تصویر فیش واریزی</h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={receiptImageToPreview}
                  download={`receipt-${patient.name}.png`}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                  title="دانلود فیش"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => setReceiptImageToPreview(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[70vh] flex items-center justify-center overflow-auto bg-gray-100 dark:bg-gray-900">
              <img src={receiptImageToPreview} alt="فیش واریزی" className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md" />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setReceiptImageToPreview(null)}
                className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-300 transition-all"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT / PATIENT PAYMENT MODAL */}
      <AppointmentPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedAppointmentForPayment(null);
          setSelectedInstallmentForPayment(null);
        }}
        initialMode={paymentModalMode}
        patient={patient}
        patientId={id}
        appointment={selectedAppointmentForPayment}
        installment={selectedInstallmentForPayment}
        onAddPayment={addPayment}
        onAddInstallment={addInstallment}
        onUpdateInstallment={updateInstallment}
        allReasons={allReasons}
      />
    </div>
  );
};
