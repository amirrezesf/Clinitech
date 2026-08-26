import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatJalaliDate, formatJalaliTime, statusLabels } from '../utils/helpers';
import { 
  Search, Plus, ChevronRight, ChevronLeft, PlayCircle, CheckCircle, 
  XCircle, Download, Clock, Square, CheckSquare, MinusSquare, 
  UserCheck, UserX, ShieldCheck, Siren, Layers, AlertCircle,
  PauseCircle, AlertTriangle, Users, Radio, Activity, RefreshCw, X, Check,
  MoreVertical, CalendarClock, RotateCcw, Sparkles
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
    getPatientName, 
    getReasonTitle, 
    updateAppointment, 
    logAction
  } = useData();

  const isDoctor = user?.role === 'doctor';
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState(new DateObject({ calendar: persian, locale: persian_fa }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
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

    // If we have received queue directly from server / WS, use it in exact order
    if (serverQueue && serverQueue.length > 0) {
      return serverQueue.filter(apt => {
        if (selectedDoctorId && apt.doctor_id !== selectedDoctorId) return false;
        const patientName = getPatientName(apt.patient_id);
        const matchesSearch = !search.trim() || patientName.includes(search) || apt.uuid.includes(search);
        const matchesDate = !apt.for_date || apt.for_date.startsWith(dateStr);
        return matchesSearch && matchesDate;
      });
    }

    // Otherwise, fallback to local DataContext with priority sorting rules
    const localList = allAppointments.filter(apt => {
      if (user?.allowedDoctorIds && !user.allowedDoctorIds.includes(apt.doctor_id)) return false;
      if (selectedDoctorId && apt.doctor_id !== selectedDoctorId) return false;
      const patientName = getPatientName(apt.patient_id);
      const matchesSearch = !search.trim() || patientName.includes(search);
      const matchesDate = apt.for_date.startsWith(dateStr);
      return matchesSearch && matchesDate;
    });

    // Client-side fallback sorting strictly by queue priority order
    return [...localList].sort((a, b) => {
      const pA = calculatePriorityScore(a);
      const pB = calculatePriorityScore(b);
      if (pA !== pB) return pA - pB;
      return new Date(a.for_date).getTime() - new Date(b.for_date).getTime();
    });
  }, [serverQueue, allAppointments, search, selectedDay, selectedDoctorId, user, getPatientName]);

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

    return { total, present, inVisit, finished, absent, avgWaitMins };
  }, [allAppointments, selectedDay, selectedDoctorId, nowTime]);

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
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">نوبت‌های امروز</h2>
            {/* Live Board Connection Badge */}
            <span className={clsx(
              "px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border transition-all",
              wsStatus === 'connected' 
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                : wsStatus === 'connecting'
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700"
            )}>
              <Radio size={12} className={wsStatus === 'connected' ? "animate-pulse text-emerald-600" : ""} />
              {wsStatus === 'connected' ? 'صف زنده متصل' : wsStatus === 'connecting' ? 'در حال اتصال...' : 'صف هماهنگ'}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-bold mt-1">تخته عملیاتی روزانه - مرتب‌شده بر اساس اولویت صف درمان</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            {allowedDoctors.length > 1 && (
              <select 
                value={selectedDoctorId} 
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold p-2.5 rounded-xl text-gray-800 dark:text-white outline-none shadow-sm"
              >
                {allowedDoctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}

            {/* Doctor Delay Trigger Button */}
            {activeDoctorDelay ? (
              <button
                onClick={() => setIsDoctorDelayModalOpen(true)}
                className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl flex items-center gap-2 shadow-md shadow-amber-500/20 font-black transition-all text-xs active:scale-95 border border-amber-400/40"
                title="تاخیر فعال پزشک - کلیک جهت مشاهده، ویرایش یا لغو"
              >
                <Clock size={16} className="animate-pulse" />
                <span>تاخیر فعال ({activeDoctorDelay.delayMinutes} دقیقه)</span>
              </button>
            ) : (
              <button
                onClick={() => setIsDoctorDelayModalOpen(true)}
                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-center gap-2 font-black transition-all text-xs active:scale-95 shadow-sm"
                title="ثبت تاخیر در ورود پزشک و تنظیم خودکار کلیه نوبت‌ها"
              >
                <CalendarClock size={16} className="text-amber-600 dark:text-amber-400" />
                <span>اعلام تاخیر پزشک</span>
              </button>
            )}

            <button 
              onClick={fetchDayBoard} 
              disabled={isRefreshing}
              className="p-2.5 bg-white dark:bg-gray-800 text-gray-500 hover:text-primary-600 rounded-xl border border-gray-200 dark:border-gray-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="بروزرسانی دستی صف"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>

            <button 
              onClick={() => navigate('/appointment/new')} 
              className="bg-primary-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold hover:bg-primary-700 transition-all text-xs"
            >
              <Plus size={18} />
              نوبت جدید
            </button>
        </div>
      </div>

      {/* ACTIVE DOCTOR DELAY ALERT BANNER */}
      {activeDoctorDelay && (
        <div className="bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-800/80 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
              <CalendarClock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-950 dark:text-amber-100">
                  وضعیت تاخیر ورود پزشک فعال است: {currentDoctor?.name} با {activeDoctorDelay.delayMinutes} دقیقه تاخیر
                </span>
                {activeDoctorDelay.reason && (
                  <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-lg font-bold">
                    علت: {activeDoctorDelay.reason}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                تمام نوبت‌های باقی‌مانده امروز به صورت خودکار به میزان {activeDoctorDelay.delayMinutes} دقیقه جابجا شده و اولویت حضور بیماران در صف درمان محافظت شده است.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
            <button
              onClick={() => setIsDoctorDelayModalOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
            >
              ویرایش تاخیر
            </button>
            <button
              onClick={handleClearDoctorDelay}
              className="px-3.5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-700 active:scale-95"
            >
              لغو تاخیر (پزشک حاضر شد)
            </button>
          </div>
        </div>
      )}

      {/* STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Appointments Today */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">کل نوبت‌ها</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{statsSummary.total}</span>
            <Users size={20} className="text-gray-400" />
          </div>
        </div>

        {/* Present Count */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">حاضر در مطب</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{statsSummary.present}</span>
            <UserCheck size={20} className="text-emerald-500" />
          </div>
        </div>

        {/* In Visit Count */}
        <div className="bg-blue-50/80 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">در حال ویزیت</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{statsSummary.inVisit}</span>
            <Activity size={20} className="text-blue-500 animate-pulse" />
          </div>
        </div>

        {/* Finished Count */}
        <div className="bg-green-50/80 dark:bg-green-950/30 p-4 rounded-2xl border border-green-100 dark:border-green-900/40 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-green-700 dark:text-green-300 uppercase tracking-wider">ویزیت‌شده</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-green-700 dark:text-green-300">{statsSummary.finished}</span>
            <CheckCircle size={20} className="text-green-500" />
          </div>
        </div>

        {/* Absent Count */}
        <div className="bg-red-50/80 dark:bg-red-950/30 p-4 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-red-700 dark:text-red-300 uppercase tracking-wider">غایب / لغو</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-red-700 dark:text-red-300">{statsSummary.absent}</span>
            <UserX size={20} className="text-red-400" />
          </div>
        </div>

        {/* Average Wait Time */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">میانگین انتظار</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-amber-700 dark:text-amber-300">
              {statsSummary.avgWaitMins > 0 ? `${statsSummary.avgWaitMins} دقیقه` : '۰ دقیقه'}
            </span>
            <Clock size={20} className="text-amber-500" />
          </div>
        </div>
      </div>

      {/* Date Navigator & Search Box */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center bg-white/80 dark:bg-gray-800/80">
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => setSelectedDay(new DateObject(selectedDay).subtract(1, 'day'))} className="p-2 text-gray-500 hover:text-primary-600 transition-colors"><ChevronRight size={20} /></button>
                <button onClick={() => setSelectedDay(new DateObject({ calendar: persian, locale: persian_fa }))} className="px-3 py-1 bg-white dark:bg-gray-700 dark:text-white rounded shadow text-xs font-bold">امروز</button>
                <span className="px-4 text-xs font-black dark:text-gray-200">{selectedDay.format('dddd D MMMM')}</span>
                <button onClick={() => setSelectedDay(new DateObject(selectedDay).add(1, 'day'))} className="p-2 text-gray-500 hover:text-primary-600 transition-colors"><ChevronLeft size={20} /></button>
            </div>
            <div className="relative flex-1 w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="جستجوی بیماران در صف..." className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-xs font-bold focus:border-primary-500 transition-colors" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
      </div>

      {/* OPERATIONAL DAY BOARD TABLE */}
      <div className="glass-card rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[540px] scrollbar-thin">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 font-black uppercase tracking-wider shadow-xs">
              <tr>
                <th className="px-3 py-4 w-10 text-center bg-inherit">
                  <button onClick={toggleSelectAll} className="text-primary-600 flex items-center justify-center mx-auto">
                      {selectedIds.length === currentAppointmentsList.length && currentAppointmentsList.length > 0 ? <CheckSquare size={18}/> : selectedIds.length > 0 ? <MinusSquare size={18}/> : <Square size={18} className="text-gray-300 dark:text-gray-600" />}
                  </button>
                </th>
                <th className="px-4 py-4 w-12 text-center bg-inherit">اولویت</th>
                <th className="px-5 py-4 bg-inherit">بیمار</th>
                <th className="px-5 py-4 text-center bg-inherit">ساعت نوبت</th>
                <th className="px-5 py-4 bg-inherit">شاخص‌های عملیاتی و وضعیت</th>
                <th className="px-5 py-4 bg-inherit">خدمات (تعداد)</th>
                <th className="px-5 py-4 text-center bg-inherit">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {currentAppointmentsList.length > 0 ? currentAppointmentsList.map((apt, index) => {
                const waitMins = getWaitDurationMinutes(apt);
                const latenessMins = getLatenessMinutes(apt);
                const isCurrentVisit = apt.status === '3' || apt.status === 'in_visit';
                const isPresent = apt.status === '4' || apt.status === 'present';
                const isLoadingThisAction = loadingActionId === apt.uuid;

                return (
                  <tr 
                    key={apt.uuid} 
                    className={clsx(
                      "transition-all group border-b border-gray-50 dark:border-gray-800/40",
                      isCurrentVisit && "bg-blue-50/70 dark:bg-blue-950/30 border-r-4 border-r-blue-600",
                      isPresent && "bg-emerald-50/40 dark:bg-emerald-950/20 border-r-4 border-r-emerald-500",
                      selectedIds.includes(apt.uuid) && "bg-primary-50/40 dark:bg-primary-900/20"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-4 text-center">
                        <button onClick={() => toggleSelect(apt.uuid)} className={clsx("transition-colors", selectedIds.includes(apt.uuid) ? "text-primary-600" : "text-gray-300 hover:text-primary-400")}>
                            {selectedIds.includes(apt.uuid) ? <CheckSquare size={18}/> : <Square size={18}/>}
                        </button>
                    </td>

                    {/* Priority Queue Rank */}
                    <td className="px-4 py-4 text-center font-black text-gray-400">
                      <span className={clsx(
                        "w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-black",
                        isCurrentVisit ? "bg-blue-600 text-white shadow-sm" : isPresent ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      )}>
                        {(index + 1).toString().padStart(2, '۰')}
                      </span>
                    </td>

                    {/* Patient Name */}
                    <td className="px-5 py-4 font-black text-gray-900 dark:text-white text-sm">
                      <div className="flex flex-col">
                        <span>{getPatientName(apt.patient_id)}</span>
                        {apt.is_walkin && <span className="text-[10px] text-blue-500 font-bold">پذیرش حضوری بدون وقت</span>}
                      </div>
                    </td>

                    {/* Scheduled Time */}
                    <td className="px-5 py-4 text-center font-black text-gray-700 dark:text-gray-300 dir-ltr whitespace-nowrap">
                      <span>{formatJalaliTime(apt.for_date)}</span>
                      {latenessMins > 0 && (
                        <span className={clsx(
                          "font-bold mr-1.5 text-[11px] inline-flex items-center gap-0.5 dir-ltr",
                          latenessMins > EXTREME_LATENESS_THRESHOLD_MINUTES 
                            ? "text-red-600 font-black" 
                            : "text-red-500"
                        )}>
                          {latenessMins > EXTREME_LATENESS_THRESHOLD_MINUTES && (
                            <AlertTriangle size={12} className="text-red-600 shrink-0" />
                          )}
                          <span>(+{latenessMins}m)</span>
                        </span>
                      )}
                    </td>

                    {/* Visual Indicators & Badges */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Status Label Chip & Subdued Waiting Time */}
                        <div className="flex flex-col items-start">
                          <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-black border", statusLabels[apt.status]?.color || 'bg-gray-100 text-gray-800 border-gray-200')}>
                            {statusLabels[apt.status]?.label || 'مشخص نشده'}
                          </span>
                          {waitMins !== null && (isPresent || isCurrentVisit) && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5 pr-1">
                              {waitMins} دقیقه
                            </span>
                          )}
                        </div>

                        {/* Compact Icon-Only Cluster for Flags */}
                        {(apt.is_protected || apt.is_urgent || apt.is_double_booked) && (
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                            {apt.is_protected && (
                              <span title="محافظت‌شده" className="text-amber-600 dark:text-amber-400 p-0.5 hover:scale-110 transition-transform">
                                <ShieldCheck size={14} />
                              </span>
                            )}
                            {apt.is_urgent && (
                              <span title="اورژانسی" className="text-red-600 dark:text-red-400 p-0.5 animate-pulse hover:scale-110 transition-transform">
                                <Siren size={14} />
                              </span>
                            )}
                            {apt.is_double_booked && (
                              <span title="نوبت دوگانه" className="text-purple-600 dark:text-purple-400 p-0.5 hover:scale-110 transition-transform">
                                <Layers size={14} />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Services */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {apt.services.map(s => (
                          <span key={s.reason_id} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                            {getReasonTitle(s.reason_id)} {s.quantity > 1 && `(×${s.quantity})`}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Inline Primary Action Button + Overflow Menu */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Primary Button based on Status */}
                        {(apt.status === '1' || apt.status === 'pending') && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => handleCheckIn(apt.uuid)} 
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            title="ثبت حضور در مطب"
                          >
                            <UserCheck size={14} />
                            ثبت حضور
                          </button>
                        )}

                        {(apt.status === '4' || apt.status === 'present') && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => handleStartVisit(apt.uuid)} 
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            <PlayCircle size={14} />
                            شروع ویزیت
                          </button>
                        )}

                        {(apt.status === '3' || apt.status === 'in_visit') && (
                          <button 
                            disabled={isLoadingThisAction}
                            onClick={() => handleFinishVisit(apt.uuid)} 
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            پایان ویزیت
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
                                const dropdownHeight = 140;
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
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400 dark:text-gray-600 font-bold italic">
                    نوبتی برای این تاریخ ثبت نشده است.
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
              className="fixed w-36 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 text-right text-xs font-bold divide-y divide-gray-100 dark:divide-gray-700/60 animate-in fade-in zoom-in-95"
            >
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
