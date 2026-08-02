
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">داشبورد مدیریتی</h2>
          <p className="text-gray-500 mt-1">خوش آمدید، گزارش عملکرد امروز شما</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 text-sm text-gray-600">
           {new Date().toLocaleDateString('fa-IR')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
           const Icon = stat.icon;
           return (
            <div key={idx} className="glass-card p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <Icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{stat.label}</p>
                <h3 className="text-xl font-bold text-gray-800">{stat.value}</h3>
              </div>
            </div>
           );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <TrendingUp size={20} className="text-primary-600"/>
               آمار مراجعات هفتگی
             </h3>
           </div>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                 <XAxis dataKey="name" tick={{fontFamily: 'Vazirmatn'}} />
                 <YAxis tick={{fontFamily: 'Vazirmatn'}} />
                 <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'Vazirmatn', textAlign: 'right'}}
                    cursor={{fill: '#f8fafc'}}
                 />
                 <Bar dataKey="visits" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-bold text-gray-800 mb-6">توزیع دلایل مراجعه</h3>
          <div className="h-64 w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
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
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-600 mt-2">
             {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                   <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                   <span>{d.name}</span>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
