
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Download, Plus, FileText, User, Edit, X, Phone, 
  ShieldCheck, StickyNote, Check, Stethoscope, ChevronDown, 
  Eye, Trash2, CheckSquare, Square, MinusSquare, CheckCircle, 
  Activity, PlusCircle, MessageSquare, Send, AlertTriangle, Coins, Users
} from 'lucide-react';
import { Patient } from '../types';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const COMMON_DISEASES = [
  'دیابت', 'فشار خون', 'بیماری قلبی', 'تیروئید', 'آسم', 'کبد چرب', 'تشنج', 'حساسیت دارویی', 'کم‌خونی', 'ام اس'
];

const SMS_PAGE_LIMIT = 70; // استاندارد کاراکتر فارسی در هر صفحه
const COST_PER_SMS_PAGE = 120; // هزینه فرضی هر صفحه پیامک به تومان

export const Patients = () => {
  const navigate = useNavigate();
  const { patients, addPatient, updatePatient, deletePatient, insurances, doctors, allAppointments } = useData();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [notes, setNotes] = useState('');
  const [medicalHistory, setMedicalHistory] = useState<string[]>([]);
  const [customDisease, setCustomDisease] = useState('');
  const [smsContent, setSmsContent] = useState('');

  // Sync Form
  useEffect(() => {
    if (editingPatient) {
      setName(editingPatient.name || '');
      setPhoneNumber(editingPatient.phone_number || '');
      setIdNumber(editingPatient.id_number || '');
      setInsuranceId(editingPatient.insurance_id || '');
      setNotes(editingPatient.notes || '');
      setMedicalHistory(editingPatient.medical_history || []);
    } else {
      setName('');
      setPhoneNumber('');
      setIdNumber('');
      setInsuranceId('');
      setNotes('');
      setMedicalHistory([]);
    }
    setCustomDisease('');
  }, [editingPatient, isModalOpen]);

  const toggleDisease = (disease: string) => {
    setMedicalHistory(prev => 
      prev.includes(disease) ? prev.filter(d => d !== disease) : [...prev, disease]
    );
  };

  const addCustomDisease = () => {
    if (customDisease.trim() && !medicalHistory.includes(customDisease.trim())) {
      setMedicalHistory(prev => [...prev, customDisease.trim()]);
      setCustomDisease('');
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch = p.name.includes(search) || p.phone_number.includes(search) || p.id_number.includes(search);
      if (!matchesSearch) return false;
      if (filterDoctorId === 'all') return true;
      return allAppointments.some(a => a.patient_id === p.uuid && a.doctor_id === parseInt(filterDoctorId));
    });
  }, [patients, search, filterDoctorId, allAppointments]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPatients.length) setSelectedIds([]);
    else setSelectedIds(filteredPatients.map(p => p.uuid));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- Calculations for SMS ---
  const smsStats = useMemo(() => {
      const charCount = smsContent.length;
      const pages = charCount === 0 ? 0 : Math.ceil(charCount / SMS_PAGE_LIMIT);
      const totalRecipients = selectedIds.length;
      const estimatedCost = pages * totalRecipients * COST_PER_SMS_PAGE;
      return { charCount, pages, totalRecipients, estimatedCost };
  }, [smsContent, selectedIds]);

  // --- Bulk Operations ---
  const handleBulkExport = () => {
    const dataToExport = patients.filter(p => selectedIds.includes(p.uuid));
    const headers = ['نام بیمار', 'شماره تماس', 'کد ملی', 'بیمه', 'سوابق بیماری'];
    const csvContent = [
        headers.join(','),
        ...dataToExport.map(p => {
            const ins = insurances.find(i => i.id === p.insurance_id)?.name || 'آزاد';
            const history = (p.medical_history || []).join(' | ');
            return `"${p.name}","${p.phone_number}","${p.id_number || '-'}","${ins}","${history}"`;
        })
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-export-${new Date().getTime()}.csv`;
    link.click();
    toast.success(`${selectedIds.length} پرونده صادر شد.`);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
      if (!confirm(`آیا از حذف دائمی ${selectedIds.length} پرونده اطمینان دارید؟`)) return;
      const toastId = toast.loading('در حال حذف پرونده‌ها...');
      for (const id of selectedIds) {
          await deletePatient(id);
      }
      toast.success('موارد انتخابی حذف شدند.', { id: toastId });
      setSelectedIds([]);
  };

  const handleSendBulkSms = () => {
      if (!smsContent.trim()) {
          toast.error('لطفا متن پیام را وارد کنید.');
          return;
      }
      toast.success(`پیامک با موفقیت برای ${selectedIds.length} نفر ارسال شد.`);
      setIsSmsModalOpen(false);
      setSmsContent('');
      setSelectedIds([]);
  };

  const handleEditClick = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patientData = { 
      name, 
      phone_number: phoneNumber, 
      id_number: idNumber, 
      insurance_id: insuranceId || undefined, 
      notes,
      medical_history: medicalHistory
    };

    if (editingPatient) {
        updatePatient(editingPatient.uuid, patientData);
        toast.success('بروزرسانی شد.');
    } else {
        addPatient({ uuid: `p-${Date.now()}`, ...patientData });
        toast.success('ثبت شد.');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">مدیریت بیماران</h2><p className="text-xs sm:text-sm text-gray-500 mt-1">لیست پرونده‌های بیماران و ویرایش اطلاعات</p></div>
        <button onClick={handleAddNewClick} className="w-full sm:w-auto justify-center bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all font-bold text-sm"><Plus size={20} /><span>بیمار جدید</span></button>
      </div>

       <div className="glass-card p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="جستجو (نام، شماره تماس)..." className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
       </div>

      {/* Table Container Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
        {/* Table Top Bar */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-black text-gray-800 dark:text-gray-200">فهرست بیماران و پرونده‌ها</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
              {filteredPatients.length} پرونده
            </span>
          </div>
          <div className="text-[11px] font-bold text-gray-400 sm:hidden flex items-center gap-1">
            <span>← برای مشاهده همه ستون‌ها اسکرول کنید</span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead className="bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black tracking-wider">
              <tr>
                <th className="px-3 py-3.5 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-primary-600 flex items-center justify-center mx-auto">
                    {selectedIds.length === filteredPatients.length && filteredPatients.length > 0 ? (
                      <CheckSquare size={17} />
                    ) : selectedIds.length > 0 ? (
                      <MinusSquare size={17} />
                    ) : (
                      <Square size={17} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-gray-400" />
                    <span>نام و مشخصات بیمار</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    <span>شماره تماس</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-gray-400" />
                    <span>کد ملی</span>
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Activity size={14} className="text-gray-400" />
                    <span>تعداد مراجعات</span>
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center">عملیات پرونده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const appointmentCount = allAppointments.filter(a => a.patient_id === patient.uuid).length;
                  const isSelected = selectedIds.includes(patient.uuid);
                  const firstLetter = patient.name.trim().charAt(0) || 'ب';

                  return (
                    <tr 
                      key={patient.uuid} 
                      className={clsx(
                        "transition-colors group",
                        isSelected 
                          ? "bg-primary-50/40 dark:bg-primary-900/20" 
                          : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                      )}
                    >
                      <td className="px-3 py-3.5 text-center">
                        <button 
                          onClick={() => toggleSelect(patient.uuid)} 
                          className={clsx(
                            "flex items-center justify-center mx-auto transition-colors",
                            isSelected ? "text-primary-600" : "text-gray-300 hover:text-primary-400 dark:text-gray-600"
                          )}
                        >
                          {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-black text-sm flex items-center justify-center border border-primary-200/60 dark:border-primary-800/60 shrink-0">
                            {firstLetter}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                                {patient.name}
                              </span>
                              {patient.medical_history && patient.medical_history.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800/60" title="دارای سابقه پزشکی">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  <span>هشدار پزشکی</span>
                                </span>
                              )}
                            </div>
                            {patient.notes && (
                              <span className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                {patient.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 dir-ltr justify-end font-mono font-bold text-xs text-gray-700 dark:text-gray-300">
                          <span>{patient.phone_number}</span>
                          <Phone size={12} className="text-gray-400 shrink-0" />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 dir-ltr text-right inline-block">
                          {patient.id_number || <span className="text-gray-400 font-sans text-[11px]">-</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 border",
                          appointmentCount > 0 
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60" 
                            : "bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200/60 dark:border-gray-700/60"
                        )}>
                          <span>{appointmentCount} نوبت</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => navigate(`/patients/${patient.uuid}`)} 
                            className="px-2.5 py-1.5 text-primary-600 hover:text-white bg-primary-50 hover:bg-primary-600 dark:bg-primary-950/50 dark:hover:bg-primary-600 rounded-xl text-xs font-bold border border-primary-200/80 dark:border-primary-800/60 transition-all flex items-center gap-1 shadow-xs active:scale-95" 
                            title="مشاهده پرونده کامل بیمار"
                          >
                            <Eye size={14} />
                            <span>پرونده</span>
                          </button>
                          <button 
                            onClick={() => handleEditClick(patient)} 
                            className="p-1.5 text-gray-500 hover:text-blue-600 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-colors" 
                            title="ویرایش اطلاعات"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => { if(confirm('آیا از حذف این پرونده اطمینان دارید؟')) deletePatient(patient.uuid); }} 
                            className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-colors" 
                            title="حذف پرونده"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <User size={36} className="text-gray-300 dark:text-gray-600" />
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-xs">
                        {search ? 'بیماری با این مشخصات یافت نشد.' : 'هنوز هیچ بیماری در سامانه ثبت نشده است.'}
                      </span>
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="text-primary-600 hover:underline text-xs font-bold mt-1"
                        >
                          پاک کردن عبارت جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- BULK ACTION FOOTER --- */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-800 text-white w-[94%] sm:w-auto max-w-2xl px-4 sm:px-8 py-3.5 sm:py-5 rounded-2xl sm:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-10 animate-in slide-in-from-bottom-10 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-3 sm:gap-4 sm:border-l sm:border-white/10 sm:pl-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-500 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg shadow-primary-500/20">{selectedIds.length}</div>
                  <div>
                    <span className="text-xs sm:text-sm font-black block">بیمار انتخاب شده</span>
                    <span className="text-[10px] opacity-50 font-bold">آماده عملیات گروهی</span>
                  </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button onClick={() => setIsSmsModalOpen(true)} className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/20">
                    <MessageSquare size={16} /> <span>پیامک گروهی</span>
                  </button>
                  <button onClick={handleBulkExport} className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-black transition-all border border-white/10">
                    <Download size={16} /> <span>اکسل</span>
                  </button>
                  <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-red-500/20">
                    <Trash2 size={16} /> <span>حذف</span>
                  </button>
                  <button onClick={() => setSelectedIds([])} className="p-2 sm:p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                    <X size={18} />
                  </button>
              </div>
          </div>
      )}

      {/* Bulk SMS Modal with Cost Prediction */}
      {isSmsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-3xl sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                  <div className="bg-blue-600 p-5 sm:p-8 text-white relative shrink-0">
                      <button onClick={() => setIsSmsModalOpen(false)} className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={18} /></button>
                      <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
                            <MessageSquare size={24} />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-xl font-black">ارسال پیامک گروهی</h3>
                            <p className="opacity-80 text-[11px] sm:text-xs mt-0.5 font-bold">ارسال پیام به {selectedIds.length} بیمار انتخاب شده</p>
                          </div>
                      </div>
                  </div>
                  <div className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                              <FileText size={14} /> متن پیام
                          </label>
                          <textarea 
                              className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-blue-500 outline-none transition-all dark:text-white min-h-[120px] resize-none text-sm leading-relaxed"
                              placeholder="متن خود را اینجا وارد کنید..."
                              value={smsContent}
                              onChange={e => setSmsContent(e.target.value)}
                          />
                          <div className="flex justify-between text-[10px] text-gray-400 font-bold px-2">
                            <span>{smsStats.charCount} کاراکتر</span>
                            <span>{smsStats.pages} صفحه پیامک (فارسی)</span>
                          </div>
                      </div>

                      {/* Cost Prediction Box */}
                      <div className="bg-primary-50 dark:bg-primary-900/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-primary-100 dark:border-primary-800/30 space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 font-black text-xs uppercase tracking-wider">
                              <Coins size={16} /> پیش‌بینی هزینه ارسال
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <div className="space-y-1">
                                  <p className="text-[10px] text-gray-400 font-bold">تعداد کل پیامک‌ها</p>
                                  <div className="flex items-center gap-1.5">
                                      <Users size={14} className="text-gray-400" />
                                      <span className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-200">{smsStats.totalRecipients * smsStats.pages} عدد</span>
                                  </div>
                              </div>
                              <div className="space-y-1 border-r border-primary-100 dark:border-primary-800 pr-3 sm:pr-4">
                                  <p className="text-[10px] text-gray-400 font-bold">هزینه نهایی تخمینی</p>
                                  <span className="text-base sm:text-lg font-black text-primary-600">{formatCurrency(smsStats.estimatedCost)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/10 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-2.5 sm:gap-3">
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                              توجه: هزینه نهایی بر اساس تعرفه اپراتور و زمان ارسال ممکن است تغییرات جزئی داشته باشد.
                          </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button 
                            onClick={handleSendBulkSms}
                            className="flex-1 py-3.5 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all transform active:scale-[0.98]"
                          >
                              <Send size={18} className="rotate-[-45deg] mb-0.5" />
                              <span>تایید و ارسال نهایی</span>
                          </button>
                          <button 
                            onClick={() => setIsSmsModalOpen(false)}
                            className="px-6 py-3 sm:py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl sm:rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
                          >
                            انصراف
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Existing Modal for Add/Edit Patient */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in !mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-3xl sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[90vh]">
             <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                   <User className="text-primary-600" size={20} />
                   {editingPatient ? 'ویرایش پرونده بیمار' : 'ایجاد پرونده بیمار جدید'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">نام و نام خانوادگی</label>
                      <input required className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white font-bold text-sm" value={name} onChange={e => setName(e.target.value)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">شماره همراه</label>
                      <input required type="tel" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white dir-ltr text-right font-bold" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">کد ملی</label>
                      <input className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white dir-ltr text-right font-bold" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">سازمان بیمه‌گر</label>
                      <select className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white font-bold" value={insuranceId} onChange={e => setInsuranceId(e.target.value)}>
                         <option value="">آزاد (بدون بیمه)</option>
                         {insurances.map(ins => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <label className="text-sm font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Activity className="text-red-500" size={18} />
                        سابقه بیماری و حساسیت‌ها
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {COMMON_DISEASES.map(disease => (
                            <button
                                key={disease}
                                type="button"
                                onClick={() => toggleDisease(disease)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                    medicalHistory.includes(disease) 
                                        ? "bg-red-50 border-red-500 text-white shadow-md" 
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-red-300"
                                )}
                            >
                                {disease}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <PlusCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text"
                                className="w-full pr-10 pl-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 text-xs dark:text-white"
                                placeholder="افزودن بیماری دیگر..."
                                value={customDisease}
                                onChange={e => setCustomDisease(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDisease())}
                            />
                        </div>
                        <button type="button" onClick={addCustomDisease} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors">افزودن</button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[32px]">
                        {medicalHistory.filter(d => !COMMON_DISEASES.includes(d)).map(d => (
                            <span key={d} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                {d}
                                <button type="button" onClick={() => toggleDisease(d)}><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">یادداشت‌های آزاد پزشک</label>
                   <textarea className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white h-24 resize-none text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="سایر توضیحات تکمیلی..." />
                </div>
                
                <button type="submit" className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold shadow-lg transition-all mt-4 flex items-center justify-center gap-2 shrink-0">
                   <CheckCircle size={20} />
                   <span>{editingPatient ? 'بروزرسانی پرونده' : 'ثبت پرونده'}</span>
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
