import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate, formatJalaliTime, statusLabels } from '../utils/helpers';
import { 
  Search, Plus, ChevronRight, ChevronLeft, PlayCircle, CheckCircle, 
  XCircle, Download, Clock, Square, CheckSquare, MinusSquare, 
  UserCheck, UserX, ShieldCheck, Siren, Layers, AlertCircle,
  PauseCircle, AlertTriangle, Users, Radio, Activity, RefreshCw, X, Check,
  MoreVertical, CalendarClock, RotateCcw, Sparkles, Receipt, CheckCheck,
  CreditCard, DollarSign
} from 'lucide-react';
import { Appointment } from '../types';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { api } from '../services/api';
import { DoctorDelayModal } from '../components/DoctorDelayModal';
import { AppointmentPaymentModal } from '../components/AppointmentPaymentModal';

export interface DoctorDelayRecord {
  doctorId: number;
  dateStr: string;
  delayMinutes: number;
  reason: string;
  appliedAt: string;
  sendSms?: boolean;
}

// Will become an admin-configurable setting — currently a local default until that setting exists on the backend.
export const EXTREME_LATENESS_THRESHOLD_MINUTES = 60;

// Operational priority calculator for fallback sorting
export const calculatePriorityScore = (apt: Appointment): number => {
  if (apt.priority_order !== undefined) return apt.priority_order;

  // 1. Patients currently in treatment
  const inVisit = apt.status === '3' || apt.status === 'in_visit';
  if (inVisit) return 1;

  // 2. Protected patients (clinic-caused disruption)
  if (apt.is_protected && !apt.is_returning) return 2;

  // 3. Urgent patients
  if (apt.is_urgent) return 3;

  // Arrival vs Scheduled comparison
  const scheduledTime = new Date(apt.for_date).getTime();
  const arrivalTime = apt.actual_arrival_at ? new Date(apt.actual_arrival_at).getTime() : null;
  const isLate = arrivalTime && scheduledTime ? arrivalTime > scheduledTime + 60000 : false;

  // 4. On-time scheduled patients
  if (!isLate && !apt.is_returning && !apt.is_forfeited && !apt.is_walkin) return 4;

  // 5. Late scheduled patients
  if (isLate && !apt.is_returning && !apt.is_forfeited && !apt.is_walkin) return 5;

  // 6. Protected returning patients
  if (apt.is_protected && apt.is_returning) return 6;

  // 7. Unprotected returning patients
  if (apt.is_returning && !apt.is_protected) return 7;

  // 8. Forfeited-turn patients
  if (apt.status === 'forfeited' || apt.is_forfeited) return 8;

  // 9. Walk-ins
  if (apt.is_walkin) return 9;

  return 10;
};

