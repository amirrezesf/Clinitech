
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { FileClock, Download, Filter, Search, User, Trash2, Plus, Edit, Shield, Info, Calendar, Clock, Eye, X, Activity } from 'lucide-react';
import { formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { AuditLog as AuditLogType } from '../types';

export const AuditLog = () => {
  const { auditLogs } = useData();
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);

  // Get Unique Users for Filter
  const users = Array.from(new Set(auditLogs.map(l => l.user_name)));

  const filteredLogs = auditLogs.filter(log => {
      // User Filter
      if (filterUser && !log.user_name.toLowerCase().includes(filterUser.toLowerCase())) return false;
      
      // Action Filter
      if (filterAction !== 'all' && log.action_type !== filterAction) return false;

      // Date Range Filter
      if (dateRange.start && new Date(log.timestamp) < new Date(dateRange.start)) return false;
      if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59);
          if (new Date(log.timestamp) > endDate) return false;
      }

      return true;
  });

  const getActionIcon = (type: string) => {
      switch (type) {
          case 'CREATE': return <Plus size={14} className="text-emerald-600 dark:text-emerald-400" />;
          case 'UPDATE': return <Edit size={14} className="text-blue-600 dark:text-blue-400" />;
          case 'DELETE': return <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />;
          case 'SECURITY': return <Shield size={14} className="text-purple-600 dark:text-purple-400" />;
          case 'LOGIN': return <User size={14} className="text-amber-600 dark:text-amber-400" />;
          default: return <Info size={14} className="text-gray-600 dark:text-gray-400" />;
      }
  };

  const getActionColor = (type: string) => {
      switch (type) {
          case 'CREATE': return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
          case 'UPDATE': return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
          case 'DELETE': return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300';
          case 'SECURITY': return 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300';
          case 'LOGIN': return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
          default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
      }
  };

  const getActionLabel = (type: string) => {
      switch (type) {
          case 'CREATE': return 'ایجاد';
          case 'UPDATE': return 'ویرایش';
          case 'DELETE': return 'حذف';
          case 'SECURITY': return 'امنیت';
          case 'LOGIN': return 'ورود';
          default: return type;
      }
  };

  const handleExportCSV = () => {
    const headers = ["شناسه", "کاربر", "نوع عملیات", "موجودیت", "شرح فعالیت", "تاریخ", "ساعت"];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.user_name}"`,
      l.action_type,
      `"${l.entity}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      formatJalaliDate(l.timestamp),
      formatJalaliTime(l.timestamp)
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
               <FileClock className="text-primary-600 dark:text-primary-400" size={26} />
               گزارش عملکرد و لاگ سیستم
           </h2>
           <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">رهگیری شفاف تمامی فعالیت‌های پرسنل، تغییرات اطلاعات و رویدادهای امنیتی</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all text-xs sm:text-sm font-bold w-full sm:w-auto justify-center"
        >
            <Download size={18} />
            <span>خروجی فایل اکسل (CSV)</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/60 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                  type="text" 
                  placeholder="فیلتر بر اساس نام کاربر..."
                  className="w-full pl-4 pr-9 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  list="users-list"
              />
              <datalist id="users-list">
                  {users.map(u => <option key={u} value={u} />)}
              </datalist>
          </div>

          <div className="flex items-center gap-2">
              <Filter className="text-gray-400 shrink-0" size={16} />
              <select 
                  className="w-full lg:w-44 py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none cursor-pointer"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
              >
                  <option value="all">همه عملیات‌ها</option>
                  <option value="CREATE">ایجاد (Create)</option>
                  <option value="UPDATE">ویرایش (Update)</option>
                  <option value="DELETE">حذف (Delete)</option>
                  <option value="LOGIN">ورود و خروج</option>
                  <option value="SECURITY">امنیتی</option>
              </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
               <div className="w-full sm:w-36">
                   <PersianDatePicker 
                       placeholder="از تاریخ"
                       value={dateRange.start}
                       onChange={(d) => setDateRange({...dateRange, start: d})}
                   />
               </div>
               <span className="text-gray-400 hidden sm:inline">-</span>
               <div className="w-full sm:w-36">
                   <PersianDatePicker 
                       placeholder="تا تاریخ"
                       value={dateRange.end}
                       onChange={(d) => setDateRange({...dateRange, end: d})}
                   />
               </div>
               {(filterUser || filterAction !== 'all' || dateRange.start || dateRange.end) && (
                 <button 
                   onClick={() => { setFilterUser(''); setFilterAction('all'); setDateRange({ start: '', end: '' }); }}
                   className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-2 rounded-xl text-xs font-bold transition-colors"
                   title="پاک کردن فیلترها"
                 >
                   <X size={16} />
                 </button>
               )}
          </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-h-[450px]">
          {/* Table Top Bar */}
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-primary-600 dark:text-primary-400" />
              <span className="text-xs font-black text-gray-800 dark:text-gray-200">دفتر لاگ رخدادها</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                {filteredLogs.length} رخداد
              </span>
            </div>
            <div className="text-[11px] font-bold text-gray-400 md:hidden flex items-center gap-1">
              <span>← برای مشاهده همه ستون‌ها اسکرول کنید</span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-right text-xs min-w-[780px]">
                  <thead className="bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black tracking-wider">
                      <tr>
                          <th className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <User size={13} className="text-gray-400" />
                              <span>کاربر عامل</span>
                            </div>
                          </th>
                          <th className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Activity size={13} className="text-gray-400" />
                              <span>نوع عملیات</span>
                            </div>
                          </th>
                          <th className="px-5 py-3.5">بخش / موجودیت</th>
                          <th className="px-5 py-3.5">شرح فعالیت</th>
                          <th className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Clock size={13} className="text-gray-400" />
                              <span>زمان دقیق</span>
                            </div>
                          </th>
                          <th className="px-5 py-3.5 text-center">جزئیات</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                      {filteredLogs.length > 0 ? (
                          filteredLogs.map(log => (
                              <tr key={log.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors group">
                                  <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-black border border-primary-200 dark:border-primary-800 shrink-0">
                                              {log.user_name.charAt(0)}
                                          </div>
                                          <span className="font-bold text-gray-900 dark:text-white text-xs">{log.user_name}</span>
                                      </div>
                                  </td>
                                  <td className="px-5 py-3.5">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border ${getActionColor(log.action_type)}`}>
                                          {getActionIcon(log.action_type)}
                                          {getActionLabel(log.action_type)}
                                      </span>
                                  </td>
                                  <td className="px-5 py-3.5">
                                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200/60 dark:border-gray-700">
                                          {log.entity}
                                      </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-700 dark:text-gray-300 max-w-xs sm:max-w-md truncate" title={log.description}>
                                      {log.description}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                      <div className="flex flex-col text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                          <span className="font-bold text-gray-800 dark:text-gray-200 dir-ltr text-center">{formatJalaliDate(log.timestamp)}</span>
                                          <span className="dir-ltr text-center text-[10px] text-gray-400">{formatJalaliTime(log.timestamp)}</span>
                                      </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                      <button 
                                        onClick={() => setSelectedLog(log)}
                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                                        title="مشاهده جزئیات لاگ"
                                      >
                                        <Eye size={15} />
                                      </button>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-14 text-center text-gray-400 text-xs font-bold">
                                  هیچ رکوردی منطبق با فیلترهای انتخابی یافت نشد.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileClock size={18} className="text-primary-600 dark:text-primary-400" />
                <h3 className="font-black text-sm text-gray-900 dark:text-white">شناسنامه رخداد سیستم</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60">
                  <span className="text-gray-400 block text-[10px] mb-1">کاربر اقدام‌کننده</span>
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{selectedLog.user_name}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60">
                  <span className="text-gray-400 block text-[10px] mb-1">نوع عملیات</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${getActionColor(selectedLog.action_type)}`}>
                    {getActionIcon(selectedLog.action_type)}
                    {getActionLabel(selectedLog.action_type)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60">
                  <span className="text-gray-400 block text-[10px] mb-1">بخش / موجودیت</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{selectedLog.entity}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60">
                  <span className="text-gray-400 block text-[10px] mb-1">تاریخ و ساعت</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200 dir-ltr block">{formatJalaliDate(selectedLog.timestamp)} - {formatJalaliTime(selectedLog.timestamp)}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60">
                <span className="text-gray-400 block text-[10px] mb-1">شرح کامل فعالیت</span>
                <p className="font-bold text-gray-900 dark:text-white leading-relaxed">{selectedLog.description}</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700 text-left">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

