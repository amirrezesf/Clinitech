
import React from 'react';
import { useData } from '../context/DataContext';
import { Users, CalendarCheck, CalendarX, Wallet, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { formatCurrency } from '../utils/helpers';

export const Dashboard = () => {
  const { appointments, reasons } = useData();

  const confirmed = appointments.filter(a => a.status === '0').length;
  const pending = appointments.filter(a => a.status === '1').length;
  const absent = appointments.filter(a => a.status === '2').length;
  
  // Calculate approximate revenue
  // Fixed: Use services array and account for quantity
  const revenue = appointments.reduce((sum, apt) => {
    const reasonPrice = apt.services.reduce((p, item) => {
        const reason = reasons.find(r => r.uuid === item.reason_id);
        return p + ((reason?.price || 0) * item.quantity);
    }, 0);
    return sum + (reasonPrice - (apt.discount || 0));
  }, 0);

  const stats = [
    { label: 'نوبت‌های تایید شده', value: confirmed, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'در انتظار تایید', value: pending, icon: Users, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'عدم حضور', value: absent, icon: CalendarX, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'درآمد کل (تخمین)', value: formatCurrency(revenue), icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-100' },
  ];

  const chartData = [
    { name: 'شنبه', visits: 4 },
    { name: 'یکشنبه', visits: 3 },
    { name: 'دوشنبه', visits: 2 },
    { name: 'سه‌شنبه', visits: 7 },
    { name: 'چهارشنبه', visits: 5 },
    { name: 'پنج‌شنبه', visits: 6 },
    { name: 'جمعه', visits: 1 },
  ];

  // Dynamically calculate reason distribution for the Pie Chart
  // Fixed: Use services array and account for quantity
  const pieDataMap = new Map<string, number>();
  appointments.forEach(apt => {
      apt.services.forEach(item => {
          const reasonTitle = reasons.find(r => r.uuid === item.reason_id)?.title || 'نامشخص';
          pieDataMap.set(reasonTitle, (pieDataMap.get(reasonTitle) || 0) + item.quantity);
      });
  });

  const pieData = Array.from(pieDataMap.entries()).map(([name, value]) => ({ name, value }));
  
  // If no data, show some dummy or empty
  if (pieData.length === 0) {
      pieData.push({ name: 'بدون داده', value: 1 });
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">داشبورد مدیریتی</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">خوش آمدید، گزارش عملکرد امروز شما</p>
        </div>
        <div className="bg-white dark:bg-gray-800 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
           {new Date().toLocaleDateString('fa-IR')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => {
           const Icon = stat.icon;
           return (
            <div key={idx} className="glass-card p-4 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-4 transition-transform hover:-translate-y-1">
              <div className={`p-3 sm:p-4 rounded-xl ${stat.bg} shrink-0`}>
                <Icon className={stat.color} size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 truncate">{stat.label}</p>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">{stat.value}</h3>
              </div>
            </div>
           );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-2xl">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm sm:text-base">
               <TrendingUp size={20} className="text-primary-600"/>
               آمار مراجعات هفتگی
             </h3>
           </div>
           <div className="h-56 sm:h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                 <XAxis dataKey="name" tick={{fontFamily: 'Vazirmatn', fontSize: 11}} />
                 <YAxis tick={{fontFamily: 'Vazirmatn', fontSize: 11}} />
                 <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'Vazirmatn', textAlign: 'right'}}
                    cursor={{fill: '#f8fafc'}}
                 />
                 <Bar dataKey="visits" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={28} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-4 sm:p-6 rounded-2xl">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4 sm:mb-6 text-sm sm:text-base">توزیع دلایل مراجعه</h3>
          <div className="h-56 sm:h-64 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mt-2">
             {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/80 px-2 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                   <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                   <span className="truncate max-w-[120px]">{d.name}</span>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