export const Appointments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    allAppointments,
    allReasons, 
    doctors,
    patients,
    payments,
    insurances,
    addPayment,
    addInstallment,
    getPatientName, 
    getReasonTitle, 
    updateAppointment, 
    logAction
  } = useData();

  const isDoctor = user?.role === 'doctor';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'in_visit' | 'finished' | 'absent'>('all');
  const [selectedDay, setSelectedDay] = useState(new DateObject({ calendar: persian, locale: persian_fa }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Checkout & Payment Modal State
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Live Board State
  const [serverQueue, setServerQueue] = useState<Appointment[] | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'fallback'>('connecting');
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [openMenuUuid, setOpenMenuUuid] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  // Close floating options menu on scroll or window resize
  useEffect(() => {
    const handleDismiss = () => {
      if (openMenuUuid) {
        setOpenMenuUuid(null);
        setMenuAnchor(null);
      }
    };
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [openMenuUuid]);

  // Doctor Selector
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(allowedDoctors[0]?.id || doctors[0]?.id || 1);

  // Doctor Arrival Delay State
  const [isDoctorDelayModalOpen, setIsDoctorDelayModalOpen] = useState(false);
  const [doctorDelays, setDoctorDelays] = useState<Record<string, DoctorDelayRecord>>(() => {
    try {
      return JSON.parse(localStorage.getItem('doctor_active_delays') || '{}');
    } catch {
      return {};
    }
  });

  const activeDateStr = selectedDay.toDate().toISOString().split('T')[0];
  const activeDoctorDelayKey = `${selectedDoctorId}_${activeDateStr}`;
  const activeDoctorDelay = doctorDelays[activeDoctorDelayKey] || null;

  // Selected Doctor Object
  const currentDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId);
  }, [doctors, selectedDoctorId]);

  // Delay Modal State (Bulk selection)
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(30);

  // Interrupt Modal State
  const [isInterruptModalOpen, setIsInterruptModalOpen] = useState(false);
  const [interruptTarget, setInterruptTarget] = useState<Appointment | null>(null);
  const [interruptReason, setInterruptReason] = useState('');

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelType, setCancelType] = useState<'patient' | 'clinic'>('patient');
  const [cancelReason, setCancelReason] = useState('');

  // Live Timer Ticker for Wait Duration calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 15000); // 15 seconds ticker
    return () => clearInterval(timer);
  }, []);

  // Sync / Fetch initial queue from GET /day-board/
  const fetchDayBoard = useCallback(async () => {
    setIsRefreshing(true);
    const dateStr = selectedDay.toDate().toISOString().split('T')[0];
    try {
      const res = await api<Appointment[] | { queue: Appointment[] }>(`/day-board/?doctor_id=${selectedDoctorId}&date=${dateStr}`);
      const queueList = Array.isArray(res) ? res : (res.queue || []);
      if (queueList && queueList.length >= 0) {
        // Do not re-sort client side, render in the exact order received!
        setServerQueue(queueList);
      }
    } catch (e) {
      // Fallback mode when API endpoint is unavailable
      setServerQueue(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDay, selectedDoctorId]);

  useEffect(() => {
    fetchDayBoard();
  }, [fetchDayBoard]);

  // WebSocket connection on mount / doctor change
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/day-board/${selectedDoctorId}/`;

    setWsStatus('connecting');

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isMounted) setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          const queue = Array.isArray(data) ? data : (data.queue || data.appointments || []);
          if (Array.isArray(queue)) {
            // Render directly in the priority order received from server WebSocket push
            setServerQueue(queue);
          }
        } catch (err) {
          console.error("WS Parse Error", err);
        }
      };

      ws.onerror = () => {
        if (isMounted) setWsStatus('fallback');
      };

      ws.onclose = () => {
        if (isMounted) setWsStatus('disconnected');
      };
    } catch (err) {
      if (isMounted) setWsStatus('fallback');
    }

    return () => {
      isMounted = false;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [selectedDoctorId]);

  // Build current display list
  const currentAppointmentsList = useMemo(() => {
    const dateStr = selectedDay.toDate().toISOString().split('T')[0];

    const matchStatus = (apt: Appointment) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'present') return apt.status === '4' || apt.status === 'present';
      if (statusFilter === 'in_visit') return apt.status === '3' || apt.status === 'in_visit';
      if (statusFilter === 'finished') return apt.status === '0' || apt.status === 'finished';
      if (statusFilter === 'absent') return apt.status === '2' || apt.status === 'absent' || apt.status === 'cancelled';
      return true;
    };

    // If we have received queue directly from server / WS, use it in exact order
    if (serverQueue && serverQueue.length > 0) {
      return serverQueue.filter(apt => {
        if (selectedDoctorId && apt.doctor_id !== selectedDoctorId) return false;
        const patientName = getPatientName(apt.patient_id);
        const matchesSearch = !search.trim() || patientName.includes(search) || apt.uuid.includes(search);
        const matchesDate = !apt.for_date || apt.for_date.startsWith(dateStr);
        return matchesSearch && matchesDate && matchStatus(apt);
      });
    }

    // Otherwise, fallback to local DataContext with priority sorting rules
    const localList = allAppointments.filter(apt => {
      if (user?.allowedDoctorIds && !user.allowedDoctorIds.includes(apt.doctor_id)) return false;
      if (selectedDoctorId && apt.doctor_id !== selectedDoctorId) return false;
      const patientName = getPatientName(apt.patient_id);
      const matchesSearch = !search.trim() || patientName.includes(search);
      const matchesDate = apt.for_date.startsWith(dateStr);
      return matchesSearch && matchesDate && matchStatus(apt);
    });

    // Client-side fallback sorting strictly by queue priority order
    return [...localList].sort((a, b) => {
      const pA = calculatePriorityScore(a);
      const pB = calculatePriorityScore(b);
      if (pA !== pB) return pA - pB;
      return new Date(a.for_date).getTime() - new Date(b.for_date).getTime();
    });
  }, [serverQueue, allAppointments, search, statusFilter, selectedDay, selectedDoctorId, user, getPatientName]);

  // Calculations for Summary Stats Bar
  const statsSummary = useMemo(() => {
    const dateStr = selectedDay.toDate().toISOString().split('T')[0];
    const todayList = allAppointments.filter(a => 
      a.for_date.startsWith(dateStr) && 
      (!selectedDoctorId || a.doctor_id === selectedDoctorId)
    );

    const total = todayList.length;
    const present = todayList.filter(a => a.status === '4' || a.status === 'present').length;
    const inVisit = todayList.filter(a => a.status === '3' || a.status === 'in_visit').length;
    const finished = todayList.filter(a => a.status === '0' || a.status === 'finished').length;
    const absent = todayList.filter(a => a.status === '2' || a.status === 'absent' || a.status === 'cancelled').length;

    // Calculate Average Wait Time (for present and finished patients who arrived)
    let totalWaitMins = 0;
    let countedPatients = 0;

    todayList.forEach(apt => {
      if (apt.actual_arrival_at) {
        const arrivalMs = new Date(apt.actual_arrival_at).getTime();
        let endWaitMs = nowTime;
        if (apt.visit_started_at) {
          endWaitMs = new Date(apt.visit_started_at).getTime();
        }
        if (endWaitMs >= arrivalMs) {
          totalWaitMins += Math.floor((endWaitMs - arrivalMs) / 60000);
          countedPatients++;
        }
      }
    });

    const avgWaitMins = countedPatients > 0 ? Math.round(totalWaitMins / countedPatients) : 0;

    // Financial breakdown for today
    let todaySettledAmount = 0;
    let todayPendingAmount = 0;

    todayList.forEach(apt => {
      if (apt.status === 'cancelled') return;
      const aptPayments = payments.filter(p => p.appointment_uuid === apt.uuid);
      const totalPaid = aptPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalDiscount = aptPayments.reduce((sum, p) => sum + (p.discount || 0), 0) + (apt.discount || 0);
      const grossPrice = apt.services.reduce((sum, s) => {
        const r = allReasons.find(reason => reason.uuid === s.reason_id);
        return sum + (r ? r.price * (s.quantity || 1) : 0);
      }, 0);
      const netPayable = Math.max(0, grossPrice - totalDiscount);
      const remaining = Math.max(0, netPayable - totalPaid);

      todaySettledAmount += totalPaid;
      todayPendingAmount += remaining;
    });

    return { total, present, inVisit, finished, absent, avgWaitMins, todaySettledAmount, todayPendingAmount };
  }, [allAppointments, payments, allReasons, selectedDay, selectedDoctorId, nowTime]);

  // Helper: Calculate wait duration in minutes since arrival
  const getWaitDurationMinutes = (apt: Appointment) => {
    if (!apt.actual_arrival_at) return null;
    const arrivalMs = new Date(apt.actual_arrival_at).getTime();
    const endMs = (apt.status === '3' || apt.status === 'in_visit') && apt.visit_started_at 
      ? new Date(apt.visit_started_at).getTime() 
      : nowTime;
    
    if (endMs < arrivalMs) return 0;
    return Math.floor((endMs - arrivalMs) / 60000);
  };

  // Helper: Calculate lateness in minutes
  const getLatenessMinutes = (apt: Appointment) => {
    if (!apt.actual_arrival_at || !apt.for_date) return 0;
    const arrivalMs = new Date(apt.actual_arrival_at).getTime();
    const scheduledMs = new Date(apt.for_date).getTime();
    if (arrivalMs > scheduledMs + 60000) {
      return Math.floor((arrivalMs - scheduledMs) / 60000);
    }
    return 0;
  };

  // Helper: Calculate appointment financial breakdown
  const getAppointmentFinancials = useCallback((apt: Appointment) => {
    const aptPayments = payments.filter(p => p.appointment_uuid === apt.uuid);
    const totalPaid = aptPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscount = aptPayments.reduce((sum, p) => sum + (p.discount || 0), 0) + (apt.discount || 0);
    const grossPrice = apt.services.reduce((sum, s) => {
      const r = allReasons.find(reason => reason.uuid === s.reason_id);
      return sum + (r ? r.price * (s.quantity || 1) : 0);
    }, 0);
    const netPayable = Math.max(0, grossPrice - totalDiscount);
    const balanceRemaining = Math.max(0, netPayable - totalPaid);
    const isPaidInFull = (totalPaid >= netPayable && netPayable > 0) || (grossPrice === 0 && totalDiscount === 0);
    const isPartiallyPaid = totalPaid > 0 && balanceRemaining > 0;
    const isUnpaid = totalPaid === 0;

    return {
      grossPrice,
      totalDiscount,
      netPayable,
      totalPaid,
      balanceRemaining,
      isPaidInFull,
      isPartiallyPaid,
      isUnpaid,
      paymentsCount: aptPayments.length
    };
  }, [payments, allReasons]);

  const openCheckoutModal = (apt: Appointment) => {
    setCheckoutAppointment(apt);
    setIsCheckoutModalOpen(true);
  };

  // --- Actions Handler (No optimistic UI updates - waits for server/WS update) ---
  const executeDayBoardAction = async (aptUuid: string, actionName: string, updates: Partial<Appointment>, payload?: any) => {
    setLoadingActionId(aptUuid);
    try {
      // Send REST call to backend
      await api(`/day-board/action/`, {
        method: 'POST',
        data: {
          appointment_uuid: aptUuid,
          action: actionName,
          ...payload
        }
      }).catch(() => {
        // Fallback to local DataContext update if server is standard REST mock
        return updateAppointment(aptUuid, updates);
      });

      // Refetch / Wait for push update
      await fetchDayBoard();
      toast.success('عملیات با موفقیت انجام شد.');
    } catch (e) {
      toast.error('خطا در ثبت عملیات.');
    } finally {
      setLoadingActionId(null);
    }
  };

  // 1. Check in (ثبت حضور)
  const handleCheckIn = (uuid: string) => {
    executeDayBoardAction(uuid, 'check_in', {
      status: '4',
      actual_arrival_at: new Date().toISOString()
    });
  };

  // 2. Start visit (شروع ویزیت)
  const handleStartVisit = (uuid: string) => {
    executeDayBoardAction(uuid, 'start_visit', {
      status: '3',
      visit_started_at: new Date().toISOString()
    });
  };

  // 3. Mark absent (غایب)
  const handleMarkAbsent = (uuid: string) => {
    executeDayBoardAction(uuid, 'mark_absent', {
      status: '2'
    });
  };

  // 4. Finish visit (پایان ویزیت)
  const handleFinishVisit = (uuid: string) => {
    executeDayBoardAction(uuid, 'finish_visit', {
      status: '0',
      visit_ended_at: new Date().toISOString()
    });
    const apt = currentAppointmentsList.find(a => a.uuid === uuid);
    if (apt) {
      setCheckoutAppointment(apt);
      setIsCheckoutModalOpen(true);
    }
  };

  // 5. Open Interrupt Modal (قطع جلسه)
  const openInterruptModal = (apt: Appointment) => {
    setInterruptTarget(apt);
    setInterruptReason('');
    setIsInterruptModalOpen(true);
  };

  const handleConfirmInterrupt = async () => {
    if (!interruptReason.trim()) {
      toast.error('لطفاً دلیل قطع جلسه را وارد کنید.');
      return;
    }
    if (!interruptTarget) return;

    await executeDayBoardAction(interruptTarget.uuid, 'interrupt', {
      status: 'interrupted',
      interrupt_reason: interruptReason
    }, { reason: interruptReason });

    setIsInterruptModalOpen(false);
    setInterruptTarget(null);
  };

  // 6. Open Cancel Confirm Modal (لغو نوبت)
  const openCancelModal = (apt: Appointment) => {
    setCancelTarget(apt);
    setCancelType('patient');
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (cancelType === 'clinic' && !cancelReason.trim()) {
      toast.error('لطفاً علت لغو توسط مرکز درمان را وارد کنید.');
      return;
    }
    if (!cancelTarget) return;

    await executeDayBoardAction(cancelTarget.uuid, 'cancel', {
      status: 'cancelled',
      cancellation_type: cancelType,
      cancellation_reason: cancelReason
    }, { cancellation_type: cancelType, cancellation_reason: cancelReason });

    setIsCancelModalOpen(false);
    setCancelTarget(null);
  };

  // --- Selection & Bulk Actions ---
  const toggleSelectAll = () => {
    if (selectedIds.length === currentAppointmentsList.length) setSelectedIds([]);
    else setSelectedIds(currentAppointmentsList.map(a => a.uuid));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkExport = () => {
    const dataToExport = currentAppointmentsList.filter(a => selectedIds.includes(a.uuid));
    const headers = ['نام بیمار', 'ساعت', 'خدمات', 'وضعیت', 'پزشک'];
    const csvContent = [
        headers.join(','), 
        ...dataToExport.map(a => {
            const pName = getPatientName(a.patient_id);
            const time = formatJalaliTime(a.for_date);
            const services = a.services.map(s => getReasonTitle(s.reason_id)).join(' | ');
            const status = statusLabels[a.status]?.label || 'مشخص نشده';
            const doc = doctors.find(d => d.id === a.doctor_id)?.name || '-';
            return `"${pName}","${time}","${services}","${status}","${doc}"`;
        })
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `day-board-${selectedDay.format('YYYY-MM-DD')}.csv`;
    link.click();
    toast.success(`${selectedIds.length} نوبت صادر شد.`);
    setSelectedIds([]);
  };

  const handleApplyDelay = async () => {
      const toastId = toast.loading(`در حال تعویق انداختن ${selectedIds.length} نوبت...`);
      for (const id of selectedIds) {
          const apt = allAppointments.find(a => a.uuid === id);
          if (apt) {
              const currentDate = new Date(apt.for_date);
              const newDate = new Date(currentDate.getTime() + delayMinutes * 60000);
              await updateAppointment(id, { for_date: newDate.toISOString() });
          }
      }
      toast.success(`زمان نوبت‌ها به مدت ${delayMinutes} دقیقه جابجا شد.`, { id: toastId });
      setIsDelayModalOpen(false);
      setSelectedIds([]);
      fetchDayBoard();
  };

  // --- DOCTOR ARRIVAL DELAY HANDLERS ---
  const handleApplyDoctorDelay = async (config: {
    delayMinutes: number;
    reason: string;
    sendSms: boolean;
    protectPatients: boolean;
    shiftAppointments: boolean;
  }) => {
    const { delayMinutes: dMins, reason: dReason, sendSms, protectPatients, shiftAppointments } = config;
    const dateStr = selectedDay.toDate().toISOString().split('T')[0];
    const docName = currentDoctor?.name || 'پزشک';
    const toastId = toast.loading(`در حال اعمال تاخیر ${dMins} دقیقه‌ای و تنظیم خودکار صف...`);

    try {
      let affectedCount = 0;

      if (shiftAppointments) {
        // Find eligible appointments for this doctor on this day
        const targetAppts = allAppointments.filter(apt => {
          const matchesDoc = apt.doctor_id === selectedDoctorId;
          const matchesDate = apt.for_date.startsWith(dateStr);
          const isFinished = apt.status === '0' || apt.status === 'finished';
          const isInVisit = apt.status === '3' || apt.status === 'in_visit';
          const isCancelled = apt.status === 'cancelled' || apt.status === 'absent' || apt.status === '2';
          return matchesDoc && matchesDate && !isFinished && !isInVisit && !isCancelled;
        });

        for (const apt of targetAppts) {
          const currentDate = new Date(apt.for_date);
          const newDate = new Date(currentDate.getTime() + dMins * 60000);
          const updates: Partial<Appointment> = {
            for_date: newDate.toISOString(),
            ...(protectPatients ? { is_protected: true } : {})
          };
          await updateAppointment(apt.uuid, updates);
          affectedCount++;
        }
      }

      // Save persistent active delay record for today
      const newRecord: DoctorDelayRecord = {
        doctorId: selectedDoctorId,
        dateStr,
        delayMinutes: dMins,
        reason: dReason,
        appliedAt: new Date().toISOString(),
        sendSms
      };

      setDoctorDelays(prev => {
        const next = { ...prev, [activeDoctorDelayKey]: newRecord };
        localStorage.setItem('doctor_active_delays', JSON.stringify(next));
        return next;
      });

      // Log action in audit logs
      await logAction({
        action: 'ثبت تاخیر پزشک',
        user: user?.fullName || 'منشی',
        details: `تاخیر ${dMins} دقیقه برای ${docName} به علت «${dReason}» - جابجایی ${affectedCount} نوبت ${sendSms ? '+ ارسال پیامک اطلاع‌رسانی' : ''}`
      });

      toast.success(
        `تاخیر ${dMins} دقیقه‌ای برای ${docName} اعمال شد و ${affectedCount} نوبت به‌طور خودکار هماهنگ گردید.`,
        { id: toastId, duration: 4500 }
      );

      await fetchDayBoard();
    } catch (err) {
      toast.error('خطا در ثبت تاخیر پزشک.', { id: toastId });
    }
  };

  const handleClearDoctorDelay = async () => {
    const docName = currentDoctor?.name || 'پزشک';
    setDoctorDelays(prev => {
      const next = { ...prev };
      delete next[activeDoctorDelayKey];
      localStorage.setItem('doctor_active_delays', JSON.stringify(next));
      return next;
    });

    await logAction({
      action: 'لغو تاخیر پزشک',
      user: user?.fullName || 'منشی',
      details: `پایان تاخیر و حضور ${docName} در مطب`
    });

    toast.success(`وضعیت تاخیر ${docName} لغو شد (ورود پزشک به مطب).`);
    fetchDayBoard();
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Title & Live Status */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">نوبت‌های امروز</h2>
          <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border transition-all",
            wsStatus === 'connected' 
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : wsStatus === 'connecting'
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse"
              : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700"
          )}>
            <span className={clsx("w-1.5 h-1.5 rounded-full", wsStatus === 'connected' ? "bg-emerald-500 animate-pulse" : wsStatus === 'connecting' ? "bg-amber-500" : "bg-gray-400")} />
            {wsStatus === 'connected' ? 'صف زنده' : wsStatus === 'connecting' ? 'اتصال...' : 'آفلاین'}
          </span>
        </div>

        {/* Unified Action Controls */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
          {/* Date Navigator */}
          <div className="flex items-center bg-gray-50 dark:bg-gray-900/80 p-1 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
            <button onClick={() => setSelectedDay(new DateObject(selectedDay).subtract(1, 'day'))} className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="روز قبل">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setSelectedDay(new DateObject({ calendar: persian, locale: persian_fa }))} className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg shadow-xs text-xs font-bold">
              امروز
            </button>
            <span className="px-3 text-xs font-black text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {selectedDay.format('dddd D MMMM')}
            </span>
            <button onClick={() => setSelectedDay(new DateObject(selectedDay).add(1, 'day'))} className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="روز بعد">
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Doctor Switcher */}
          {allowedDoctors.length > 1 && (
            <select 
              value={selectedDoctorId} 
              onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
              className="bg-gray-50 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-700/60 text-xs font-bold px-3 py-2 rounded-xl text-gray-800 dark:text-white outline-none"
            >
              {allowedDoctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          {/* Doctor Delay Trigger */}
          {activeDoctorDelay ? (
            <button
              onClick={() => setIsDoctorDelayModalOpen(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-1.5 text-xs font-black shadow-xs transition-all active:scale-95"
              title="ویرایش تاخیر فعال پزشک"
            >
              <Clock size={14} className="animate-pulse" />
              <span>تاخیر ({activeDoctorDelay.delayMinutes}د)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsDoctorDelayModalOpen(true)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900/80 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-700 dark:text-gray-300 hover:text-amber-700 border border-gray-200/80 dark:border-gray-700/60 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all"
              title="اعلام تاخیر در ورود پزشک"
            >
              <CalendarClock size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">اعلام تاخیر</span>
            </button>
          )}

          {/* Manual Refresh */}
          <button 
            onClick={fetchDayBoard} 
            disabled={isRefreshing}
            className="p-2 bg-gray-50 dark:bg-gray-900/80 text-gray-500 hover:text-primary-600 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-all active:scale-95 disabled:opacity-50"
            title="بروزرسانی دستی صف"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-primary-600" : ""} />
          </button>

          {/* New Appointment Button */}
          <button 
            onClick={() => navigate('/appointment/new')} 
            className="bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-xs transition-all text-xs active:scale-95 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>نوبت جدید</span>
          </button>
        </div>
      </div>

      {/* ACTIVE DOCTOR DELAY BANNER (Minimal & Dismissable) */}
      {activeDoctorDelay && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-bold">
            <CalendarClock size={18} className="text-amber-600 shrink-0" />
            <span>
              تاخیر فعال ورود {currentDoctor?.name} ({activeDoctorDelay.delayMinutes} دقیقه)
              {activeDoctorDelay.reason && <span className="opacity-75 mr-1">- علت: {activeDoctorDelay.reason}</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDoctorDelayModalOpen(true)}
              className="text-amber-800 dark:text-amber-300 hover:underline font-black"
            >
              ویرایش
            </button>
            <span className="text-amber-300 dark:text-amber-700">|</span>
            <button
              onClick={handleClearDoctorDelay}
              className="text-gray-600 dark:text-gray-400 hover:text-red-600 font-bold"
            >
              لغو (پزشک حاضر شد)
            </button>
          </div>
        </div>
      )}

      {/* 2. UNIFIED INTERACTIVE STATUS BAR + SEARCH + FINANCIAL PILL */}
      <div className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Segmented Queue Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          {[
            { key: 'all', label: 'همه نوبت‌ها', count: statsSummary.total, badgeClass: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
            { key: 'present', label: 'حاضر در مطب', count: statsSummary.present, badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' },
            { key: 'in_visit', label: 'در حال ویزیت', count: statsSummary.inVisit, badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' },
            { key: 'finished', label: 'ویزیت‌شده', count: statsSummary.finished, badgeClass: 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300' },
            { key: 'absent', label: 'غایب / لغو', count: statsSummary.absent, badgeClass: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as any)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap",
                statusFilter === tab.key
                  ? "bg-primary-600 text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"
              )}
            >
              <span>{tab.label}</span>
              <span className={clsx(
                "px-1.5 py-0.2 rounded-md text-[11px] font-mono",
                statusFilter === tab.key ? "bg-white/20 text-white" : tab.badgeClass
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right Info: Average Wait Time + Search Box */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between xl:justify-end">
          {statsSummary.avgWaitMins > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200/80 dark:border-gray-600/60 text-xs font-bold whitespace-nowrap" title="میانگین زمان انتظار بیماران حاضر در مطب">
              <Activity size={13} className="text-gray-500" />
              <span>میانگین انتظار: {statsSummary.avgWaitMins} دقیقه</span>
            </span>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="جستجوی بیمار در صف..." 
              className="w-full pl-7 pr-9 py-1.5 bg-gray-50 dark:bg-gray-900/80 text-gray-800 dark:text-white placeholder-gray-400 border border-gray-200/80 dark:border-gray-700/60 rounded-xl outline-none text-xs font-bold focus:border-primary-500 transition-colors" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. STREAMLINED 6-COLUMN OPERATIONAL QUEUE TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[580px] scrollbar-thin">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 font-black uppercase tracking-wider shadow-xs">
              <tr>
                <th className="px-3 py-3.5 w-14 text-center bg-inherit">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={toggleSelectAll} className="text-primary-600 flex items-center justify-center">
                      {selectedIds.length === currentAppointmentsList.length && currentAppointmentsList.length > 0 ? <CheckSquare size={16}/> : selectedIds.length > 0 ? <MinusSquare size={16}/> : <Square size={16} className="text-gray-300 dark:text-gray-600" />}
                    </button>
                    <span className="text-[10px] text-gray-400 font-bold">#</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 bg-inherit">بیمار و تماس</th>
                <th className="px-4 py-3.5 bg-inherit">ساعت و انتظار</th>
                <th className="px-4 py-3.5 bg-inherit">وضعیت و خدمات</th>
                <th className="px-4 py-3.5 text-center bg-inherit">وضعیت تسویه</th>
                <th className="px-4 py-3.5 text-center bg-inherit">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {currentAppointmentsList.length > 0 ? currentAppointmentsList.map((apt, index) => {
                const waitMins = getWaitDurationMinutes(apt);
                const latenessMins = getLatenessMinutes(apt);
                const isCurrentVisit = apt.status === '3' || apt.status === 'in_visit';
                const isPresent = apt.status === '4' || apt.status === 'present';
                const isFinished = apt.status === '0' || apt.status === 'finished';
                const isLoadingThisAction = loadingActionId === apt.uuid;
                const fin = getAppointmentFinancials(apt);
                const patient = patients.find(p => p.uuid === apt.patient_id);

                return (
                  <tr 
                    key={apt.uuid} 
                    className={clsx(
                      "transition-colors group",
                      isCurrentVisit && "bg-blue-50/60 dark:bg-blue-950/30 border-r-4 border-r-blue-600",
                      isPresent && "bg-emerald-50/30 dark:bg-emerald-950/20 border-r-4 border-r-emerald-500",
                      selectedIds.includes(apt.uuid) && "bg-primary-50/40 dark:bg-primary-900/20",
                      "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                    )}
                  >
                    {/* Checkbox & Priority Sequence */}
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => toggleSelect(apt.uuid)} className={clsx("transition-colors", selectedIds.includes(apt.uuid) ? "text-primary-600" : "text-gray-300 hover:text-primary-400")}>
                          {selectedIds.includes(apt.uuid) ? <CheckSquare size={16}/> : <Square size={16}/>}
                        </button>
                        <span className={clsx(
                          "w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-black",
                          isCurrentVisit ? "bg-blue-600 text-white shadow-xs" : isPresent ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        )}>
                          {(index + 1).toString()}
                        </span>
                      </div>
                    </td>

                    {/* Patient Name & Contact */}
                    <td className="px-4 py-3.5 font-black text-gray-900 dark:text-white">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black">{getPatientName(apt.patient_id)}</span>
                          {apt.is_walkin && (
                            <span className="text-[9px] bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.2 rounded font-bold border border-blue-200/60 dark:border-blue-800/60">حضوری</span>
                          )}
                        </div>
                        {(patient?.phone || patient?.national_id) && (
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5 dir-ltr text-right">
                            {patient?.phone || patient?.national_id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Scheduled Time & Lateness / Waiting duration */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-black text-gray-800 dark:text-gray-200 dir-ltr justify-end">
                          <span>{formatJalaliTime(apt.for_date)}</span>
                          {latenessMins > 0 && (
                            <span className={clsx(
                              "text-[10px] font-bold inline-flex items-center gap-0.5",
                              latenessMins > EXTREME_LATENESS_THRESHOLD_MINUTES ? "text-red-600 font-black" : "text-red-500"
                            )}>
                              {latenessMins > EXTREME_LATENESS_THRESHOLD_MINUTES && <AlertTriangle size={11} className="text-red-600" />}
                              <span>(+{latenessMins}د)</span>
                            </span>
                          )}
                        </div>
                        {waitMins !== null && (isPresent || isCurrentVisit) && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            {waitMins} دقیقه انتظار
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge & Services Cluster */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-black border", statusLabels[apt.status]?.color || 'bg-gray-100 text-gray-800 border-gray-200')}>
                            {statusLabels[apt.status]?.label || 'مشخص نشده'}
                          </span>
                          
                          {/* Indicator Icons */}
                          {(apt.is_protected || apt.is_urgent || apt.is_double_booked) && (
                            <div className="flex items-center gap-0.5 text-xs">
                              {apt.is_protected && <span title="محافظت‌شده" className="text-amber-600"><ShieldCheck size={13} /></span>}
                              {apt.is_urgent && <span title="اورژانسی" className="text-red-600 animate-pulse"><Siren size={13} /></span>}
                              {apt.is_double_booked && <span title="نوبت دوگانه" className="text-purple-600"><Layers size={13} /></span>}
                            </div>
                          )}
                        </div>

                        {/* Streamlined Services Tag with counter */}
                        {apt.services.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                            <span className="truncate max-w-[140px]">
                              {getReasonTitle(apt.services[0].reason_id)}
                              {apt.services[0].quantity > 1 && ` (×${apt.services[0].quantity})`}
                            </span>
                            {apt.services.length > 1 && (
                              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.2 rounded font-black border border-gray-200/60 dark:border-gray-700">
                                +{apt.services.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Financial Settlement Status */}
                    <td className="px-4 py-3.5 text-center">
                      {(() => {
                        if (apt.status === 'cancelled') {
                          return <span className="text-[10px] text-gray-400 font-bold">لغوشده</span>;
                        }
                        if (fin.isPaidInFull) {
                          return (
                            <button
                              type="button"
                              onClick={() => openCheckoutModal(apt)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:scale-105 transition-transform"
                              title="مشاهده فاکتور و جزئیات تسویه"
                            >
                              <CheckCheck size={11} className="text-emerald-600" />
                              <span>تسویه ({formatCurrency(fin.totalPaid)})</span>
                            </button>
                          );
                        }
                        if (fin.isPartiallyPaid) {
                          return (
                            <button
                              type="button"
                              onClick={() => openCheckoutModal(apt)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:scale-105 transition-transform"
                              title="تکمیل تسویه نوبت"
                            >
                              <Clock size={11} className="text-amber-600" />
                              <span>مانده: {formatCurrency(fin.balanceRemaining)}</span>
                            </button>
                          );
                        }
                        // Unpaid
                        return (
                          <button
                            type="button"
                            onClick={() => openCheckoutModal(apt)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/80 dark:border-gray-700/60 transition-colors"
                            title="ثبت تسویه و صدور فاکتور"
                          >
                            <Receipt size={11} className="text-gray-400" />
                            <span>{fin.netPayable > 0 ? formatCurrency(fin.netPayable) : 'تسویه'}</span>
                          </button>
                        );
                      })()}
                    </td>

                    {/* Inline Primary Action Button + Overflow Menu */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Contextual Action Button */}
                        {(apt.status === '1' || apt.status === 'pending') && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => handleCheckIn(apt.uuid)} 
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                            title="ثبت حضور در مطب"
                          >
                            <UserCheck size={12} />
                            حضور
                          </button>
                        )}

                        {(apt.status === '4' || apt.status === 'present') && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => handleStartVisit(apt.uuid)} 
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                          >
                            <PlayCircle size={12} />
                            شروع ویزیت
                          </button>
                        )}

                        {(apt.status === '3' || apt.status === 'in_visit') && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => handleFinishVisit(apt.uuid)} 
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle size={12} />
                            پایان ویزیت
                          </button>
                        )}

                        {isFinished && !fin.isPaidInFull && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => openCheckoutModal(apt)} 
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                            title="تسویه حساب سریع"
                          >
                            <Receipt size={12} />
                            تسویه
                          </button>
                        )}

                        {/* Overflow Menu "⋮" */}
                        <div className="relative inline-block text-right">
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openMenuUuid === apt.uuid) {
                                setOpenMenuUuid(null);
                                setMenuAnchor(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const dropdownHeight = 160;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
                                const top = showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4;
                                const left = Math.max(10, Math.min(window.innerWidth - 154, rect.right - 144));
                                setOpenMenuUuid(apt.uuid);
                                setMenuAnchor({ top, left });
                              }
                            }} 
                            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all border border-gray-200 dark:border-gray-700 active:scale-95 disabled:opacity-50"
                            title="سایر عملیات"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 font-bold">
                    {search || statusFilter !== 'all' ? (
                      <div className="flex flex-col items-center gap-2">
                        <span>نوبتی با این فیلتر یا جستجو یافت نشد.</span>
                        <button
                          onClick={() => { setSearch(''); setStatusFilter('all'); }}
                          className="text-primary-600 hover:underline text-xs font-black"
                        >
                          پاک کردن فیلترها
                        </button>
                      </div>
                    ) : (
                      'نوبتی برای این تاریخ ثبت نشده است.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- FLOATING OVERFLOW OPTIONS MENU --- */}
      {openMenuUuid && menuAnchor && (() => {
        const apt = currentAppointmentsList.find(a => a.uuid === openMenuUuid);
        if (!apt) return null;
        return (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                setOpenMenuUuid(null);
                setMenuAnchor(null);
              }} 
            />
            <div 
              style={{ top: `${menuAnchor.top}px`, left: `${menuAnchor.left}px` }}
              className="fixed w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 text-right text-xs font-bold divide-y divide-gray-100 dark:divide-gray-700/60 animate-in fade-in zoom-in-95"
            >
              {/* Settle & Checkout Action */}
              <button
                onClick={() => {
                  setOpenMenuUuid(null);
                  setMenuAnchor(null);
                  openCheckoutModal(apt);
                }}
                className="w-full px-3 py-2 text-right text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2 transition-colors"
              >
                <Receipt size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>تسویه و صدور فاکتور</span>
              </button>

              {/* Present status overflow options */}
              {(apt.status === '4' || apt.status === 'present') && (
                <button
                  onClick={() => {
                    setOpenMenuUuid(null);
                    setMenuAnchor(null);
                    handleMarkAbsent(apt.uuid);
                  }}
                  className="w-full px-3 py-2 text-right text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                >
                  <UserX size={14} />
                  <span>ثبت غیبت</span>
                </button>
              )}

              {/* In-Visit status overflow options */}
              {(apt.status === '3' || apt.status === 'in_visit') && (
                <button
                  onClick={() => {
                    setOpenMenuUuid(null);
                    setMenuAnchor(null);
                    openInterruptModal(apt);
                  }}
                  className="w-full px-3 py-2 text-right text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 transition-colors"
                >
                  <PauseCircle size={14} />
                  <span>قطع جلسه</span>
                </button>
              )}

              {/* Cancel option for uncancelled appointments */}
              {apt.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    setOpenMenuUuid(null);
                    setMenuAnchor(null);
                    openCancelModal(apt);
                  }}
                  className="w-full px-3 py-2 text-right text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-red-600 flex items-center gap-2 transition-colors"
                >
                  <XCircle size={14} />
                  <span>لغو نوبت</span>
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* --- BULK ACTION FOOTER --- */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-800 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom-10 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                  <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary-500/20">{selectedIds.length}</div>
                  <div>
                    <span className="text-sm font-black block">نوبت انتخاب شده</span>
                    <span className="text-[10px] opacity-50 font-bold">آماده عملیات گروهی</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setIsDelayModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/20"><Clock size={16} /> تعویق زمانی</button>
                  <button onClick={handleBulkExport} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/20"><Download size={16} /> خروجی اکسل</button>
                  <button onClick={() => setSelectedIds([])} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>
          </div>
      )}

      {/* --- INTERRUPT TREATMENT MODAL --- */}
      {isInterruptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
            <div className="bg-purple-600 p-6 text-white text-center relative">
              <button onClick={() => setIsInterruptModalOpen(false)} className="absolute top-5 left-5 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={18} />
              </button>
              <PauseCircle size={44} className="mx-auto mb-2 opacity-90" />
              <h3 className="text-xl font-black">قطع جلسه درمان</h3>
              <p className="text-xs opacity-80 mt-1 font-bold">
                توقف جلسه ویزیت برای بیمار: {getPatientName(interruptTarget?.patient_id || '')}
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                  علت قطع جلسه درمان <span className="text-red-500">*</span>
                </label>
                <textarea 
                  required
                  rows={3}
                  value={interruptReason}
                  onChange={(e) => setInterruptReason(e.target.value)}
                  placeholder="مثال: بروز اضطراب شدید بیمار، نقص مدارک یا تجهیزات..."
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none text-xs font-bold text-gray-800 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleConfirmInterrupt}
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  تایید قطع جلسه
                </button>
                <button 
                  onClick={() => setIsInterruptModalOpen(false)}
                  className="px-5 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CANCEL CONFIRM MODAL --- */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
            <div className="bg-red-600 p-6 text-white text-center relative">
              <button onClick={() => setIsCancelModalOpen(false)} className="absolute top-5 left-5 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={18} />
              </button>
              <XCircle size={44} className="mx-auto mb-2 opacity-90" />
              <h3 className="text-xl font-black">لغو نوبت بیمار</h3>
              <p className="text-xs opacity-80 mt-1 font-bold">
                بیمار: {getPatientName(cancelTarget?.patient_id || '')}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Cancellation Initiator Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                  منشأ درخواست لغو
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setCancelType('patient')}
                    className={clsx(
                      "py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                      cancelType === 'patient'
                        ? "bg-white dark:bg-gray-700 text-red-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <span>توسط بیمار</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelType('clinic')}
                    className={clsx(
                      "py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                      cancelType === 'clinic'
                        ? "bg-white dark:bg-gray-700 text-red-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <span>توسط مرکز درمان / مطب</span>
                  </button>
                </div>
              </div>

              {/* Reason Input Field (Required for Clinic-Initiated) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                  علت لغو نوبت {cancelType === 'clinic' && <span className="text-red-500">*</span>}
                </label>
                <textarea 
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={cancelType === 'clinic' ? "مثال: عدم حضور پزشک، قطعی برق، خرابی یونیت..." : "توضیحات اختیاری بیمار..."}
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none text-xs font-bold text-gray-800 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleConfirmCancel}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  تایید و لغو نوبت
                </button>
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-5 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- APPOINTMENT CHECKOUT & PAYMENT MODAL --- */}
      <AppointmentPaymentModal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setCheckoutAppointment(null);
        }}
        appointment={checkoutAppointment}
        doctor={doctors.find(d => d.id === checkoutAppointment?.doctor_id)}
        patient={patients.find(p => p.uuid === checkoutAppointment?.patient_id)}
        insurance={insurances.find(i => i.id === patients.find(p => p.uuid === checkoutAppointment?.patient_id)?.insurance_id)}
        allReasons={allReasons}
        existingPayments={payments.filter(p => p.appointment_uuid === checkoutAppointment?.uuid)}
        onAddPayment={addPayment}
        onAddInstallment={addInstallment}
        onUpdateAppointmentStatus={(id, status) => updateAppointment(id, { status })}
        getReasonTitle={getReasonTitle}
      />

      {/* --- DOCTOR ARRIVAL DELAY MODAL --- */}
      <DoctorDelayModal
        isOpen={isDoctorDelayModalOpen}
        onClose={() => setIsDoctorDelayModalOpen(false)}
        doctor={currentDoctor}
        appointments={currentAppointmentsList}
        patients={patients}
        getPatientName={getPatientName}
        getReasonTitle={getReasonTitle}
        onApplyDelay={handleApplyDoctorDelay}
        currentDelayMinutes={activeDoctorDelay?.delayMinutes || 0}
        currentDelayReason={activeDoctorDelay?.reason || ''}
        onClearDelay={activeDoctorDelay ? handleClearDoctorDelay : undefined}
      />

      {/* --- BULK SELECTION DELAY MODAL --- */}
      {isDelayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="bg-amber-500 p-6 text-white text-center relative">
                      <Clock size={40} className="mx-auto mb-2 opacity-80" />
                      <h3 className="text-xl font-black">تعویق زمانی هوشمند</h3>
                      <p className="text-xs opacity-80 mt-1">زمان شروع {selectedIds.length} نوبت را به تاخیر بیندازید.</p>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-4">
                          <p className="text-xs font-bold text-gray-500 text-center">میزان تاخیر را انتخاب کنید:</p>
                          <div className="grid grid-cols-3 gap-3">
                              {[15, 30, 45, 60, 90, 120].map(m => (
                                  <button 
                                    key={m} 
                                    onClick={() => setDelayMinutes(m)}
                                    className={clsx(
                                        "py-3 rounded-2xl border-2 font-black text-xs transition-all",
                                        delayMinutes === m 
                                            ? "bg-amber-50 border-amber-500 text-amber-600 shadow-inner" 
                                            : "bg-gray-50 dark:bg-gray-700 border-transparent text-gray-500"
                                    )}
                                  >
                                      {m} دقیقه
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button onClick={handleApplyDelay} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all text-xs flex items-center justify-center gap-2">اعمال جابجایی</button>
                          <button onClick={() => setIsDelayModalOpen(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-all">انصراف</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
