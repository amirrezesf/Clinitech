import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate, formatJalaliTime, format24hTime, findNextAvailableGapToday } from '../utils/helpers';
import { 
  User, Phone, Stethoscope, CheckCircle, X, Calendar, 
  Clock, ArrowRight, UserPlus, ShieldCheck, 
  Repeat, ListChecks, CalendarRange, Trash2, PlusCircle,
  Plus, Layers, Minus, Wand2, CalendarDays, ChevronDown, Check,
  Info, Footprints, Siren, AlertCircle, CreditCard, Zap, UserCheck, Loader2, Pencil
} from 'lucide-react';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { Appointment, Patient, AppointmentItem } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { UrgentInsertionModal } from '../components/UrgentInsertionModal';
import { UrgentInsertionInlinePreview } from '../components/UrgentInsertionInlinePreview';
import { previewUrgentInsertion, UrgentInsertionPreviewResult } from '../services/urgentInsertionService';

interface PreviewSession {
  date: string;
  time: string;
  isAvailable: boolean;
}

export interface TimeSlotOption {
  time: string;
  isBooked: boolean;
  overlappingAppointments: Appointment[];
}

export const NewAppointment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    patients, 
    allReasons, 
    doctors,
    addAppointment, 
    addPatient, 
    allAppointments,
    getReasonTitle,
    insurances
  } = useData();

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Shared State
  const [appointmentMode, setAppointmentMode] = useState<'single' | 'walkin' | 'urgent' | 'recurring'>('single');
  const [formDoctorId, setFormDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  
  // New Patient Modal State
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [fullNewPatientData, setFullNewPatientData] = useState<any>({
      name: '',
      phone_number: '',
      id_number: '',
      insurance_id: '',
      insurance_code: '',
      notes: '',
      medical_history: []
  });

  // Double Booking Modal State
  const [doubleBookingModalData, setDoubleBookingModalData] = useState<{
    timeToUse: string;
    overlapping: Appointment[];
    mode: string;
  } | null>(null);

  // Urgent Insertion Preview Modal State
  const [isUrgentModalOpen, setIsUrgentModalOpen] = useState(false);
  const [urgentPreview, setUrgentPreview] = useState<UrgentInsertionPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmittingUrgent, setIsSubmittingUrgent] = useState(false);
  const [overtimeAllowedOverride, setOvertimeAllowedOverride] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // MULTI SERVICE STATE (Shared by all modes)
  const [selectedServices, setSelectedServices] = useState<AppointmentItem[]>([]);
  
  // Single/Walkin/Urgent Mode Specific
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  
  // Walk-in specific options
  const [walkinTimeOption, setWalkinTimeOption] = useState<'next_available' | 'right_now'>('next_available');
  const [walkinNextGap, setWalkinNextGap] = useState<string | null>(null);
  const [isCalculatingGap, setIsCalculatingGap] = useState<boolean>(false);

  // RECURRING MODE SPECIFIC
  const [seriesTitle, setSeriesTitle] = useState('');
  const [recurrenceInterval, setRecurrenceInterval] = useState(7); // Every X days
  const [sessionCount, setSessionCount] = useState(4); // Total sessions
  const [previewSessions, setPreviewSessions] = useState<PreviewSession[]>([]);

  // Per-row editing states for recurring preview table
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editRowDate, setEditRowDate] = useState<string>('');
  const [editRowTime, setEditRowTime] = useState<string>('');
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);

  const selectedDoctor = doctors.find(d => d.id === parseInt(formDoctorId));
  const doctorReasons = allReasons.filter(r => r.doctor_id === parseInt(formDoctorId));

  // Handle clicking outside patient search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPatientList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fetch urgent insertion preview whenever doctor, patient, services or date change
  useEffect(() => {
    if (appointmentMode !== 'urgent') return;
    const doc = doctors.find(d => d.id === parseInt(formDoctorId));
    if (!doc || !selectedPatientId || selectedServices.length === 0) {
      setUrgentPreview(null);
      return;
    }

    let isMounted = true;
    setIsPreviewLoading(true);

    previewUrgentInsertion({
      doctor: doc,
      services: selectedServices,
      allReasons,
      allAppointments,
      patients,
      forDate: selectedDate
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
  }, [appointmentMode, formDoctorId, selectedPatientId, selectedServices, selectedDate, doctors, allReasons, allAppointments, patients]);

  const addService = (id: string) => {
      if (!id) return;
      if (selectedServices.find(s => s.reason_id === id)) {
          toast.error('این خدمت قبلاً اضافه شده است.');
          return;
      }
      setSelectedServices([...selectedServices, { reason_id: id, quantity: 1 }]);
      setPreviewSessions([]);
  };

  const updateQuantity = (id: string, delta: number) => {
      setSelectedServices(prev => prev.map(s => 
          s.reason_id === id ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s
      ));
      setPreviewSessions([]);
  };

  const removeService = (id: string) => {
      setSelectedServices(selectedServices.filter(s => s.reason_id !== id));
      setPreviewSessions([]);
  };

  const totalDuration = useMemo(() => {
      return selectedServices.reduce((sum, s) => {
          const r = allReasons.find(res => res.uuid === s.reason_id);
          return sum + ((r?.duration || 0) * s.quantity);
      }, 0);
  }, [selectedServices, allReasons]);

  const totalPricePerSession = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
        const r = allReasons.find(res => res.uuid === s.reason_id);
        return sum + ((r?.price || 0) * s.quantity);
    }, 0);
  }, [selectedServices, allReasons]);

  // Insurance & Cost Share Calculation
  const insuranceCalculation = useMemo(() => {
    if (selectedServices.length === 0) return null;
    const p = patients.find(pat => pat.uuid === selectedPatientId);
    const insurance = p?.insurance_id ? insurances.find(i => i.id === p.insurance_id) : null;
    
    const total = totalPricePerSession;
    const coveragePercent = insurance?.coverage_percent || 0;
    const insuranceShare = (total * coveragePercent) / 100;
    const patientShare = total - insuranceShare;

    return {
      total,
      coveragePercent,
      insuranceShare,
      patientShare,
      insuranceName: insurance?.name || 'آزاد (بدون بیمه)'
    };
  }, [selectedServices, selectedPatientId, patients, insurances, totalPricePerSession]);

  // Available Slots Logic (Helper)
  const getFirstAvailableSlot = (dateStr: string, docId: number, duration: number) => {
    const doc = doctors.find(d => d.id === docId);
    if (!doc || duration === 0) return null;

    const dateObj = new Date(dateStr);
    const dayKey = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()];
    const schedule = doc.schedule[dayKey];
    if (!schedule || !schedule.is_working) return null;

    let current = new Date(`${dateStr}T${schedule.start}:00`);
    const endTime = new Date(`${dateStr}T${schedule.end}:00`);

    const dayAppts = allAppointments.filter(a => 
        a.doctor_id === docId && a.for_date.startsWith(dateStr) && a.status !== '2' && a.status !== 'cancelled'
    ).map(a => {
        const s = new Date(a.for_date);
        const dur = a.services.reduce((sum, serv) => sum + (allReasons.find(r=>r.uuid===serv.reason_id)?.duration || 0) * serv.quantity, 0) || 15;
        return { start: s, end: new Date(s.getTime() + dur * 60000) };
    });

    while (current.getTime() + duration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(current.getTime() + duration * 60000);
        const isBooked = dayAppts.some(apt => (current < apt.end && slotEnd > apt.start));
        if (!isBooked) {
            return format24hTime(current);
        }
        current = new Date(current.getTime() + 15 * 60000);
    }
    return null;
  };

  const availableTimeSlotsForSingle = useMemo<TimeSlotOption[]>(() => {
    if (appointmentMode === 'recurring') return [];
    const doc = doctors.find(d => d.id === parseInt(formDoctorId));
    if (!doc) return [];
    
    const dateStr = selectedDate;
    const dateObj = new Date(dateStr);
    const dayKey = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()];
    const schedule = doc.schedule?.[dayKey];
    if (!schedule || !schedule.is_working) return [];

    const slotDuration = totalDuration > 0 ? totalDuration : 15;
    const slots: TimeSlotOption[] = [];
    let current = new Date(`${dateStr}T${schedule.start}:00`);
    const endTime = new Date(`${dateStr}T${schedule.end}:00`);

    const dayAppts = allAppointments.filter(a => 
      a.doctor_id === doc.id && 
      a.for_date.startsWith(dateStr) && 
      a.status !== '2' && 
      a.status !== 'cancelled'
    ).map(a => {
      const s = new Date(a.for_date);
      const dur = a.services.reduce((sum, serv) => sum + (allReasons.find(r => r.uuid === serv.reason_id)?.duration || 0) * serv.quantity, 0) || 15;
      return { appointment: a, start: s, end: new Date(s.getTime() + dur * 60000) };
    });

    while (current.getTime() + slotDuration * 60000 <= endTime.getTime()) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60000);
      const timeStr = format24hTime(current);
      const overlapping = dayAppts.filter(apt => (current < apt.end && slotEnd > apt.start)).map(apt => apt.appointment);

      slots.push({
        time: timeStr,
        isBooked: overlapping.length > 0,
        overlappingAppointments: overlapping
      });

      current = new Date(current.getTime() + 15 * 60000);
    }
    return slots;
  }, [selectedDate, selectedServices, formDoctorId, allAppointments, totalDuration, appointmentMode, doctors, allReasons]);

  useEffect(() => {
    if (!selectedTime && availableTimeSlotsForSingle.length > 0) {
      setSelectedTime(availableTimeSlotsForSingle[0].time);
    }
  }, [availableTimeSlotsForSingle, selectedTime]);

  useEffect(() => {
    if (appointmentMode !== 'walkin') return;

    const doc = doctors.find(d => d.id === parseInt(formDoctorId));
    if (!doc || selectedServices.length === 0) {
      setWalkinNextGap(null);
      setIsCalculatingGap(false);
      return;
    }

    setIsCalculatingGap(true);
    const timer = setTimeout(() => {
      const gap = findNextAvailableGapToday(doc, allAppointments, selectedServices, allReasons);
      setWalkinNextGap(gap);
      setIsCalculatingGap(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [appointmentMode, formDoctorId, selectedServices, allAppointments, allReasons, doctors]);

  const checkSlotAvailability = (dateStr: string, timeStr: string, docId: number, duration: number) => {
    const doc = doctors.find(d => d.id === docId);
    if (!doc || duration === 0) return false;

    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return false;

    const dayKey = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()];
    const schedule = doc.schedule?.[dayKey];
    if (!schedule || !schedule.is_working) return false;

    const slotStart = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(slotStart.getTime())) return false;
    const slotEnd = new Date(slotStart.getTime() + (duration || 15) * 60000);

    const schedStart = new Date(`${dateStr}T${schedule.start}:00`);
    const schedEnd = new Date(`${dateStr}T${schedule.end}:00`);

    if (slotStart < schedStart || slotEnd > schedEnd) return false;

    const dayAppts = allAppointments.filter(a => 
      a.doctor_id === docId && 
      a.for_date.startsWith(dateStr) && 
      a.status !== '2' && 
      a.status !== 'cancelled'
    );

    const isOverlap = dayAppts.some(a => {
      const s = new Date(a.for_date);
      const dur = a.services.reduce((sum, serv) => sum + (allReasons.find(r => r.uuid === serv.reason_id)?.duration || 0) * serv.quantity, 0) || 15;
      const e = new Date(s.getTime() + dur * 60000);
      return slotStart < e && slotEnd > s;
    });

    return !isOverlap;
  };

  const handleStartEditRow = (index: number) => {
    const session = previewSessions[index];
    if (!session) return;
    setEditingRowIndex(index);
    setEditRowDate(session.date);
    setEditRowTime(session.time === 'تداخل زمانی' ? '09:00' : session.time);
    setDeletingRowIndex(null);
  };

  const handleSaveEditRow = (index: number) => {
    if (!editRowDate || !editRowTime) {
      toast.error('لطفاً تاریخ و ساعت معتبر وارد کنید.');
      return;
    }
    const isAvailable = checkSlotAvailability(editRowDate, editRowTime, parseInt(formDoctorId), totalDuration);
    const updated = [...previewSessions];
    updated[index] = {
      date: editRowDate,
      time: editRowTime,
      isAvailable
    };
    setPreviewSessions(updated);
    setEditingRowIndex(null);
    toast.success('اطلاعات جلسه بروزرسانی شد.');
  };

  const handleConfirmDeleteRow = (index: number) => {
    const updated = previewSessions.filter((_, i) => i !== index);
    setPreviewSessions(updated);
    setSessionCount(updated.length);
    setDeletingRowIndex(null);
    if (editingRowIndex === index) {
      setEditingRowIndex(null);
    } else if (editingRowIndex !== null && editingRowIndex > index) {
      setEditingRowIndex(editingRowIndex - 1);
    }
    toast.success('جلسه انتخابی با موفقیت حذف شد.');
  };

  const generateRecurringPreview = () => {
    if (selectedServices.length === 0) { toast.error('ابتدا خدمات را انتخاب کنید'); return; }
    
    setEditingRowIndex(null);
    setDeletingRowIndex(null);

    const sessions: PreviewSession[] = [];
    let currentDateCursor = new Date(selectedDate);

    for (let i = 0; i < sessionCount; i++) {
        const dateStr = currentDateCursor.toISOString().split('T')[0];
        const slot = getFirstAvailableSlot(dateStr, parseInt(formDoctorId), totalDuration);
        
        sessions.push({
            date: dateStr,
            time: slot || 'تداخل زمانی',
            isAvailable: !!slot
        });

        currentDateCursor.setDate(currentDateCursor.getDate() + recurrenceInterval);
    }
    setPreviewSessions(sessions);
  };

  const handleCreateNewPatient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullNewPatientData.name || !fullNewPatientData.phone_number) {
          toast.error('نام و شماره تماس الزامی است.');
          return;
      }
      const newId = `p-${Date.now()}`;
      await addPatient({ uuid: newId, ...fullNewPatientData });
      setSelectedPatientId(newId);
      setPatientSearch(fullNewPatientData.name);
      setIsPatientModalOpen(false);
      toast.success('پرونده بیمار ایجاد شد.');
  };

  const executeSaveAppointment = async (params: { timeToUse: string; isDoubleBooked: boolean; mode: string }) => {
    const { timeToUse, isDoubleBooked, mode } = params;
    const docId = parseInt(formDoctorId);
    const status = mode === 'walkin' || mode === 'urgent' ? '4' : '1';

    await addAppointment({ 
      uuid: `a-${Date.now()}`, 
      patient_id: selectedPatientId, 
      doctor_id: docId, 
      services: selectedServices, 
      status: status, 
      for_date: new Date(`${selectedDate}T${timeToUse}:00`).toISOString(), 
      discount: 0, 
      created_at: new Date().toISOString(),
      is_double_booked: isDoubleBooked,
      is_urgent: mode === 'urgent',
      is_walkin: mode === 'walkin'
    });

    if (isDoubleBooked) {
      toast.success('نوبت دوگانه با موفقیت ثبت شد.');
    } else if (mode === 'walkin') {
      toast.success('پذیرش حضوری ثبت شد و بیمار در صف حاضرین قرار گرفت.');
    } else if (mode === 'urgent') {
      toast.success('نوبت اورژانسی با اولویت بالا ثبت شد.');
    } else {
      toast.success('نوبت با موفقیت ثبت شد.');
    }

    setDoubleBookingModalData(null);
    navigate('/today');
  };

  const handleConfirmUrgentBooking = async () => {
    if (!urgentPreview) return;
    const doc = doctors.find(d => d.id === parseInt(formDoctorId));
    if (!doc) return;
    setIsSubmittingUrgent(true);

    try {
      const todayStr = urgentPreview.proposedDate;
      const insertionIso = new Date(`${todayStr}T${urgentPreview.proposedTime}:00`).toISOString();

      await addAppointment({
        uuid: `a-${Date.now()}`,
        patient_id: selectedPatientId,
        doctor_id: doc.id,
        services: selectedServices,
        status: '4',
        for_date: insertionIso,
        discount: 0,
        created_at: new Date().toISOString(),
        is_urgent: true
      });

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
      setIsSubmittingUrgent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || selectedServices.length === 0) { 
      toast.error('اطلاعات بیمار یا خدمات انتخاب نشده است.'); 
      return; 
    }

    const nowTimeStr = format24hTime(new Date());

    if (appointmentMode === 'walkin') {
      let timeToUse = nowTimeStr;
      if (walkinTimeOption === 'next_available') {
        if (!walkinNextGap) {
          toast.error('امروز هیچ زمان خالی در جدول کاری پزشک وجود ندارد. لطفاً نوبت تکی برای روزهای آینده رزرو کنید.');
          return;
        }
        timeToUse = walkinNextGap;
      }
      await executeSaveAppointment({ timeToUse, isDoubleBooked: false, mode: 'walkin' });
      return;
    }

    if (appointmentMode === 'urgent') {
      const doc = doctors.find(d => d.id === parseInt(formDoctorId));
      if (!doc) {
        toast.error('پزشک انتخاب نشده است');
        return;
      }
      setIsUrgentModalOpen(true);
      return;
    }

    if (appointmentMode === 'single') {
      const timeToUse = selectedTime || nowTimeStr;
      const docId = parseInt(formDoctorId);
      const newStart = new Date(`${selectedDate}T${timeToUse}:00`);
      const newEnd = new Date(newStart.getTime() + (totalDuration || 15) * 60000);

      const dayAppts = allAppointments.filter(a => 
        a.doctor_id === docId && 
        a.for_date.startsWith(selectedDate) && 
        a.status !== '2' && 
        a.status !== 'cancelled'
      );

      const overlapping = dayAppts.filter(a => {
        const s = new Date(a.for_date);
        const dur = a.services.reduce((sum, serv) => sum + (allReasons.find(r => r.uuid === serv.reason_id)?.duration || 0) * serv.quantity, 0) || 15;
        const e = new Date(s.getTime() + dur * 60000);
        return newStart < e && newEnd > s;
      });

      if (overlapping.length > 0) {
        setDoubleBookingModalData({
          timeToUse,
          overlapping,
          mode: appointmentMode
        });
        return;
      }

      await executeSaveAppointment({ timeToUse, isDoubleBooked: false, mode: appointmentMode });
    } else {
      if (previewSessions.length === 0) { toast.error('ابتدا پیش‌نمایش را تولید کنید'); return; }
      if (previewSessions.some(s => !s.isAvailable)) { toast.error('برخی جلسات تداخل دارند.'); return; }
      
      const recurringId = `rec-${Date.now()}`;
      for (const session of previewSessions) {
        await addAppointment({ 
          uuid: `a-${Math.random().toString(36).substr(2, 9)}`, 
          patient_id: selectedPatientId, 
          doctor_id: parseInt(formDoctorId), 
          services: selectedServices, 
          status: '1', 
          for_date: new Date(`${session.date}T${session.time}:00`).toISOString(), 
          discount: 0, 
          created_at: new Date().toISOString(), 
          recurring_id: recurringId, 
          recurring_title: seriesTitle || 'دوره درمانی'
        });
      }
      toast.success('دوره درمانی با موفقیت ثبت شد.');
      navigate('/today');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Page Title */}
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
              <ArrowRight size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-white">ثبت پذیرش و نوبت جدید</h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">پذیرش تکی، حضوری (بدون وقت)، اورژانسی و برنامه‌ریزی دوره‌ای درمانی</p>
            </div>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-xl bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
            {/* Mode Switcher Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 bg-gray-100 dark:bg-gray-800/80 rounded-2xl p-1.5 mb-8 shadow-inner gap-1.5">
                <button 
                  type="button" 
                  onClick={() => { 
                    setAppointmentMode('single'); 
                    setPreviewSessions([]); 
                  }} 
                  className={clsx(
                    "py-3 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2", 
                    appointmentMode === 'single' 
                      ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                    <Calendar size={18} />
                    <span>نوبت تکی</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => { 
                    setAppointmentMode('walkin'); 
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setSelectedTime(format24hTime(new Date()));
                    setPreviewSessions([]); 
                  }} 
                  className={clsx(
                    "py-3 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2", 
                    appointmentMode === 'walkin' 
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                    <Footprints size={18} />
                    <span>پذیرش حضوری</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => { 
                    setAppointmentMode('urgent'); 
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                    setSelectedTime(format24hTime(new Date()));
                    setPreviewSessions([]); 
                  }} 
                  className={clsx(
                    "py-3 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2", 
                    appointmentMode === 'urgent' 
                      ? "bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm" 
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                    <Siren size={18} />
                    <span>نوبت اورژانسی</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => { 
                    setAppointmentMode('recurring'); 
                    setPreviewSessions([]); 
                  }} 
                  className={clsx(
                    "py-3 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2", 
                    appointmentMode === 'recurring' 
                      ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                    <Repeat size={18} />
                    <span>نوبت دوره‌ای</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                 {/* Doctor & Patient Selection Header */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">پزشک معالج</label>
                        <select 
                          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white text-sm" 
                          value={formDoctorId} 
                          onChange={(e) => { setFormDoctorId(e.target.value); setSelectedServices([]); }}
                        >
                          {allowedDoctors.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                          ))}
                        </select>
                    </div>

                    <div className="space-y-2" ref={dropdownRef}>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">بیمار مراجع</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white text-sm" 
                            placeholder="جستجوی نام یا شماره پرونده بیمار..." 
                            value={patientSearch} 
                            onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(''); setShowPatientList(true); }} 
                            onFocus={() => setShowPatientList(true)} 
                          />
                          {showPatientList && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl max-h-52 overflow-y-auto custom-scrollbar">
                              {patients.filter(p => p.name.includes(patientSearch) || p.phone_number.includes(patientSearch)).map(p => (
                                <div 
                                  key={p.uuid} 
                                  onClick={() => { setSelectedPatientId(p.uuid); setPatientSearch(p.name); setShowPatientList(false); }} 
                                  className="px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/40 cursor-pointer flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700 last:border-0 font-bold dark:text-white"
                                >
                                  <span>{p.name}</span>
                                  <span className="text-[10px] text-gray-400 font-black">{p.phone_number}</span>
                                </div>
                              ))}
                              <div 
                                onClick={() => setIsPatientModalOpen(true)} 
                                className="px-4 py-3 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 font-black cursor-pointer text-xs flex items-center gap-2 border-t border-primary-100/50"
                              >
                                <PlusCircle size={16} /> تشکیل پرونده بیمار جدید
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                 </div>

                 {/* Services & Scheduling Details */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                    {/* Services Column */}
                    <div className="space-y-5">
                        <label className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                          <ListChecks className="text-primary-600" size={20} /> انتخاب پکیج خدمات و ویزیت
                        </label>
                        
                        <div className="relative">
                          <select 
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none appearance-none font-bold dark:text-white text-sm" 
                            onChange={(e) => { addService(e.target.value); e.target.value = ""; }} 
                            value=""
                          >
                            <option value="" disabled>افزودن خدمت جدید...</option>
                            {doctorReasons.map(r => (
                              <option key={r.uuid} value={r.uuid}>{r.title} - {formatCurrency(r.price)} ({r.duration} دقیقه)</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>

                        {/* Selected Services List */}
                        <div className="space-y-3">
                          {selectedServices.map(item => { 
                            const r = allReasons.find(res => res.uuid === item.reason_id); 
                            return (
                              <div key={item.reason_id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.5rem] shadow-sm animate-in slide-in-from-right-2">
                                <div className="flex-1">
                                  <p className="text-sm font-black text-gray-800 dark:text-white">{r?.title}</p>
                                  <p className="text-[10px] text-gray-400 font-bold">{formatCurrency(r?.price || 0)} × {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-xl p-1">
                                    <button type="button" onClick={() => updateQuantity(item.reason_id, -1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg text-gray-400">
                                      <Minus size={14}/>
                                    </button>
                                    <span className="px-3 text-sm font-black text-primary-600">{item.quantity}</span>
                                    <button type="button" onClick={() => updateQuantity(item.reason_id, 1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded-lg text-gray-400">
                                      <Plus size={14}/>
                                    </button>
                                  </div>
                                  <button type="button" onClick={() => removeService(item.reason_id)} className="text-red-300 hover:text-red-500 p-2">
                                    <Trash2 size={18}/>
                                  </button>
                                </div>
                              </div>
                            ); 
                          })}
                        </div>
                    </div>

                    {/* Scheduling Column */}
                    <div className="space-y-6">
                        {(appointmentMode === 'single' || appointmentMode === 'walkin' || appointmentMode === 'urgent') ? (
                            <div className="space-y-5 animate-in fade-in">
                                {appointmentMode === 'walkin' ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs font-bold flex items-center gap-3">
                                            <Footprints className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                                            <div>
                                                <p className="font-extrabold text-sm">پذیرش حضوری (بدون وقت قبلی)</p>
                                                <p className="text-[11px] opacity-80 mt-0.5">ثبت بیمار بر اساس اولین جای خالی در جدول پزشک یا ورود مستقیم به صف امروز.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={16} className="text-blue-500" /> زمان و نوبت پذیرش حضوری
                                            </label>

                                            {(!selectedPatientId || selectedServices.length === 0 || !formDoctorId) ? (
                                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 flex items-center gap-2">
                                                    <Info size={16} className="text-blue-500 shrink-0" />
                                                    <span>جهت محاسبه زمان پذیرش، لطفاً بیمار و حداقل یک خدمت را انتخاب کنید.</span>
                                                </div>
                                            ) : isCalculatingGap ? (
                                                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2.5">
                                                    <Loader2 size={18} className="animate-spin text-blue-500 shrink-0" />
                                                    <span>در حال استعلام و محاسبه اولین زمان خالی در جدول پزشک...</span>
                                                </div>
                                            ) : !walkinNextGap ? (
                                                <div className="p-5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                        <div className="space-y-1">
                                                            <p className="font-extrabold text-sm">عدم وجود زمان خالی برای امروز</p>
                                                            <p className="text-xs opacity-90 leading-relaxed">
                                                                امروز هیچ زمان خالی در جدول کاری این پزشک وجود ندارد یا ظرفیت پذیرش تکمیل شده است.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAppointmentMode('single');
                                                            toast.success('به حالت رزرو نوبت تکی منتقل شدید. تاریخ مورد نظر خود را انتخاب کنید.');
                                                        }}
                                                        className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
                                                    >
                                                        <Calendar size={16} />
                                                        رزرو نوبت تکی برای روزهای آینده
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div
                                                            onClick={() => setWalkinTimeOption('next_available')}
                                                            className={clsx(
                                                                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3",
                                                                walkinTimeOption === 'next_available'
                                                                    ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/10"
                                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="walkinOption"
                                                                checked={walkinTimeOption === 'next_available'}
                                                                onChange={() => setWalkinTimeOption('next_available')}
                                                                className="mt-1 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <div className="space-y-1">
                                                                <p className="font-extrabold text-xs text-gray-800 dark:text-white flex items-center gap-1.5">
                                                                    <span>پذیرش در اولین زمان خالی</span>
                                                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-black">
                                                                        پیش‌فرض سیستم
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 leading-relaxed">
                                                                    این بیمار در اولین زمان خالی، حدوداً ساعت <span className="text-sm font-black underline dir-ltr inline-block px-1">{walkinNextGap}</span> پذیرش خواهد شد.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div
                                                            onClick={() => setWalkinTimeOption('right_now')}
                                                            className={clsx(
                                                                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3",
                                                                walkinTimeOption === 'right_now'
                                                                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 shadow-md shadow-emerald-500/10"
                                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="walkinOption"
                                                                checked={walkinTimeOption === 'right_now'}
                                                                onChange={() => setWalkinTimeOption('right_now')}
                                                                className="mt-1 text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                            <div className="space-y-1">
                                                                <p className="font-extrabold text-xs text-gray-800 dark:text-white flex items-center gap-1.5">
                                                                    <Zap size={14} className="text-emerald-500" />
                                                                    <span>پذیرش با زمان هم‌اکنون (ورود فوری به صف)</span>
                                                                </p>
                                                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                                    افزودن مستقیم بیمار به صف حاضرین مطب در همین لحظه (ساعت <span className="font-black dir-ltr inline-block">{format24hTime(new Date())}</span>).
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {appointmentMode === 'urgent' && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-2xl border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-bold flex items-center gap-3">
                                                <Siren className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 animate-pulse" />
                                                <div>
                                                    <p className="font-extrabold text-sm">ثبت نوبت اورژانسی (فوری)</p>
                                                    <p className="text-[11px] opacity-80 mt-0.5">پذیرش با بالاترین اولویت جهت ویزیت سریع توسط پزشک.</p>
                                                </div>
                                            </div>
                                        )}

                                        <PersianDatePicker label="تاریخ ویزیت" value={selectedDate} onChange={setSelectedDate} />
                                
                                        {appointmentMode === 'urgent' ? (
                                            <UrgentInsertionInlinePreview
                                                preview={urgentPreview}
                                                isLoading={isPreviewLoading}
                                                hasRequiredSelections={!!formDoctorId && !!selectedPatientId && selectedServices.length > 0}
                                                overtimeAllowedOverride={overtimeAllowedOverride}
                                                onToggleOvertimeOverride={setOvertimeAllowedOverride}
                                            />
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock size={16} className="text-blue-500" /> ساعت پذیرش / ویزیت
                                                    </label>
                                                    {appointmentMode === 'walkin' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedTime(format24hTime(new Date()))}
                                                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                                        >
                                                            <Zap size={12} /> ثبت با زمان هم‌اکنون ({format24hTime(new Date())})
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        value={selectedTime}
                                                        onChange={(e) => setSelectedTime(e.target.value)}
                                                        className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none font-bold text-center text-sm dark:text-white dir-ltr"
                                                        placeholder="09:00"
                                                        maxLength={5}
                                                    />
                                                    {availableTimeSlotsForSingle.length > 0 && (
                                                        <div className="flex items-center text-xs text-gray-400 font-bold">
                                                            <span>انتخاب سریع زمان‌های پیشنهادی:</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {availableTimeSlotsForSingle.length > 0 && (
                                                    <div className="space-y-2 pt-1">
                                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                            {availableTimeSlotsForSingle.slice(0, 12).map(slot => {
                                                                const isSelected = selectedTime === slot.time;
                                                                return (
                                                                    <button 
                                                                      key={slot.time} 
                                                                      type="button" 
                                                                      onClick={() => setSelectedTime(slot.time)} 
                                                                      title={slot.isBooked ? "این ساعت یک نوبت ثبت‌شده دارد — انتخاب آن به معنای رزرو دوگانه است" : undefined}
                                                                      className={clsx(
                                                                        "py-2 px-1.5 rounded-xl border-2 text-[11px] font-black transition-all flex items-center justify-center gap-1.5", 
                                                                        isSelected 
                                                                          ? slot.isBooked
                                                                            ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20"
                                                                            : "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-600/20" 
                                                                          : slot.isBooked
                                                                          ? "bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80 hover:border-purple-400"
                                                                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-primary-200"
                                                                      )}
                                                                    >
                                                                      <span className={clsx(
                                                                        "w-2 h-2 rounded-full shrink-0",
                                                                        isSelected
                                                                          ? "bg-white"
                                                                          : slot.isBooked
                                                                          ? "bg-purple-500"
                                                                          : "border border-gray-400 dark:border-gray-500"
                                                                      )} />
                                                                      <span>{slot.time}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Legend / Help text */}
                                                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500 dark:text-gray-400 pt-1">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-500 inline-block"></span>
                                                                ساعت خالی
                                                            </span>
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                                                                ساعت دارای نوبت (رزرو دوگانه)
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {availableTimeSlotsForSingle.length === 0 && selectedServices.length > 0 && appointmentMode === 'single' && (
                                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-2xl flex items-center gap-2">
                                                        <Info size={14}/> تداخل زمانی یا نبود ساعت خالی پیشنهادی؛ می‌توانید ساعت را به‌صورت دستی وارد کنید.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                            </div>
                        )}

                                {/* Insurance / Financial Estimate Box */}
                                {insuranceCalculation && (
                                    <div className="p-4 rounded-2xl border bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 space-y-2">
                                        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                                            <span className="flex items-center gap-1.5"><CreditCard size={16}/> برآورد تعرفه و بیمه</span>
                                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-lg">{insuranceCalculation.insuranceName}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                            <div className="bg-white/80 dark:bg-gray-800/60 p-2 rounded-xl text-[10px] font-bold">
                                                <p className="text-gray-400">جمع کل</p>
                                                <p className="text-gray-800 dark:text-gray-200 mt-0.5">{formatCurrency(insuranceCalculation.total)}</p>
                                            </div>
                                            <div className="bg-white/80 dark:bg-gray-800/60 p-2 rounded-xl text-[10px] font-bold">
                                                <p className="text-blue-500">سهم بیمه</p>
                                                <p className="text-blue-700 dark:text-blue-300 mt-0.5">{formatCurrency(insuranceCalculation.insuranceShare)}</p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl text-[10px] font-black border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm">
                                                <p>قابل پرداخت بیمار</p>
                                                <p className="mt-0.5">{formatCurrency(insuranceCalculation.patientShare)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Recurring Mode View */
                            <div className="space-y-4 animate-in slide-in-from-left-4">
                                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/40 space-y-5">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mr-1">عنوان طرح درمان</label>
                                      <input 
                                        type="text" 
                                        className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 outline-none text-sm font-bold dark:text-white" 
                                        value={seriesTitle} 
                                        onChange={e => setSeriesTitle(e.target.value)} 
                                        placeholder="مثلاً: ارتودنسی یا درمان ریشه چندجلسه‌ای" 
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mr-1">تعداد جلسات</label>
                                        <input 
                                          type="number" 
                                          className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 font-black dark:text-white text-sm" 
                                          value={sessionCount} 
                                          onChange={e => setSessionCount(parseInt(e.target.value) || 1)} 
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mr-1">فاصله (روز)</label>
                                        <input 
                                          type="number" 
                                          className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 font-black dark:text-white text-sm" 
                                          value={recurrenceInterval} 
                                          onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)} 
                                        />
                                      </div>
                                    </div>

                                    <PersianDatePicker label="تاریخ شروع اولین جلسه" value={selectedDate} onChange={setSelectedDate} />
                                    
                                    <button 
                                      type="button" 
                                      onClick={generateRecurringPreview} 
                                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
                                    >
                                      <Wand2 size={20} /> محاسبه هوشمند برنامه جلسات
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Recurring Sessions Preview Table */}
                 {appointmentMode === 'recurring' && previewSessions.length > 0 && (
                     <div className="space-y-4 animate-in fade-in duration-500">
                         <div className="flex items-center justify-between px-1">
                           <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                             <CalendarDays size={20} className="text-indigo-600" /> لیست جلسات پیشنهادی دوره درمانی ({previewSessions.length} جلسه)
                           </h3>
                           <span className="text-[11px] text-gray-400 font-bold">
                             امکان ویرایش و حذف تک‌تک جلسات قبل از ثبت نهایی
                           </span>
                         </div>
                         <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-3xl bg-white dark:bg-gray-900 shadow-xs">
                             <table className="w-full text-right text-xs">
                                 <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 font-black uppercase tracking-tighter">
                                     <tr>
                                       <th className="px-5 py-4"># جلسه</th>
                                       <th className="px-5 py-4">تاریخ پیشنهادی</th>
                                       <th className="px-5 py-4">ساعت آزاد</th>
                                       <th className="px-5 py-4">وضعیت</th>
                                       <th className="px-5 py-4 text-center">عملیات</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                     {previewSessions.map((s, idx) => {
                                       const isEditing = editingRowIndex === idx;
                                       const isDeleting = deletingRowIndex === idx;

                                       if (isDeleting) {
                                         return (
                                           <tr key={idx} className="bg-red-50/80 dark:bg-red-950/40">
                                             <td colSpan={5} className="px-5 py-3">
                                               <div className="flex items-center justify-between text-xs">
                                                 <span className="font-extrabold text-red-800 dark:text-red-200">
                                                   آیا از حذف جلسه {(idx + 1).toString().padStart(2, '۰')} ({formatJalaliDate(s.date)} - {s.time}) اطمینان دارید؟
                                                 </span>
                                                 <div className="flex items-center gap-2">
                                                   <button
                                                     type="button"
                                                     onClick={() => handleConfirmDeleteRow(idx)}
                                                     className="px-3 py-1.5 bg-red-600 text-white rounded-xl font-black text-xs hover:bg-red-700 transition-colors shadow-xs"
                                                   >
                                                     تأیید حذف
                                                   </button>
                                                   <button
                                                     type="button"
                                                     onClick={() => setDeletingRowIndex(null)}
                                                     className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs hover:bg-gray-300 transition-colors"
                                                   >
                                                     انصراف
                                                   </button>
                                                 </div>
                                               </div>
                                             </td>
                                           </tr>
                                         );
                                       }

                                       if (isEditing) {
                                         return (
                                           <tr key={idx} className="bg-indigo-50/50 dark:bg-indigo-950/30">
                                             <td className="px-5 py-4 font-black text-indigo-600">{(idx + 1).toString().padStart(2, '۰')}</td>
                                             <td className="px-5 py-3">
                                               <div className="w-48">
                                                 <PersianDatePicker label="" value={editRowDate} onChange={setEditRowDate} />
                                               </div>
                                             </td>
                                             <td className="px-5 py-3">
                                               <input
                                                 type="text"
                                                 value={editRowTime}
                                                 onChange={(e) => setEditRowTime(e.target.value)}
                                                 placeholder="09:00"
                                                 maxLength={5}
                                                 className="w-24 p-2.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 rounded-xl font-black text-center text-xs dark:text-white dir-ltr outline-none focus:ring-2 focus:ring-indigo-500"
                                               />
                                             </td>
                                             <td className="px-5 py-4 text-gray-400 font-bold text-[10px]">
                                               در حال ویرایش...
                                             </td>
                                             <td className="px-5 py-3 text-center">
                                               <div className="flex items-center justify-center gap-2">
                                                 <button
                                                   type="button"
                                                   onClick={() => handleSaveEditRow(idx)}
                                                   className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                                                 >
                                                   <Check size={14} /> ذخیره
                                                 </button>
                                                 <button
                                                   type="button"
                                                   onClick={() => setEditingRowIndex(null)}
                                                   className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                                                 >
                                                   <X size={14} /> انصراف
                                                 </button>
                                               </div>
                                             </td>
                                           </tr>
                                         );
                                       }

                                       return (
                                           <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                                               <td className="px-5 py-4 font-black text-gray-400">{(idx + 1).toString().padStart(2, '۰')}</td>
                                               <td className="px-5 py-4 font-black text-gray-700 dark:text-gray-300">{formatJalaliDate(s.date)}</td>
                                               <td className="px-5 py-4 font-black text-primary-600 dir-ltr text-right">{s.time}</td>
                                               <td className="px-5 py-4">
                                                 {s.isAvailable ? (
                                                   <span className="bg-green-100 text-green-700 text-[9px] px-2.5 py-1 rounded-full font-black border border-green-200 inline-flex items-center gap-1">
                                                     آماده
                                                   </span>
                                                 ) : (
                                                   <span className="bg-red-100 text-red-700 text-[9px] px-2.5 py-1 rounded-full font-black border border-red-200 inline-flex items-center gap-1">
                                                     تداخل زمانی
                                                   </span>
                                                 )}
                                               </td>
                                               <td className="px-5 py-4 text-center">
                                                 <div className="flex items-center justify-center gap-1">
                                                   <button
                                                     type="button"
                                                     onClick={() => handleStartEditRow(idx)}
                                                     className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors"
                                                     title="ویرایش این جلسه"
                                                   >
                                                     <Pencil size={15} />
                                                   </button>
                                                   <button
                                                     type="button"
                                                     onClick={() => setDeletingRowIndex(idx)}
                                                     className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
                                                     title="حذف این جلسه"
                                                   >
                                                     <Trash2 size={15} />
                                                   </button>
                                                 </div>
                                               </td>
                                           </tr>
                                       );
                                     })}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 )}

                 {/* Submit Button */}
                 <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={selectedServices.length === 0 || !selectedPatientId || (appointmentMode === 'urgent' && urgentPreview?.exceedsWorkingHours && !urgentPreview.isOvertimeAllowed && !overtimeAllowedOverride)} 
                      className={clsx(
                        "px-10 py-4 text-white rounded-2xl font-black text-base shadow-2xl transition-all flex items-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:grayscale",
                        appointmentMode === 'walkin'
                          ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                          : appointmentMode === 'urgent'
                          ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                          : appointmentMode === 'recurring'
                          ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      )}
                    >
                       <CheckCircle size={24} /> 
                       <span>
                         {appointmentMode === 'walkin'
                           ? 'ثبت و پذیرش حضوری'
                           : appointmentMode === 'urgent'
                           ? 'ثبت و پذیرش اورژانسی'
                           : appointmentMode === 'recurring'
                           ? 'ثبت نهایی دوره درمانی'
                           : 'ثبت نهایی پذیرش'}
                       </span>
                    </button>
                 </div>
            </form>
        </div>

        {/* New Patient Full Form Modal */}
        {isPatientModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                    <div className="bg-primary-600 p-8 text-white relative shrink-0">
                      <button onClick={() => setIsPatientModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                        <X size={20} />
                      </button>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <UserPlus size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black">تشکیل پرونده بیمار جدید</h3>
                          <p className="opacity-80 text-sm mt-1 font-bold">اطلاعات هویتی و سوابق پزشکی را ثبت کنید</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleCreateNewPatient} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">نام کامل</label>
                            <input required className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white text-sm" value={fullNewPatientData.name} onChange={e => setFullNewPatientData({...fullNewPatientData, name: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">تلفن همراه</label>
                            <input required className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white dir-ltr text-right text-sm" value={fullNewPatientData.phone_number} onChange={e => setFullNewPatientData({...fullNewPatientData, phone_number: e.target.value})} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">سازمان بیمه‌گر</label>
                          <select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white text-sm" value={fullNewPatientData.insurance_id} onChange={e => setFullNewPatientData({...fullNewPatientData, insurance_id: e.target.value})}>
                            <option value="">آزاد (بدون بیمه)</option>
                            {insurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">یادداشت و هشدار پزشک</label>
                          <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold dark:text-white text-xs resize-none" rows={3} value={fullNewPatientData.notes} onChange={e => setFullNewPatientData({...fullNewPatientData, notes: e.target.value})} placeholder="مثلا: سابقه فشار خون یا حساسیت دارویی..." />
                        </div>

                        <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary-600/20 active:scale-[0.98] transition-all">
                          <Check size={24} /> ثبت و انتخاب این بیمار
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Double Booking Preview / Confirmation Modal */}
        {doubleBookingModalData && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-purple-100 dark:border-purple-900/50 animate-in zoom-in-95 flex flex-col">
                    <div className="bg-purple-600 p-6 text-white relative">
                      <button 
                        onClick={() => setDoubleBookingModalData(null)} 
                        className="absolute top-5 left-5 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                      >
                        <X size={18} />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                          <Layers size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black">پیش‌نمایش و تأیید رزرو دوگانه</h3>
                          <p className="opacity-80 text-xs font-bold mt-0.5">تداخل زمانی با نوبت ثبت‌شده قبلی شناسایی شد</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-extrabold text-sm">توجه: این ساعت دارای نوبت قبلی است</p>
                                <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                                    انتخاب این ساعت به معنای رزرو دوگانه (Double-Booking) است. اطلاعات بیمار قبلی و نوبت جدید را مرور نموده و در صورت اطمینان تأیید کنید.
                                </p>
                            </div>
                        </div>

                        {/* Existing Appointment(s) Details */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نوبت(های) موجود در این زمان</label>
                            {doubleBookingModalData.overlapping.map(apt => {
                              const patient = patients.find(p => p.uuid === apt.patient_id);
                              return (
                                <div key={apt.uuid} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-1.5 text-xs font-bold">
                                  <div className="flex items-center justify-between text-gray-800 dark:text-white">
                                    <span className="flex items-center gap-1.5 font-black text-sm">
                                      <User size={16} className="text-purple-500" />
                                      {patient?.name || 'بیمار ناشناس'}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dir-ltr bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                      {formatJalaliTime(apt.for_date)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-500">
                                    خدمات: {apt.services.map(s => getReasonTitle(s.reason_id)).join('، ')}
                                  </p>
                                </div>
                              );
                            })}
                        </div>

                        {/* New Appointment Details */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نوبت جدید در حال ثبت</label>
                            <div className="p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl border border-purple-200/80 dark:border-purple-800/80 space-y-1.5 text-xs font-bold">
                              <div className="flex items-center justify-between text-purple-900 dark:text-purple-200">
                                <span className="font-black text-sm">
                                  {patients.find(p => p.uuid === selectedPatientId)?.name || 'بیمار جدید'}
                                </span>
                                <span className="text-[11px] dir-ltr bg-purple-100 dark:bg-purple-900/60 px-2.5 py-1 rounded-lg">
                                  {formatJalaliDate(selectedDate)} - {doubleBookingModalData.timeToUse}
                                </span>
                              </div>
                              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                                خدمات: {selectedServices.map(s => getReasonTitle(s.reason_id)).join('، ')}
                              </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => executeSaveAppointment({ 
                                timeToUse: doubleBookingModalData.timeToUse, 
                                isDoubleBooked: true, 
                                mode: doubleBookingModalData.mode 
                              })}
                              className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={18} />
                              تأیید و ثبت نوبت دوگانه
                            </button>
                            <button
                              type="button"
                              onClick={() => setDoubleBookingModalData(null)}
                              className="px-5 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-all"
                            >
                              انصراف
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Urgent Insertion Preview Modal */}
        <UrgentInsertionModal
          isOpen={isUrgentModalOpen}
          onClose={() => {
            setIsUrgentModalOpen(false);
            setUrgentPreview(null);
          }}
          onConfirm={handleConfirmUrgentBooking}
          preview={urgentPreview}
          isLoading={isPreviewLoading}
          isSubmitting={isSubmittingUrgent}
          doctorName={doctors.find(d => d.id === parseInt(formDoctorId))?.name}
          patientName={patients.find(p => p.uuid === selectedPatientId)?.name}
        />
    </div>
  );
};
