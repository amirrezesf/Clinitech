
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Patient, Appointment } from '../types';
import { Siren, User, Phone, Stethoscope, ArrowRight, Footprints, Clock, AlertCircle, CheckCircle, X, ShieldCheck, ChevronDown, CreditCard, Hash, Plus, Trash2, Tag, ListChecks } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

export const UrgentAppointment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const mode = searchParams.get('mode');
  const isWalkIn = mode === 'walkin';

  const { addPatient, addAppointment, doctors, allReasons, patients, allAppointments, insurances } = useData();
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

  const selectedDoctor = doctors.find(d => d.id === parseInt(selectedDoctorId));
  const doctorReasons = allReasons.filter(r => r.doctor_id === parseInt(selectedDoctorId));

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
    // (Simplified availability search logic based on totalDuration)
    setSuggestedTime(new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}));
  }, [isWalkIn, selectedReasonIds, selectedDoctor, allAppointments, allReasons]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalId = selectedPatientId;
    if (isNewPatient) {
       finalId = `p-${Date.now()}`;
       addPatient({ uuid: finalId, name: newPatientName, phone_number: newPatientPhone, id_number: '', notes: isWalkIn ? 'حضوری' : 'فوری', insurance_id: selectedInsuranceId });
    }
    if (!finalId || selectedReasonIds.length === 0) return;

    // Fixed: Map reason_ids to services array with quantity
    addAppointment({ 
        uuid: `a-${Date.now()}`, patient_id: finalId, doctor_id: selectedDoctor!.id, 
        services: selectedReasonIds.map(id => ({ reason_id: id, quantity: 1 })), 
        status: '1', for_date: new Date().toISOString(), 
        discount: 0, created_at: new Date().toISOString() 
    });
    toast.success('پذیرش با موفقیت ثبت شد.');
    navigate('/today');
  };

  const theme = isWalkIn ? { title: 'پذیرش حضوری (بدون نوبت)', icon: Footprints, color: 'text-blue-500', btn: 'bg-blue-600' } : { title: 'ثبت نوبت اورژانسی', icon: Siren, color: 'text-red-500', btn: 'bg-red-600' };
  const Icon = theme.icon;

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

                {/* Patient Search (Simplified for this file) */}
                <div className="space-y-2" ref={dropdownRef}>
                    <label className="text-sm font-bold text-gray-700">جستجوی پرونده یا ایجاد جدید</label>
                    <input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none" placeholder="نام یا شماره تماس..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setShowPatientList(true); }} onFocus={() => setShowPatientList(true)} />
                    {showPatientList && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                            {patients.filter(p => p.name.includes(patientSearch)).map(p => (
                                <div key={p.uuid} onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); setIsNewPatient(false); }} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0">{p.name}</div>
                            ))}
                            <div onClick={() => { setIsNewPatient(true); setShowPatientList(false); setNewPatientName(patientSearch); }} className="px-4 py-3 bg-primary-50 text-primary-700 font-bold cursor-pointer text-sm flex items-center gap-2"><Plus size={16}/> ایجاد پرونده جدید برای "{patientSearch}"</div>
                        </div>
                    )}
                </div>

                {/* MULTI SERVICE SELECTOR */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><ListChecks size={18} className="text-primary-600"/> انتخاب خدمات</label>
                    <select value="" onChange={(e) => addService(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm">
                        <option value="" disabled>افزودن خدمت...</option>
                        {doctorReasons.map(r => (<option key={r.uuid} value={r.uuid}>{r.title} - {formatCurrency(r.price)}</option>))}
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

                <button type="submit" disabled={selectedReasonIds.length === 0 || (!selectedPatientId && !isNewPatient)} className={clsx("w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3", theme.btn, (selectedReasonIds.length === 0) && "opacity-50 grayscale")}>
                    <CheckCircle size={24} /> <span>ثبت و پذیرش</span>
                </button>
            </form>
        </div>
    </div>
  );
};
