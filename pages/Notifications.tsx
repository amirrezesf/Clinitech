import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Calendar, 
  AlertTriangle, 
  UserCheck, 
  Clock, 
  Info, 
  Search, 
  Filter, 
  ArrowLeft, 
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
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

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { appointments, patients, installments, auditLogs, doctors } = useData();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  // Generate dynamic notifications based on real app context
  const allNotifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // 1. Appointments & Patients
    appointments.forEach((apt) => {
      const patient = patients.find((p) => p.uuid === apt.patient_id);
      const doctor = doctors.find((d) => d.id === apt.doctor_id);
      const patientName = patient?.name || 'مراجع محترم';
      const doctorName = doctor?.name || 'پزشک';

      if (apt.status === '4') {
        items.push({
          id: `apt-in-clinic-${apt.uuid}`,
          title: 'حضور مراجع در مطب',
          message: `${patientName} وارد مطب شده و در انتظار ویزیت توسط ${doctorName} است.`,
          type: 'patient',
          timestamp: apt.for_date || 'امروز',
          isRead: readIds.includes(`apt-in-clinic-${apt.uuid}`),
          link: '/today',
          doctorName,
        });
      } else if (apt.status === '1') {
        items.push({
          id: `apt-waiting-${apt.uuid}`,
          title: 'نوبت برنامه‌ریزی‌شده',
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
          title: 'ویزیت فعال در جریان',
          message: `${patientName} هم‌اکنون توسط ${doctorName} در حال ویزیت می‌باشد.`,
          type: 'urgent',
          timestamp: 'در حال انجام',
          isRead: readIds.includes(`apt-in-visit-${apt.uuid}`),
          link: '/doctor/visit',
          doctorName,
        });
      }
    });

    // 2. Overdue Installments & Financial
    installments.forEach((inst) => {
      if (inst.status === 'overdue') {
        const patient = patients.find((p) => p.uuid === inst.patient_id);
        const patientName = patient?.name || 'مراجع';
        items.push({
          id: `inst-overdue-${inst.uuid}`,
          title: 'هشدار سررسید قسط معوقه',
          message: `سررسید قسط ${patientName} به مبلغ ${new Intl.NumberFormat('fa-IR').format(inst.amount)} تومان گذشته است.`,
          type: 'installment',
          timestamp: inst.due_date || 'معوقه',
          isRead: readIds.includes(`inst-overdue-${inst.uuid}`),
          link: '/payments',
        });
      }
    });

    // 3. System audit logs
    auditLogs.slice(0, 8).forEach((log) => {
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

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((item) => {
      // Category filter
      if (activeCategory === 'unread' && item.isRead) return false;
      if (activeCategory === 'appointment' && item.type !== 'appointment' && item.type !== 'patient' && item.type !== 'urgent') return false;
      if (activeCategory === 'financial' && item.type !== 'installment') return false;
      if (activeCategory === 'system' && item.type !== 'system') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMsg = item.message.toLowerCase().includes(q);
        const matchesDoctor = item.doctorName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesDoctor) return false;
      }

      return true;
    });
  }, [allNotifications, activeCategory, searchQuery]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !n.isRead).length;
  }, [allNotifications]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readIds.includes(id)) {
      setReadIds((prev) => prev.filter((i) => i !== id));
    } else {
      setReadIds((prev) => [...prev, id]);
    }
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => [...prev, id]);
    toast.success('اعلان با موفقیت حذف شد');
  };

  const handleMarkAllAsRead = () => {
    const allIds = allNotifications.map((n) => n.id);
    setReadIds((prev) => Array.from(new Set([...prev, ...allIds])));
    toast.success('تمام اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند');
  };

  const handleClearAll = () => {
    const allIds = allNotifications.map((n) => n.id);
    setDismissedIds((prev) => Array.from(new Set([...prev, ...allIds])));
    toast.success('تمامی اعلان‌ها پاکسازی شدند');
  };

  const handleNavigate = (notification: NotificationItem) => {
    handleMarkAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'patient':
        return <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'installment':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'urgent':
        return <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getBadgeStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'patient':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
      case 'appointment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'installment':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    }
  };

  const getTypeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'patient':
        return 'حضور مراجع';
      case 'appointment':
        return 'نوبت‌دهی';
      case 'installment':
        return 'مالی / اقساط';
      case 'urgent':
        return 'فوریت / اتاق ویزیت';
      default:
        return 'سیستمی';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              <span>مرکز اعلان‌ها و پیام‌های سیستم</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-[11px] bg-red-500 text-white font-bold rounded-full">
                  {new Intl.NumberFormat('fa-IR').format(unreadCount)} خوانده‌نشده
                </span>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              مشاهده کامل پیام‌ها، هشدار نوبت‌ها، اقساط معوقه و فعالیت‌های جدید مطب
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex-1 sm:flex-none justify-center px-3 sm:px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>خواندن همه</span>
            </button>
          )}

          {allNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex-1 sm:flex-none justify-center px-3 sm:px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/60 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>پاکسازی همه</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 custom-scrollbar w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={clsx(
              'px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
              activeCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            همه ({new Intl.NumberFormat('fa-IR').format(allNotifications.length)})
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('unread')}
            className={clsx(
              'px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
              activeCategory === 'unread'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            خوانده‌نشده ({new Intl.NumberFormat('fa-IR').format(unreadCount)})
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('appointment')}
            className={clsx(
              'px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
              activeCategory === 'appointment'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            نوبت‌ها و مراجعین
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('financial')}
            className={clsx(
              'px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
              activeCategory === 'financial'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            اقساط و امور مالی
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('system')}
            className={clsx(
              'px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
              activeCategory === 'system'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            فعالیت‌های سیستم
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64 md:min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در متن اعلان‌ها..."
            className="w-full pr-9 pl-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-2xl border border-gray-100 dark:border-gray-700 text-center space-y-3">
            <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto stroke-[1.5]" />
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">هیچ اعلانی یافت نشد</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              با تغییر فیلترها یا عبارت جستجو می‌توانید اعلان‌های دیگری را مشاهده نمایید.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavigate(item)}
              className={clsx(
                'p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group hover:shadow-md',
                !item.isRead
                  ? 'bg-white dark:bg-gray-800 border-emerald-500/40 dark:border-emerald-500/40 ring-1 ring-emerald-500/10'
                  : 'bg-gray-50/60 dark:bg-gray-800/40 border-gray-200/80 dark:border-gray-700/80 opacity-90'
              )}
            >
              <div className="flex items-start gap-3 sm:gap-4 flex-1">
                {/* Icon Container */}
                <div className="p-2.5 sm:p-3 bg-gray-100 dark:bg-gray-700/60 rounded-2xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('px-2.5 py-0.5 text-[11px] font-bold rounded-lg', getBadgeStyle(item.type))}>
                      {getTypeLabel(item.type)}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.timestamp}
                    </span>
                    {item.doctorName && (
                      <span className="font-medium text-gray-500 dark:text-gray-400">
                        پزشک: {item.doctorName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-700 w-full md:w-auto">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleToggleRead(item.id, e)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
                    title={item.isRead ? 'علامت به عنوان خوانده‌نشده' : 'علامت به عنوان خوانده‌شده'}
                  >
                    {item.isRead ? <Check className="w-4 h-4 text-emerald-500" /> : <CheckCheck className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDismiss(item.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="حذف این اعلان"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {item.link && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(item)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>مشاهده جزئیات</span>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
