import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, Calendar, AlertTriangle, UserCheck, DollarSign, Clock, Info, ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'appointment' | 'patient' | 'installment' | 'system' | 'urgent';
  timestamp: string;
  isRead: boolean;
  link?: string;
  doctorName?: string;
}

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { appointments, patients, installments, auditLogs, doctors } = useData();

  // Save read/dismissed state
  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate dynamic notifications based on app data
  const rawNotifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // 1. Patient waiting in clinic (status = '4')
    appointments.forEach((apt) => {
      const patient = patients.find((p) => p.uuid === apt.patient_id);
      const doctor = doctors.find((d) => d.id === apt.doctor_id);
      const patientName = patient?.name || 'مراجع محترم';
      const doctorName = doctor?.name || 'پزشک';

      if (apt.status === '4') {
        items.push({
          id: `apt-in-clinic-${apt.uuid}`,
          title: 'مراجع در مطب حاضر شد',
          message: `${patientName} در انتظار ویزیت توسط ${doctorName} است.`,
          type: 'patient',
          timestamp: apt.for_date || 'امروز',
          isRead: readIds.includes(`apt-in-clinic-${apt.uuid}`),
          link: '/today',
          doctorName,
        });
      } else if (apt.status === '1') {
        items.push({
          id: `apt-waiting-${apt.uuid}`,
          title: 'نوبت در انتظار تایید / حضور',
          message: `نوبت ${patientName} برای امروز ثبت گردیده است.`,
          type: 'appointment',
          timestamp: apt.for_date || 'امروز',
          isRead: readIds.includes(`apt-waiting-${apt.uuid}`),
          link: '/today',
          doctorName,
        });
      } else if (apt.status === '3') {
        items.push({
          id: `apt-in-visit-${apt.uuid}`,
          title: 'اتاق ویزیت فعال',
          message: `${patientName} هم‌اکنون توسط ${doctorName} در حال ویزیت می‌باشد.`,
          type: 'urgent',
          timestamp: 'در حال انجام',
          isRead: readIds.includes(`apt-in-visit-${apt.uuid}`),
          link: '/doctor/visit',
          doctorName,
        });
      }
    });

    // 2. Overdue installments
    installments.forEach((inst) => {
      if (inst.status === 'overdue') {
        const patient = patients.find((p) => p.uuid === inst.patient_id);
        const patientName = patient?.name || 'مراجع';
        items.push({
          id: `inst-overdue-${inst.uuid}`,
          title: 'قسط معوقه پرداخت‌نشده',
          message: `سررسید قسط ${patientName} به مبلغ ${new Intl.NumberFormat('fa-IR').format(inst.amount)} تومان گذشته است.`,
          type: 'installment',
          timestamp: inst.due_date || 'معوقه',
          isRead: readIds.includes(`inst-overdue-${inst.uuid}`),
          link: '/payments',
        });
      }
    });

    // 3. System audit logs (latest 3)
    auditLogs.slice(0, 3).forEach((log) => {
      items.push({
        id: `audit-${log.id}`,
        title: `فعالیت سیستم: ${log.entity}`,
        message: `${log.user_name}: ${log.description}`,
        type: 'system',
        timestamp: new Date(log.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        isRead: readIds.includes(`audit-${log.id}`),
        link: '/settings/audit-log',
      });
    });

    // Default static system tip if no items exist
    if (items.length === 0) {
      items.push({
        id: 'sys-welcome',
        title: 'سامانه مدیریت مطب فعال است',
        message: 'کلیه رویدادها، نوبت‌ها و یادآوری‌ها در این بخش نمایش داده می‌شوند.',
        type: 'system',
        timestamp: 'هم‌اکنون',
        isRead: readIds.includes('sys-welcome'),
        link: '/',
      });
    }

    return items.filter((item) => !dismissedIds.includes(item.id));
  }, [appointments, patients, installments, auditLogs, doctors, readIds, dismissedIds]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return rawNotifications.filter((n) => !n.isRead);
    }
    return rawNotifications;
  }, [rawNotifications, activeTab]);

  const unreadCount = useMemo(() => {
    return rawNotifications.filter((n) => !n.isRead).length;
  }, [rawNotifications]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = rawNotifications.map((n) => n.id);
    setReadIds((prev) => Array.from(new Set([...prev, ...allIds])));
    toast.success('تمام اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند');
  };

  const handleClearAll = () => {
    const allIds = rawNotifications.map((n) => n.id);
    setDismissedIds((prev) => Array.from(new Set([...prev, ...allIds])));
    toast.success('اعلان‌ها پاکسازی شدند');
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    handleMarkAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'patient':
        return <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'installment':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'urgent':
        return <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getBgColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'patient':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50';
      case 'appointment':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50';
      case 'installment':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50';
      case 'urgent':
        return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50';
      default:
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/50';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl relative transition-all outline-none focus:ring-2 focus:ring-emerald-500/20",
          isOpen && "bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400"
        )}
        title="اعلان‌های سیستم"
        aria-label="اعلان‌ها"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 animate-pulse">
            {unreadCount > 9 ? '+۹' : new Intl.NumberFormat('fa-IR').format(unreadCount)}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">اعلان‌های سیستم</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {unreadCount > 0
                    ? `${new Intl.NumberFormat('fa-IR').format(unreadCount)} پیام خوانده‌نشده`
                    : 'پیام جدیدی ندارید'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors flex items-center gap-1 font-medium"
                  title="علامت‌گذاری همه به عنوان خوانده شده"
                >
                  <CheckCheck size={15} />
                  <span className="hidden sm:inline">خوانده شد</span>
                </button>
              )}
              {rawNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="پاکسازی اعلان‌ها"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 pt-3 pb-2 flex gap-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                activeTab === 'all'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              همه ({new Intl.NumberFormat('fa-IR').format(rawNotifications.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                activeTab === 'unread'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              خوانده‌نشده ({new Intl.NumberFormat('fa-IR').format(unreadCount)})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-2 stroke-[1.5] opacity-40" />
                <p className="text-xs font-medium">هیچ اعلانی یافت نشد</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={clsx(
                    'p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 relative group',
                    !item.isRead ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'opacity-85'
                  )}
                >
                  {/* Category Badge Icon */}
                  <div className={clsx('p-2 rounded-xl border shrink-0 mt-0.5', getBgColor(item.type))}>
                    {getIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 shrink-0">{item.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Actions / Read Indicator */}
                  <div className="shrink-0 flex items-center gap-1 self-center">
                    {!item.isRead ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="w-2.5 h-2.5 bg-emerald-500 rounded-full hover:scale-125 transition-transform"
                        title="علامت‌گذاری به عنوان خوانده شده"
                      />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Navigation Link */}
          <div className="p-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
            >
              <span>مشاهده تمامی اعلان‌ها</span>
              <ChevronLeft size={14} className="rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
