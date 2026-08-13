
import { Doctor, Appointment, Reason } from '../types';

// In a real app, use 'date-fns-jalali' or 'moment-jalaali'
export const formatJalaliDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  // Simulating Jalali conversion for demo purposes
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
};

export const formatJalaliTime = (dateStr: string | Date): string => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return typeof dateStr === 'string' ? dateStr : '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const format24hTime = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
};

export const statusLabels: Record<string, { label: string; color: string }> = {
  '0': { label: 'پایان یافته', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800' },
  'finished': { label: 'پایان یافته', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800' },
  '1': { label: 'در انتظار مراجع', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  'pending': { label: 'در انتظار مراجع', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  '2': { label: 'غایب', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800' },
  'absent': { label: 'غایب', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800' },
  '3': { label: 'در حال ویزیت', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse' },
  'in_visit': { label: 'در حال ویزیت', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse' },
  '4': { label: 'حاضر در مطب', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-sm' },
  'present': { label: 'حاضر در مطب', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-sm' },
  'cancelled': { label: 'لغو شده', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700' },
  'interrupted': { label: 'قطع جلسه', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
};

export const findNextAvailableGapToday = (
  doctor: Doctor | undefined,
  allAppointments: Appointment[],
  selectedServices: { reason_id: string; quantity: number }[],
  allReasons: Reason[],
  now: Date = new Date()
): string | null => {
  if (!doctor || !doctor.schedule || selectedServices.length === 0) return null;

  const totalDuration = selectedServices.reduce((sum, item) => {
    const reason = allReasons.find(r => r.uuid === item.reason_id);
    return sum + (reason?.duration || 15) * (item.quantity || 1);
  }, 0) || 15;

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const dayKey = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
  const schedule = doctor.schedule[dayKey];

  if (!schedule || !schedule.is_working || !schedule.start || !schedule.end) {
    return null;
  }

  const docStart = new Date(`${todayStr}T${schedule.start}:00`);
  const docEnd = new Date(`${todayStr}T${schedule.end}:00`);

  // Active appointments today for this doctor
  const activeAppts = allAppointments
    .filter(a => a.doctor_id === doctor.id && a.for_date.startsWith(todayStr) && a.status !== '2' && a.status !== 'cancelled')
    .map(a => {
      const s = new Date(a.for_date);
      const dur = (a.services || []).reduce((sum, serv) => {
        const r = allReasons.find(reason => reason.uuid === serv.reason_id);
        return sum + (r?.duration || 15) * (serv.quantity || 1);
      }, 0) || 15;
      return { start: s, end: new Date(s.getTime() + dur * 60000) };
    });

  const breaks = (schedule.breaks || []).map(b => ({
    start: new Date(`${todayStr}T${b.start}:00`),
    end: new Date(`${todayStr}T${b.end}:00`)
  }));

  // Candidate start time: max(now, docStart)
  let current = new Date(Math.max(now.getTime(), docStart.getTime()));

  // Round up to nearest 5 minutes
  const remainder = current.getMinutes() % 5;
  if (remainder !== 0) {
    current.setMinutes(current.getMinutes() + (5 - remainder));
    current.setSeconds(0);
    current.setMilliseconds(0);
  }

  while (current.getTime() + totalDuration * 60000 <= docEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + totalDuration * 60000);

    const overlapsAppt = activeAppts.some(apt => current < apt.end && slotEnd > apt.start);
    const overlapsBreak = breaks.some(brk => current < brk.end && slotEnd > brk.start);

    if (!overlapsAppt && !overlapsBreak) {
      return format24hTime(current);
    }

    current = new Date(current.getTime() + 5 * 60000);
  }

  // Fallback: If no slot available after 'now' (e.g. testing during off-hours), check from docStart
  let fallbackCurrent = new Date(docStart);
  const remainderFb = fallbackCurrent.getMinutes() % 5;
  if (remainderFb !== 0) {
    fallbackCurrent.setMinutes(fallbackCurrent.getMinutes() + (5 - remainderFb));
    fallbackCurrent.setSeconds(0);
    fallbackCurrent.setMilliseconds(0);
  }

  while (fallbackCurrent.getTime() + totalDuration * 60000 <= docEnd.getTime()) {
    const slotEnd = new Date(fallbackCurrent.getTime() + totalDuration * 60000);

    const overlapsAppt = activeAppts.some(apt => fallbackCurrent < apt.end && slotEnd > apt.start);
    const overlapsBreak = breaks.some(brk => fallbackCurrent < brk.end && slotEnd > brk.start);

    if (!overlapsAppt && !overlapsBreak) {
      return format24hTime(fallbackCurrent);
    }

    fallbackCurrent = new Date(fallbackCurrent.getTime() + 5 * 60000);
  }

  return null;
};
