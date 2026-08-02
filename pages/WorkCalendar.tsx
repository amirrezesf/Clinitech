
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronDown, 
  Stethoscope,
  Download
} from 'lucide-react';
import { formatCurrency, statusLabels, formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const START_HOUR = 8;
const END_HOUR = 21;
const PIXELS_PER_HOUR = 80;

export const WorkCalendar = () => {
  const navigate = useNavigate();
  const { appointments, reasons, getPatientName, getReasonTitle, doctors } = useData();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new DateObject({ calendar: persian, locale: persian_fa }));

  // Filter allowed doctors based on user permissions
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));
  
  // Local state for selected doctor to view schedule
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(allowedDoctors[0]?.id || 0);
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  // Calculate start of the week (Saturday)
  const weekStart = useMemo(() => {
    const d = new DateObject(currentDate);
    d.toFirstOfWeek(); 
    return d;
  }, [currentDate]);

  // Generate 7 days for the header
  const weekDays = useMemo(() => {
    const days = [];
    let d = new DateObject(weekStart);
    for (let i = 0; i < 7; i++) {
      days.push(new DateObject(d));
      d.add(1, 'day');
    }
    return days;
  }, [weekStart]);

  const goToToday = () => {
    setCurrentDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const nextWeek = () => {
    setCurrentDate(new DateObject(currentDate).add(7, 'days'));
  };

  const prevWeek = () => {
    setCurrentDate(new DateObject(currentDate).subtract(7, 'days'));
  };

  const handleExport = () => {
    // 1. Determine the Gregorian range of the current week view
    const gStart = new DateObject(weekStart).convert(gregorian, gregorian_en).toDate();
    const gEnd = new DateObject(weekDays[6]).convert(gregorian, gregorian_en).toDate();
    gEnd.setHours(23, 59, 59, 999);

    // 2. Filter appointments for this week and this doctor
    const weekAppts = appointments.filter(apt => {
        const aptDate = new Date(apt.for_date);
        return apt.doctor_id === selectedDoctorId &&
               aptDate >= gStart && 
               aptDate <= gEnd;
    }).sort((a, b) => new Date(a.for_date).getTime() - new Date(b.for_date).getTime());

    // 3. Prepare CSV content
    const headers = ['نام بیمار', 'تاریخ', 'ساعت', 'علت مراجعه', 'وضعیت'];
    const rows = weekAppts.map(apt => {
        const pName = getPatientName(apt.patient_id);
        const date = formatJalaliDate(apt.for_date);
        const time = formatJalaliTime(apt.for_date);
        // Fixed: Use services array instead of reason_ids
        const reasonsList = apt.services.map(s => getReasonTitle(s.reason_id)).join(' - ');
        const status = statusLabels[apt.status].label;
        return `"${pName}","${date}","${time}","${reasonsList}","${status}"`;
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const docName = selectedDoctor?.name || 'Doctor';
    link.download = `calendar-${docName}-${weekStart.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Check day status (Full, Open, Closed)
  const checkDayStatus = (day: DateObject) => {
    if (!selectedDoctor) return 'closed';

    const dayIndex = day.weekDay.index; 
    const mapIndexToName = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const dayName = mapIndexToName[dayIndex];
    
    const schedule = selectedDoctor.schedule[dayName];

    // 1. Check if closed
    if (!schedule || !schedule.is_working) return 'closed';

    // 2. Calculate Capacity
    const startH = parseInt(schedule.start.split(':')[0]);
    const endH = parseInt(schedule.end.split(':')[0]);
    
    // Calculate total minutes available (minus break)
    let totalMinutes = (endH - startH) * 60;
    if (schedule.breaks) {
        schedule.breaks.forEach(brk => {
             const bStart = parseInt(brk.start.split(':')[0]) * 60 + parseInt(brk.start.split(':')[1]);
             const bEnd = parseInt(brk.end.split(':')[0]) * 60 + parseInt(brk.end.split(':')[1]);
             totalMinutes -= (bEnd - bStart);
        });
    }

    // Convert Persian day to Gregorian to match appointment dates
    const gDay = new DateObject(day).convert(gregorian, gregorian_en);

    // Filter appointments for this day AND this doctor
    const dayAppts = appointments.filter(apt => {
        const aptDate = new Date(apt.for_date); // Local date from ISO
        return apt.doctor_id === selectedDoctorId &&
               aptDate.getFullYear() === gDay.year && 
               aptDate.getMonth() + 1 === gDay.month.number && 
               aptDate.getDate() === gDay.day &&
               apt.status !== '2'; // Exclude absent/cancelled
    });

    // Sum booked duration
    // Fixed: Use services array and account for quantity
    const bookedMinutes = dayAppts.reduce((sum, apt) => {
        const dur = apt.services.reduce((s, item) => s + (reasons.find(r=>r.uuid===item.reason_id)?.duration || 0) * item.quantity, 0);
        return sum + dur;
    }, 0);
    
    const maxPercent = selectedDoctor.maxBookingPercent || 100;
    // If booked duration reaches doctor's percentage threshold, mark as full
    if (totalMinutes > 0 && bookedMinutes >= totalMinutes * (maxPercent / 100)) return 'full';
    
    return 'open';
  };

  // Helper to check if an appointment belongs to a specific day
  const getAppointmentsForDay = (day: DateObject) => {
    return appointments.filter(apt => {
        const aptDate = new DateObject({ date: apt.for_date, calendar: persian, locale: persian_fa });
        return apt.doctor_id === selectedDoctorId &&
               aptDate.year === day.year && 
               aptDate.month.number === day.month.number && 
               aptDate.day === day.day &&
               apt.status !== '2';
    });
  };

  // Calculate position and height
  const getAppointmentStyle = (apt: any) => {
      const aptDate = new DateObject({ date: apt.for_date, calendar: persian, locale: persian_fa });
      const startHour = aptDate.hour;
      const startMinute = aptDate.minute;
      
      // Calculate duration from reasons
      // Fixed: Use services array and account for quantity
      const totalDuration = apt.services.reduce((sum: number, item: any) => {
          const r = reasons.find(res => res.uuid === item.reason_id);
          return sum + ((r?.duration || 15) * item.quantity);
      }, 0);

      const top = ((startHour - START_HOUR) * PIXELS_PER_HOUR) + ((startMinute / 60) * PIXELS_PER_HOUR);
      const height = (totalDuration / 60) * PIXELS_PER_HOUR;

      return {
          top: `${top}px`,
          height: `${Math.max(height, 30)}px`, // Minimum height for visibility
      };
  };

  // Hours array for sidebar
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">تقویم کاری</h2>
          <p className="text-gray-500 mt-1">
             {weekStart.format('D MMMM')} - {new DateObject(weekDays[6]).format('D MMMM YYYY')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             {/* Excel Export Button */}
             <button 
                onClick={handleExport}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all text-sm font-medium"
                title="خروجی اکسل این هفته"
             >
                <Download size={18} />
                <span className="hidden lg:inline">خروجی اکسل</span>
             </button>

             {/* Doctor Switcher Local */}
             {allowedDoctors.length > 1 && (
                 <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm group hover:border-primary-300 transition-colors">
                    <Stethoscope size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600 pointer-events-none" />
                    <select
                        className="appearance-none bg-transparent py-2.5 pr-10 pl-8 text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer min-w-[160px]"
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(parseInt(e.target.value))}
                    >
                        {allowedDoctors.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary-600 transition-colors" />
                 </div>
             )}

             <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                 <button onClick={prevWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="هفته قبل">
                    <ChevronRight size={20} />
                 </button>
                 <button 
                    onClick={goToToday}
                    className="px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-bold rounded-lg text-sm hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                 >
                    امروز
                 </button>
                 <button onClick={nextWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="هفته بعد">
                    <ChevronLeft size={20} />
                 </button>
             </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 glass-card rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          {/* Header Row */}
          <div className="grid grid-cols-8 divide-x divide-x-reverse divide-gray-100 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="p-4 flex items-center justify-center text-gray-400 font-medium text-sm">
                  <Clock size={18} />
              </div>
              {weekDays.map((day, idx) => {
                  const isToday = day.year === new DateObject({ calendar: persian }).year && 
                                  day.month.number === new DateObject({ calendar: persian }).month.number && 
                                  day.day === new DateObject({ calendar: persian }).day;
                  
                  const status = checkDayStatus(day);
                  const isFull = status === 'full';
                  const isClosed = status === 'closed';

                  return (
                      <div key={idx} className={clsx(
                          "p-3 text-center transition-colors border-b-2 relative",
                          isToday ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-500" : "border-transparent",
                          isFull && !isToday ? "bg-red-50/60 dark:bg-red-900/10" : "", // Full booked styling
                          isClosed && !isToday ? "bg-gray-100/50 dark:bg-gray-900/40 opacity-60 cursor-not-allowed" : ""
                      )}>
                          <p className={clsx("text-xs font-medium mb-1", 
                              isToday ? "text-blue-600 dark:text-blue-400" : 
                              isFull ? "text-red-600 dark:text-red-400" : 
                              isClosed ? "text-gray-400" : "text-gray-500"
                          )}>
                              {day.format('dddd')}
                          </p>
                          <div className={clsx(
                              "w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-bold transition-all",
                              isToday ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none" : 
                              isFull ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm" : "text-gray-800 dark:text-gray-100"
                          )}>
                              {day.day}
                          </div>
                          {isFull && (
                            <span className="block text-[10px] font-bold text-red-500 dark:text-red-400 mt-1 animate-pulse">
                                تکمیل
                            </span>
                          )}
                      </div>
                  );
              })}
          </div>

          {/* Grid Body */}
          <div className="flex-1 overflow-y-auto relative bg-white dark:bg-gray-900 custom-scrollbar">
              {/* Time Lines background */}
              <div className="absolute inset-0 grid grid-cols-8 divide-x divide-x-reverse divide-gray-100 dark:divide-gray-800 pointer-events-none">
                  <div className="bg-gray-50/30 dark:bg-gray-800/10"></div> {/* Time Label Column Background */}
                  {Array.from({ length: 7 }).map((_, i) => <div key={i}></div>)}
              </div>

              {/* Rows and Content */}
              <div className="relative min-h-full" style={{ height: (END_HOUR - START_HOUR) * PIXELS_PER_HOUR }}>
                  {hours.map((hour) => (
                      <div 
                        key={hour} 
                        className="absolute w-full border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-start"
                        style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR, height: PIXELS_PER_HOUR }}
                      >
                         <div className="w-[12.5%] text-center -mt-2.5 bg-white/0 pr-2">
                             {hour}:00
                         </div>
                      </div>
                  ))}

                  {/* Appointments Layer */}
                  <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
                      <div className=""></div> {/* Empty Time Column */}
                      {weekDays.map((day, idx) => {
                          const dayApts = getAppointmentsForDay(day);
                          const status = checkDayStatus(day);
                          const isClosed = status === 'closed';

                          return (
                              <div key={idx} className={clsx(
                                  "relative h-full transition-colors",
                                  isClosed ? "bg-gray-100/40 dark:bg-gray-800/40 cursor-not-allowed" : "pointer-events-auto"
                              )}>
                                  {dayApts.map(apt => {
                                      const style = getAppointmentStyle(apt);
                                      const patientName = getPatientName(apt.patient_id);
                                      // Fixed: Use services array instead of reason_ids
                                      const reasonTitle = apt.services.map(s => getReasonTitle(s.reason_id)).join('، ');
                                      const statusColor = apt.status === '0' 
                                        ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' 
                                        : 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50';

                                      return (
                                          <div
                                              key={apt.uuid}
                                              className={clsx(
                                                  "absolute left-1 right-1 rounded-lg border p-1.5 text-xs shadow-sm transition-all cursor-pointer overflow-hidden z-10 group",
                                                  statusColor
                                              )}
                                              style={style}
                                              onClick={() => navigate('/today')} // Or open details modal
                                              title={`${patientName} - ${reasonTitle}`}
                                          >
                                              <div className="font-bold truncate">{patientName}</div>
                                              <div className="truncate opacity-80 text-[10px] mt-0.5">{reasonTitle}</div>
                                              {/* Hover Details */}
                                              <div className="hidden group-hover:block absolute top-0 right-0 bg-white dark:bg-gray-800 shadow-md p-1 rounded-bl-lg">
                                                  <User size={12} className="text-gray-500" />
                                              </div>
                                          </div>
                                      );
                                  })}
                                  
                                  {/* Current Time Indicator (Horizontal Line) - if today */}
                                  {day.year === new DateObject({ calendar: persian }).year && 
                                   day.month.number === new DateObject({ calendar: persian }).month.number && 
                                   day.day === new DateObject({ calendar: persian }).day && (
                                     <div 
                                        className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                                        style={{ 
                                            top: ((new Date().getHours() - START_HOUR) * PIXELS_PER_HOUR) + ((new Date().getMinutes() / 60) * PIXELS_PER_HOUR) 
                                        }}
                                     >
                                         <div className="w-2 h-2 bg-red-500 rounded-full -mr-1"></div>
                                     </div>
                                   )
                                  }
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
