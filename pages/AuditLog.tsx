
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { FileClock, Download, Filter, Search, User, Trash2, Plus, Edit, Shield, Info, Calendar } from 'lucide-react';
import { formatJalaliDate, formatJalaliTime } from '../utils/helpers';
import { PersianDatePicker } from '../components/PersianDatePicker';

export const AuditLog = () => {
  const { auditLogs } = useData();
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Get Unique Users for Filter
  const users = Array.from(new Set(auditLogs.map(l => l.user_name)));

  const filteredLogs = auditLogs.filter(log => {
      // User Filter
      if (filterUser && !log.user_name.includes(filterUser)) return false;
      
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
          case 'CREATE': return <Plus size={16} className="text-green-600" />;
          case 'UPDATE': return <Edit size={16} className="text-blue-600" />;
          case 'DELETE': return <Trash2 size={16} className="text-red-600" />;
          case 'SECURITY': return <Shield size={16} className="text-purple-600" />;
          case 'LOGIN': return <User size={16} className="text-amber-600" />;
          default: return <Info size={16} className="text-gray-600" />;
      }
  };

  const getActionColor = (type: string) => {
      switch (type) {
          case 'CREATE': return 'bg-green-100 border-green-200 text-green-700';
          case 'UPDATE': return 'bg-blue-100 border-blue-200 text-blue-700';
          case 'DELETE': return 'bg-red-100 border-red-200 text-red-700';
          case 'SECURITY': return 'bg-purple-100 border-purple-200 text-purple-700';
          case 'LOGIN': return 'bg-amber-100 border-amber-200 text-amber-700';
          default: return 'bg-gray-100 border-gray-200 text-gray-700';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <FileClock className="text-primary-600" size={28} />
               گزارش عملکرد سیستم
           </h2>
           <p className="text-gray-500 mt-1">رهگیری فعالیت کاربران و تغییرات داده‌ها</p>
        </div>
        <button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all">
            <Download size={20} />
            <span className="hidden sm:inline">خروجی اکسل</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-xl flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative w-full lg:w-64">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                  type="text" 
                  placeholder="جستجوی کاربر..."
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  list="users-list"
              />
              <datalist id="users-list">
                  {users.map(u => <option key={u} value={u} />)}
              </datalist>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
              <Filter className="text-gray-400 shrink-0" size={20} />
              <select 
                  className="w-full lg:w-40 py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
              >
                  <option value="all">همه عملیات‌ها</option>
                  <option value="CREATE">ایجاد</option>
                  <option value="UPDATE">ویرایش</option>
                  <option value="DELETE">حذف</option>
                  <option value="LOGIN">ورود</option>
                  <option value="SECURITY">امنیتی</option>
              </select>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
               <div className="w-full lg:w-40">
                   <PersianDatePicker 
                       placeholder="از تاریخ"
                       value={dateRange.start}
                       onChange={(d) => setDateRange({...dateRange, start: d})}
                   />
               </div>
               <span className="text-gray-400">-</span>
               <div className="w-full lg:w-40">
                   <PersianDatePicker 
                       placeholder="تا تاریخ"
                       value={dateRange.end}
                       onChange={(d) => setDateRange({...dateRange, end: d})}
                   />
               </div>
          </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-gray-200 shadow-sm min-h-[500px]">
          <div className="overflow-x-auto">
              <table className="w-full text-right">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 text-sm">
                      <tr>
                          <th className="px-6 py-4 font-semibold">کاربر</th>
                          <th className="px-6 py-4 font-semibold">نوع عملیات</th>
                          <th className="px-6 py-4 font-semibold">موجودیت (بخش)</th>
                          <th className="px-6 py-4 font-semibold">شرح فعالیت</th>
                          <th className="px-6 py-4 font-semibold">زمان</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredLogs.length > 0 ? (
                          filteredLogs.map(log => (
                              <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold border border-gray-200">
                                              {log.user_name.charAt(0)}
                                          </div>
                                          <span className="font-medium text-gray-800 text-sm">{log.user_name}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${getActionColor(log.action_type)}`}>
                                          {getActionIcon(log.action_type)}
                                          {getActionLabel(log.action_type)}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                          {log.entity}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate" title={log.description}>
                                      {log.description}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col text-xs text-gray-500">
                                          <span className="font-bold text-gray-700 dir-ltr text-right">{formatJalaliDate(log.timestamp)}</span>
                                          <span className="dir-ltr text-right">{formatJalaliTime(log.timestamp)}</span>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                  هیچ رکوردی یافت نشد
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
