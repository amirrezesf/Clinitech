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
  X,
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

  // Category counts for quick glancing
  const categoryCounts = useMemo(() => {
    return {
      all: allNotifications.length,
      unread: allNotifications.filter((n) => !n.isRead).length,
      appointment: allNotifications.filter((n) => n.type === 'appointment' || n.type === 'patient' || n.type === 'urgent').length,
      financial: allNotifications.filter((n) => n.type === 'installment').length,
      system: allNotifications.filter((n) => n.type === 'system').length,
    };
  }, [allNotifications]);

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

  const unreadCount = categoryCounts.unread;

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
      toast.success('به عنوان خوانده‌نشده تنظیم شد');
    } else {
      setReadIds((prev) => [...prev, id]);
      toast.success('به عنوان خوانده‌شده ثبت شد');
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
        return <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />;
      case 'installment':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />;
      case 'urgent':
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />;
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
    <div className="w-full max-w-6xl mx-auto min-w-0 space-y-3 sm:space-y-6 pb-16 overflow-hidden">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3 sm:space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl sm:rounded-2xl shrink-0 mt-0.5 sm:mt-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                <h1 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-white truncate sm:text-wrap">
                  مرکز اعلان‌ها و پیام‌ها
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] sm:text-[11px] bg-red-500 text-white font-bold rounded-full shrink-0">
                    {new Intl.NumberFormat('fa-IR').format(unreadCount)} خوانده‌نشده
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                مشاهده کامل پیام‌ها، هشدار نوبت‌ها، اقساط معوقه و فعالیت‌های جدید مطب
              </p>
            </div>
          </div>

          {/* Global actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700/60 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex-1 sm:flex-none justify-center px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <CheckCheck className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">خواندن همه</span>
              </button>
            )}

            {allNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 sm:flex-none justify-center px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/60 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">پاکسازی همه</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
        {/* Search input */}
        <div className="relative w-full min-w-0">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، پیام یا نام پزشک..."
            className="w-full pr-10 pl-10 py-2.5 bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              title="پاک کردن جستجو"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Pills - Horizontally scrollable without leaking out of the card */}
        <div className="w-full max-w-full overflow-x-auto pb-1 pt-0.5 custom-scrollbar min-w-0">
          <div className="flex items-center gap-1.5 w-max">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={clsx(
                'px-3 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95',
                activeCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900/40'
              )}
            >
              <span>همه</span>
              <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full", activeCategory === 'all' ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300")}>
                {new Intl.NumberFormat('fa-IR').format(categoryCounts.all)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('unread')}
              className={clsx(
                'px-3 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95',
                activeCategory === 'unread'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900/40'
              )}
            >
              <span>خوانده‌نشده</span>
              {categoryCounts.unread > 0 && (
                <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full font-black", activeCategory === 'unread' ? "bg-white text-emerald-700" : "bg-red-500 text-white")}>
                  {new Intl.NumberFormat('fa-IR').format(categoryCounts.unread)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('appointment')}
              className={clsx(
                'px-3 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95',
                activeCategory === 'appointment'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900/40'
              )}
            >
              <span>نوبت‌ها و مراجعین</span>
              <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full", activeCategory === 'appointment' ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300")}>
                {new Intl.NumberFormat('fa-IR').format(categoryCounts.appointment)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('financial')}
              className={clsx(
                'px-3 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95',
                activeCategory === 'financial'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900/40'
              )}
            >
              <span>اقساط و مالی</span>
              <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full", activeCategory === 'financial' ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300")}>
                {new Intl.NumberFormat('fa-IR').format(categoryCounts.financial)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('system')}
              className={clsx(
                'px-3 sm:px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95',
                activeCategory === 'system'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-900/40'
              )}
            >
              <span>فعالیت‌های سیستم</span>
              <span className={clsx("text-[10px] px-1.5 py-0.2 rounded-full", activeCategory === 'system' ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300")}>
                {new Intl.NumberFormat('fa-IR').format(categoryCounts.system)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3 w-full max-w-full min-w-0">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-2xl border border-gray-100 dark:border-gray-700 text-center space-y-3 shadow-xs w-full max-w-full min-w-0 overflow-hidden">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-gray-50 dark:bg-gray-700/40 rounded-2xl flex items-center justify-center text-gray-400">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200">اعلانی با این مشخصات یافت نشد</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              با تغییر فیلتر دسته‌بندی یا پاک‌کردن عبارت جستجو، اعلان‌های دیگر را مشاهده نمایید.
            </p>
            {(activeCategory !== 'all' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <span>نمایش همه اعلان‌ها</span>
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNavigate(item)}
              className={clsx(
                'p-3 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group hover:shadow-md relative w-full max-w-full min-w-0 overflow-hidden',
                !item.isRead
                  ? 'bg-white dark:bg-gray-800 border-emerald-500/40 dark:border-emerald-500/40 ring-1 ring-emerald-500/10 border-r-4 border-r-emerald-500'
                  : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/80 dark:border-gray-700/80 opacity-90'
              )}
            >
              <div className="flex items-start gap-2.5 sm:gap-4 flex-1 min-w-0">
                {/* Icon Container */}
                <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700/60 rounded-xl sm:rounded-2xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className={clsx('px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg shrink-0', getBadgeStyle(item.type))}>
                      {getTypeLabel(item.type)}
                    </span>
                    {!item.isRead && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span>جدید</span>
                      </span>
                    )}
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white break-words [overflow-wrap:anywhere] min-w-0">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed break-words [overflow-wrap:anywhere]">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 pt-0.5">
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.timestamp}</span>
                    </span>
                    {item.doctorName && (
                      <span className="font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        پزشک: {item.doctorName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: on phones, clean touch-friendly row */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700/60 w-full md:w-auto min-w-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleToggleRead(item.id, e)}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors active:scale-95"
                    title={item.isRead ? 'علامت به عنوان خوانده‌نشده' : 'علامت به عنوان خوانده‌شده'}
                    aria-label={item.isRead ? 'علامت به عنوان خوانده‌نشده' : 'علامت به عنوان خوانده‌شده'}
                  >
                    {item.isRead ? <Check className="w-4 h-4 text-emerald-500" /> : <CheckCheck className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDismiss(item.id, e)}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors active:scale-95"
                    title="حذف این اعلان"
                    aria-label="حذف این اعلان"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {item.link && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(item)}
                    className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm active:scale-95 shrink-0"
                  >
                    <span>مشاهده</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
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
