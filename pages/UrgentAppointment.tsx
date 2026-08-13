
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Patient, Appointment } from '../types';
import { Siren, User, Phone, Stethoscope, ArrowRight, Footprints, Clock, AlertCircle, CheckCircle, X, ShieldCheck, ChevronDown, CreditCard, Hash, Plus, Trash2, Tag, ListChecks } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, findNextAvailableGapToday } from '../utils/helpers';
import toast from 'react-hot-toast';
import { UrgentInsertionModal } from '../components/UrgentInsertionModal';
import { UrgentInsertionInlinePreview } from '../components/UrgentInsertionInlinePreview';
import { previewUrgentInsertion, UrgentInsertionPreviewResult } from '../services/urgentInsertionService';

export const UrgentAppointment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const mode = searchParams.get('mode');
  const isWalkIn = mode === 'walkin';

  const { addPatient, addAppointment, updateAppointment, doctors, allReasons, patients, allAppointments, insurances } = useData();
  const { user } = useAuth();
  
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New Patient Form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [selectedInsuranceId, setSelectedInsuranceId] = useState('');

  // Multi-Service State
  const [selectedReasonIds, setSelectedReasonIds] = useState<string[]>([]);
  
  const [suggestedTime, setSuggestedTime] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Urgent Insertion Modal & Preview State
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [urgentPreview, setUrgentPreview] = useState<UrgentInsertionPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overtimeAllowedOverride, setOvertimeAllowedOverride] = useState(false);

  const selectedDoctor = doctors.find(d => d.id === parseInt(selectedDoctorId));
  const doctorReasons = allReasons.filter(r => r.doctor_id === parseInt(selectedDoctorId));

  // Auto-fetch urgent insertion preview whenever doctor, patient, or services change
  useEffect(() => {
    if (isWalkIn) return;
    const hasPatient = selectedPatientId || (isNewPatient && (newPatientName || patientSearch));
    if (!selectedDoctor || !hasPatient || selectedReasonIds.length === 0) {
      setUrgentPreview(null);
      return;
    }

    let isMounted = true;
    setIsPreviewLoading(true);

    previewUrgentInsertion({
      doctor: selectedDoctor,
      services: selectedReasonIds.map(id => ({ reason_id: id, quantity: 1 })),
      allReasons,
      allAppointments,
      patients
    }).then(res => {
      if (isMounted) {
        setUrgentPreview(res);
        setIsPreviewLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setIsPreviewLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isWalkIn, selectedDoctor, selectedPatientId, isNewPatient, newPatientName, patientSearch, selectedReasonIds, allReasons, allAppointments, patients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPatientList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (patientIdParam) {
        const p = patients.find(pat => pat.uuid === patientIdParam);
        if (p) { setIsNewPatient(false); setSelectedPatientId(p.uuid); setPatientSearch(p.name); }
    }
  }, [patientIdParam, patients]);

  // Multi-service logic
  const addService = (id: string) => {
      if (!id || selectedReasonIds.includes(id)) return;
      setSelectedReasonIds([...selectedReasonIds, id]);
  };
  const removeService = (id: string) => setSelectedReasonIds(selectedReasonIds.filter(i => i !== id));

  const totalDuration = useMemo(() => selectedReasonIds.reduce((sum, id) => sum + (allReasons.find(r => r.uuid === id)?.duration || 0), 0), [selectedReasonIds, allReasons]);

  const costCalculation = useMemo(() => {
    if (selectedReasonIds.length === 0) return null;
    
    let insurance = null;
    if (!isNewPatient && selectedPatientId) {
        const p = patients.find(pat => pat.uuid === selectedPatientId);
        if (p?.insurance_id) insurance = insurances.find(i => i.id === p.insurance_id);
    } else if (isNewPatient && selectedInsuranceId) {
        insurance = insurances.find(i => i.id === selectedInsuranceId);
    }

    const totalRaw = selectedReasonIds.reduce((sum, id) => sum + (allReasons.find(r => r.uuid === id)?.price || 0), 0);
    const insuranceShare = (totalRaw * (insurance?.coverage_percent || 0)) / 100;
    
    return { total: totalRaw, insuranceShare, patientShare: totalRaw - insuranceShare, insuranceName: insurance?.name || 'آزاد' };
  }, [selectedReasonIds, selectedPatientId, isNewPatient, selectedInsuranceId, patients, insurances, allReasons]);

  // Availability Logic for Walk-in
  useEffect(() => {
    if (!isWalkIn || selectedReasonIds.length === 0 || !selectedDoctor) {
        setSuggestedTime(null); setAvailabilityError(null); return;
    }
    const gap = findNextAvailableGapToday(
      selectedDoctor,
      allAppointments,
      selectedReasonIds.map(id => ({ reason_id: id, quantity: 1 })),
      allReasons
    );
    setSuggestedTime(gap);
  }, [isWalkIn, selectedReasonIds, selectedDoctor, allAppointments, allReasons]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!selectedPatientId && !isNewPatient) || selectedReasonIds.length === 0 || !selectedDoctor) return;

    if (isWalkIn) {
      // Direct booking for walk-in
      let finalId = selectedPatientId;
      if (isNewPatient) {
         finalId = `p-${Date.now()}`;
         await addPatient({ uuid: finalId, name: newPatientName, phone_number: newPatientPhone, id_number: '', notes: 'حضوری', insurance_id: selectedInsuranceId });
      }

      await addAppointment({ 
          uuid: `a-${Date.now()}`, patient_id: finalId, doctor_id: selectedDoctor.id, 
          services: selectedReasonIds.map(id => ({ reason_id: id, quantity: 1 })), 
          status: '4', for_date: new Date().toISOString(), 
          discount: 0, created_at: new Date().toISOString(),
          is_walkin: true
      });
      toast.success('پذیرش حضوری با موفقیت ثبت شد.');
      navigate('/today');
      return;
    }

    // Urgent Mode: Opens confirmation modal
    setIsUrgentModalOpen(true);
  };

  // Confirm urgent booking & displace affected patients
  const handleConfirmUrgentBooking = async () => {
    if (!selectedDoctor || !urgentPreview) return;
    setIsSubmitting(true);

    try {
      let finalId = selectedPatientId;
      if (isNewPatient) {
         finalId = `p-${Date.now()}`;
         await addPatient({ 
           uuid: finalId, 
           name: newPatientName || patientSearch, 
           phone_number: newPatientPhone, 
           id_number: '', 
           notes: 'اورژانسی', 
           insurance_id: selectedInsuranceId 
         });
      }

      const todayStr = urgentPreview.proposedDate;
      const insertionDateTimeIso = new Date(`${todayStr}T${urgentPreview.proposedTime}:00`).toISOString();

      // 1. Add the urgent appointment
      await addAppointment({
        uuid: `a-${Date.now()}`,
        patient_id: finalId,
        doctor_id: selectedDoctor.id,
        services: selectedReasonIds.map(id => ({ reason_id: id, quantity: 1 })),
        status: '4',
        for_date: insertionDateTimeIso,
        discount: 0,
        created_at: new Date().toISOString(),
        is_urgent: true
      });

      // 2. Displace / shift affected appointments
      for (const dp of urgentPreview.displacedPatients) {
        const newForDateIso = new Date(`${todayStr}T${dp.newScheduledTime}:00`).toISOString();
        await updateAppointment(dp.appointmentUuid, { for_date: newForDateIso });
      }

      toast.success(`نوبت اورژانسی ثبت شد. ${urgentPreview.totalDisplacedCount} نوبت دیگر جابجا گردیدند.`);
      setIsUrgentModalOpen(false);
      navigate('/today');
    } catch (err) {
      toast.error('خطا در ثبت نوبت اورژانسی');
    } finally {
      setIsSubmitting(false);
    }
  };

  const theme = isWalkIn ? { title: 'پذیرش حضوری (بدون نوبت)', icon: Footprints, color: 'text-blue-500', btn: 'bg-blue-600' } : { title: 'ثبت نوبت اورژانسی', icon: Siren, color: 'text-red-500', btn: 'bg-red-600' };
  const Icon = theme.icon;

  const currentPatientObj = patients.find(p => p.uuid === selectedPatientId);
  const displayPatientName = isNewPatient ? (newPatientName || patientSearch) : (currentPatientObj?.name || patientSearch);

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-6 pb-20">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><ArrowRight size={24} /></button>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Icon className={theme.color} size={28} /> {theme.title}</h2>
        </div>

        <div className="glass-card p-8 rounded-3xl border-t-4 border-primary-500 shadow-xl bg-white/80">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">پزشک معالج</label>
                    <select value={selectedDoctorId} onChange={e => { setSelectedDoctorId(e.target.value); setSelectedReasonIds([]); }} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none">
                        {allowedDoctors.map(doc => (<option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>))}
                    </select>
                </div>

                {/* Patient Search */}
                <div className="space-y-2" ref={dropdownRef}>
                    <label className="text-sm font-bold text-gray-700">جستجوی پرونده یا ایجاد جدید</label>
                    <input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-sm" placeholder="نام یا شماره تماس..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setShowPatientList(true); }} onFocus={() => setShowPatientList(true)} />
                    {showPatientList && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                            {patients.filter(p => p.name.includes(patientSearch) || p.phone_number.includes(patientSearch)).map(p => (
                                <div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); setIsNewPatient(false); }} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0 font-bold">{p.name}</div>
                            ))}
                            <div onClick={() => { setIsNewPatient(true); setShowPatientList(false); setNewPatientName(patientSearch); }} className="px-4 py-3 bg-primary-50 text-primary-700 font-bold cursor-pointer text-sm flex items-center gap-2"><Plus size={16}/> ایجاد پرونده جدید برای "{patientSearch}"</div>
                        </div>
                    )}
                </div>

                {/* MULTI SERVICE SELECTOR */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><ListChecks size={18} className="text-primary-600"/> انتخاب خدمات</label>
                    <select value="" onChange={(e) => addService(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm font-bold">
                        <option value="" disabled>افزودن خدمت...</option>
                        {doctorReasons.map(r => (<option key={r.uuid} value={r.uuid}>{r.title} - {formatCurrency(r.price)} ({r.duration} دقیقه)</option>))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                        {selectedReasonIds.map(id => (
                            <div key={id} className="bg-primary-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
                                <span>{allReasons.find(r => r.uuid === id)?.title}</span>
                                <button type="button" onClick={() => removeService(id)}><X size={12}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {costCalculation && (
                     <div className="p-4 rounded-2xl border bg-emerald-50 border-emerald-100 animate-in fade-in">
                         <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold text-sm"><CreditCard size={18}/> برآورد هزینه خدمات ({selectedReasonIds.length} مورد)</div>
                         <div className="grid grid-cols-3 gap-2 text-center">
                             <div className="bg-white/60 p-2 rounded-xl text-[10px] font-bold"><p className="text-gray-500">کل</p><p>{formatCurrency(costCalculation.total)}</p></div>
                             <div className="bg-white/60 p-2 rounded-xl text-[10px] font-bold"><p className="text-blue-600">بیمه</p><p>{formatCurrency(costCalculation.insuranceShare)}</p></div>
                             <div className="bg-white p-2 rounded-xl text-[10px] font-black border border-emerald-200 shadow-sm"><p className="text-emerald-600">سهم بیمار</p><p>{formatCurrency(costCalculation.patientShare)}</p></div>
                         </div>
                     </div>
                )}

                {isWalkIn && selectedReasonIds.length > 0 && (
                     <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-bold space-y-1">
                         <p className="font-extrabold text-xs text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                             <Clock size={16} className="text-blue-500" />
                             زمان پذیرش حضوری
                         </p>
                         {suggestedTime ? (
                             <p className="text-xs font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                                 این بیمار در اولین زمان خالی، حدوداً ساعت <span className="text-sm font-black underline dir-ltr inline-block px-1">{suggestedTime}</span> پذیرش خواهد شد.
                             </p>
                         ) : (
                             <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                 امروز زمان خالی در جدول کاری پزشک یافت نشد (پذیرش با زمان هم‌اکنون انجام خواهد شد).
                             </p>
                         )}
                     </div>
                )}

                {!isWalkIn && (
                  <UrgentInsertionInlinePreview
                    preview={urgentPreview}
                    isLoading={isPreviewLoading}
                    hasRequiredSelections={!!selectedDoctor && (!!selectedPatientId || (isNewPatient && (!!newPatientName || !!patientSearch))) && selectedReasonIds.length > 0}
                    overtimeAllowedOverride={overtimeAllowedOverride}
                    onToggleOvertimeOverride={setOvertimeAllowedOverride}
                  />
                )}

                <button 
                  type="submit" 
                  disabled={selectedReasonIds.length === 0 || (!selectedPatientId && !isNewPatient) || (!isWalkIn && urgentPreview?.exceedsWorkingHours && !urgentPreview.isOvertimeAllowed && !overtimeAllowedOverride)} 
                  className={clsx("w-full text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3", theme.btn, (selectedReasonIds.length === 0 || (!isWalkIn && urgentPreview?.exceedsWorkingHours && !urgentPreview.isOvertimeAllowed && !overtimeAllowedOverride)) && "opacity-50 grayscale cursor-not-allowed")}
                >
                    <CheckCircle size={24} /> 
                    <span>{isWalkIn ? 'ثبت و پذیرش حضوری' : 'ثبت و پذیرش اورژانسی'}</span>
                </button>
            </form>
        </div>

        {/* Confirmation Modal for Urgent Insertion */}
        <UrgentInsertionModal
          isOpen={isUrgentModalOpen}
          onClose={() => {
            setIsUrgentModalOpen(false);
            setUrgentPreview(null);
          }}
          onConfirm={handleConfirmUrgentBooking}
          preview={urgentPreview}
          isLoading={isPreviewLoading}
          isSubmitting={isSubmitting}
          doctorName={selectedDoctor?.name}
          patientName={displayPatientName}
        />
    </div>
  );
};

