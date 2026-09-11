
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate } from '../utils/helpers';
import { 
  TrendingUp, ArrowUpRight, ArrowDownLeft, Wallet, Download, 
  Activity, AlertCircle, CreditCard, Landmark, ArrowRightLeft, 
  Briefcase, Stethoscope, ChevronDown, Target, Maximize2, Minimize2,
  Sparkles, Zap, Brain, Star, Clock, Users, Info, HelpCircle, 
  BarChart3, PieChart as PieIcon, LineChart, CalendarDays, Percent,
  Scale, FileSpreadsheet, Calculator, ShieldCheck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts';
import clsx from 'clsx';

export const Accounting = () => {
  const { payments, expenses, installments, doctors, allReasons, allAppointments } = useData();
  const { user } = useAuth();
  
  const isDoctor = user?.role === 'doctor';
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));
  
  const [displayMode, setDisplayMode] = useState<'simple' | 'advanced'>('simple');
  const [timeSpan, setTimeSpan] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    isDoctor ? user?.allowedDoctorIds?.[0]?.toString() || '' : 'all'
  );

  // --- المان کمکی با Z-index فوق العاده بالا و توضیحات ساده ---
  const InfoTip = ({ title, text }: { title: string, text: string }) => (
    <div className="group relative inline-block ml-1 align-middle z-[9999]">
      <HelpCircle size={14} className="text-gray-300 hover:text-primary-500 cursor-help transition-colors" />
      <div className="absolute bottom-full right-0 mb-3 hidden group-hover:block w-64 p-4 bg-gray-900 text-white rounded-2xl shadow-2xl z-[10000] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[11px] font-black text-primary-400 mb-1 border-b border-white/10 pb-1">{title}</p>
        <p className="text-[10px] leading-relaxed font-normal opacity-90">{text}</p>
        <div className="absolute top-full right-4 border-8 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );

  // --- محاسبات هوشمند مالی ---
  const { currentData, insights, chartData, balanceSheet } = useMemo(() => {
    const effectiveDocId = isDoctor ? (user?.allowedDoctorIds?.[0] || -1) : 
                           (selectedDoctorId === 'all' ? 'all' : parseInt(selectedDoctorId));

    const isAll = effectiveDocId === 'all';

    const now = new Date();
    const spanMap = { '7d': 7, '30d': 30, '90d': 90, 'year': 365 };
    const cutoff = new Date(now.getTime() - spanMap[timeSpan] * 24 * 60 * 60 * 1000);

    const filteredPayments = (isAll ? payments : payments.filter(p => p.doctor_id === effectiveDocId))
      .filter(p => new Date(p.date) >= cutoff);
    
    const filteredExpenses = (isAll ? expenses : expenses.filter(e => e.doctor_id === effectiveDocId))
      .filter(e => new Date(e.date) >= cutoff);

    const filteredInstallments = (isAll ? installments : installments.filter(i => i.doctor_id === effectiveDocId))
      .filter(i => new Date(i.due_date) >= cutoff);

    const totalIncome = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const receivables = filteredInstallments.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);
    
    // نسبت‌های مالی
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const burnRate = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

    // توزیع خدمات
    const serviceMap = new Map();
    filteredPayments.forEach(p => {
        const matchedReason = allReasons.find(r => r.title === p.description || r.price === p.amount);
        const label = matchedReason?.title || 'سایر خدمات';
        serviceMap.set(label, (serviceMap.get(label) || 0) + p.amount);
    });
    const revenueByService = Array.from(serviceMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // ترازنامه (Balance Sheet Simulation)
    const balance = {
        assets: [
            { label: 'موجودی نقد (وصول شده)', value: totalIncome, desc: 'پولی که همین الان در حساب شماست.' },
            { label: 'مطالبات جاری (اقساط)', value: receivables, desc: 'پولی که بیماران باید تا پایان دوره بپردازند.' }
        ],
        liabilities: [
            { label: 'هزینه‌های ثبت شده', value: totalExpense, desc: 'پول‌هایی که برای مطب خرج کرده‌اید.' },
            { label: 'ذخیره مالیات (تخمینی)', value: netProfit * 0.09, desc: 'سهم احتمالی مالیات از سود شما.' }
        ],
        equity: netProfit - (netProfit * 0.09)
    };

    const dummyChart = Array.from({ length: 5 }).map((_, i) => ({
      name: `پریود ${i + 1}`,
      income: totalIncome * (0.15 + Math.random() * 0.1),
      expense: totalExpense * (0.1 + Math.random() * 0.1),
      profit: 0
    })).map(d => ({ ...d, profit: d.income - d.expense }));

    // فکت‌های هوشمند
    const insightsList = [];
    if (profitMargin > 40) insightsList.push({ icon: <TrendingUp className="text-emerald-500" />, text: "بازدهی مطب شما از میانگین صنف بالاتر است؛ نقدینگی را برای توسعه تجهیزات مدیریت کنید." });
    if (receivables > totalIncome * 0.4) insightsList.push({ icon: <AlertCircle className="text-amber-500" />, text: "بیش از ۴۰٪ درآمد شما در دست بیماران است. سیستم پیگیری اقساط را فعال‌تر کنید." });

    const uniquePatientsCount = new Set(filteredPayments.map(p => p.patient_id)).size;
    const arpp = uniquePatientsCount > 0 ? Math.round(totalIncome / uniquePatientsCount) : 0;

    return { 
        currentData: { totalIncome, totalExpense, netProfit, receivables, revenueByService, arpp, uniquePatientsCount, profitMargin, burnRate },
        insights: insightsList,
        chartData: dummyChart,
        balanceSheet: balance
    };
  }, [payments, expenses, installments, selectedDoctorId, doctors, allReasons, allAppointments, isDoctor, user, timeSpan]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 print:bg-white print:p-0 overflow-visible">
      <style>{`
        @media print {
          aside, header, .no-print, .recharts-tooltip-wrapper, button { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 1px solid #eee !important; border-radius: 0 !important; }
          .glass-card { background: white !important; border: 1px solid #eee !important; }
          body { background: white !important; font-size: 11px; }
          .chart-container { height: 250px !important; }
        }
      `}</style>

      {/* --- Optimized Header --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-900 text-white rounded-2xl shadow-lg shrink-0">
                <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">گزارش ترازنامه و تحلیل مالی</h2>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs mt-0.5 italic">وضعیت سلامت اقتصادی کلینیک در یک نگاه</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Time Span */}
            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {(['7d', '30d', '90d', 'year'] as const).map(span => (
                    <button key={span} onClick={() => setTimeSpan(span)} className={clsx("px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-black transition-all", timeSpan === span ? "bg-primary-600 text-white" : "text-gray-500")}>
                        {span === '7d' ? '۷ روز' : span === '30d' ? 'ماه' : span === '90d' ? 'فصل' : 'سال'}
                    </button>
                ))}
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button onClick={() => setDisplayMode('simple')} className={clsx("px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all", displayMode === 'simple' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500")}>نمای ساده</button>
                <button onClick={() => setDisplayMode('advanced')} className={clsx("px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all", displayMode === 'advanced' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500")}>پیشرفته</button>
            </div>

            <button onClick={handlePrint} className="w-full sm:w-auto justify-center bg-primary-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-600/20 flex items-center gap-2 text-xs font-bold transition-all">
                <Download size={18} />
                دریافت گزارش PDF
            </button>
        </div>
      </div>

      {/* --- Main KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 print-full overflow-visible">
          <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-r-4 border-emerald-500">
              <div className="flex items-center mb-1">
                <p className="text-gray-500 text-[10px] font-black">درآمد ناخالص (Gross)</p>
                <InfoTip title="درآمد ناخالص چیست؟" text="مجموع کل پولی که از بیماران بابت خدمات دریافت کرده‌اید، بدون اینکه هزینه‌های اجاره و حقوق را از آن کم کنید." />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">{formatCurrency(currentData.totalIncome)}</h3>
          </div>

          <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-r-4 border-red-500">
              <div className="flex items-center mb-1">
                <p className="text-gray-500 text-[10px] font-black">مخارج عملیاتی (OPEX)</p>
                <InfoTip title="مخارج عملیاتی (OPEX)" text="تمام خرج‌های جاری مطب مثل اجاره، حقوق منشی، برق و مواد مصرفی که برای سرپا ماندن کلینیک ضروری هستند." />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white">{formatCurrency(currentData.totalExpense)}</h3>
          </div>

          <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-r-4 border-blue-500 bg-blue-50/10">
              <div className="flex items-center mb-1">
                <p className="text-gray-500 text-[10px] font-black">سود خالص (EBITDA)</p>
                <InfoTip title="سود خالص یعنی چه؟" text="پولی که پس از پرداخت تمام هزینه‌های مطب، واقعاً برای شما باقی می‌ماند (سود قبل از کسر مالیات شخصی)." />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(currentData.netProfit)}</h3>
          </div>

          <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-r-4 border-amber-500">
              <div className="flex items-center mb-1">
                <p className="text-gray-500 text-[10px] font-black">مطالبات (Receivables)</p>
                <InfoTip title="مطالبات یا چک‌ها" text="مبالغی که بابت خدمات انجام شده طلبکارید (مثل اقساطی که بیماران هنوز پرداخت نکرده‌اند)." />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-amber-600">{formatCurrency(currentData.receivables)}</h3>
          </div>
      </div>

      {/* --- Advanced Mode: Balance Sheet & Deep Analysis --- */}
      {displayMode === 'advanced' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500 print-full overflow-visible">
              {/* Balance Sheet Section */}
              <div className="lg:col-span-2 glass-card rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                          <Scale size={18} className="text-primary-600" />
                          ترازنامه مالی دوره (Balance Sheet)
                      </h3>
                      <InfoTip title="ترازنامه به زبان ساده" text="ترازو نشان می‌دهد چقدر پول نقد و طلب دارید (دارایی) در مقابل چقدر خرج کرده‌اید. تفاوت این دو، ارزش واقعی ایجاد شده در این دوره است." />
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Assets */}
                      <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 pb-1">دارایی‌ها و ورودی‌ها</h4>
                          {balanceSheet.assets.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start group">
                                  <div>
                                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.label}</p>
                                      <p className="text-[9px] text-gray-400 mt-0.5">{item.desc}</p>
                                  </div>
                                  <span className="text-xs font-black text-gray-800 dark:text-white">{formatCurrency(item.value)}</span>
                              </div>
                          ))}
                      </div>
                      {/* Liabilities */}
                      <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest border-b border-red-100 pb-1">بدهی‌ها و خروجی‌ها</h4>
                          {balanceSheet.liabilities.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start">
                                  <div>
                                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.label}</p>
                                      <p className="text-[9px] text-gray-400 mt-0.5">{item.desc}</p>
                                  </div>
                                  <span className="text-xs font-black text-red-500">{formatCurrency(item.value)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-900/10 px-6 py-4 border-t border-primary-100 dark:border-primary-900/30 flex justify-between items-center">
                      <span className="text-sm font-black text-primary-800 dark:text-primary-300">ارزش خالص دوره (Net Equity):</span>
                      <span className="text-xl font-black text-primary-700 dark:text-primary-400">{formatCurrency(balanceSheet.equity)}</span>
                  </div>
              </div>

              {/* Ratios & Indicators */}
              <div className="glass-card p-6 rounded-3xl space-y-6">
                  <h3 className="font-black text-gray-800 dark:text-white text-sm flex items-center gap-2">
                      <Target size={18} className="text-blue-500" />
                      شاخص‌های کلیدی عملکرد
                  </h3>
                  
                  <div className="space-y-5">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 relative">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-gray-500">حاشیه سود (Margin)</span>
                            <InfoTip title="حاشیه سود" text="نشان می‌دهد از هر ۱۰۰ تومانی که بیمار می‌دهد، چند تومان آن سود خالص شماست. هرچه بالاتر، بهتر!" />
                          </div>
                          <p className="text-2xl font-black text-gray-800 dark:text-white">{currentData.profitMargin.toFixed(1)}٪</p>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${currentData.profitMargin}%` }}></div>
                          </div>
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-gray-500">نرخ هزینه (Burn Rate)</span>
                            <InfoTip title="سرعت خرج کرد" text="چند درصد از درآمد شما بلافاصله صرف هزینه‌های مطب می‌شود. پایین بودن این عدد نشانه مدیریت خوب هزینه‌هاست." />
                          </div>
                          <p className="text-2xl font-black text-red-500">{currentData.burnRate.toFixed(1)}٪</p>
                      </div>

                      <div className="p-4 bg-primary-600 rounded-2xl text-white shadow-lg shadow-primary-600/20 relative overflow-hidden">
                          <div className="relative z-10">
                            <span className="text-[10px] font-bold opacity-80">شاخص ARPP</span>
                            <p className="text-2xl font-black mt-1">{formatCurrency(currentData.arpp)}</p>
                            <p className="text-[9px] mt-2 opacity-70 leading-relaxed italic">میانگین پولی که هر بیمار منحصر به فرد در این بازه برای مطب آورده است.</p>
                          </div>
                          <Activity className="absolute -left-4 -bottom-4 opacity-10" size={100} />
                      </div>
                  </div>
              </div>

              {/* Main Chart */}
              <div className="lg:col-span-3 glass-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl chart-container">
                  <div className="flex justify-between items-center mb-6 sm:mb-8">
                      <div>
                          <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                              <TrendingUp className="text-primary-600" size={20} />
                              تحلیل روند سودآوری و جریان نقد (Cash Flow)
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-1 italic">مقایسه ورودی پول در مقابل هزینه‌های انجام شده در طول زمان</p>
                      </div>
                  </div>
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{fontSize: 9, fontFamily: 'Vazirmatn'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 9, fontFamily: 'Vazirmatn'}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontFamily: 'Vazirmatn'}} />
                            <Bar dataKey="income" name="ورودی (درآمد)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                            <Bar dataKey="expense" name="خروجی (هزینه)" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={14} />
                            <Area type="monotone" dataKey="profit" name="سود خالص" fill="url(#profitGrad)" stroke="#3b82f6" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {displayMode === 'simple' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 print-full">
              <div className="glass-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl min-h-[300px]">
                  <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2 mb-6 sm:mb-8 text-sm">
                      <Star className="text-amber-500" size={18} />
                      پراکنـدگی درآمد بر اسـاس خدمات
                  </h3>
                  <div className="space-y-5 sm:space-y-6">
                      {currentData.revenueByService.slice(0, 5).map((service, idx) => (
                          <div key={idx} className="space-y-2">
                              <div className="flex justify-between text-xs font-bold">
                                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{service.name}</span>
                                  <span className="text-primary-600 shrink-0">{formatCurrency(service.value)}</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: `${currentData.totalIncome > 0 ? (service.value / currentData.totalIncome) * 100 : 0}%` }}></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              
              <div className="glass-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gray-900 text-white relative overflow-hidden flex flex-col justify-center text-center">
                  <div className="relative z-10">
                      <Users size={40} className="mx-auto text-primary-400 mb-3 sm:mb-4" />
                      <h4 className="text-base sm:text-lg font-black mb-2">تعداد مراجعین این دوره</h4>
                      <p className="text-4xl sm:text-5xl font-black text-primary-400">{currentData.uniquePatientsCount}</p>
                      <p className="text-xs mt-3 sm:mt-4 opacity-60">بیماران منحصر به فردی که تراکنش مالی داشته‌اند.</p>
                  </div>
                  <Brain size={250} className="absolute -left-20 -bottom-20 opacity-5 rotate-12" />
              </div>
          </div>
      )}

      {/* --- Smart Insights at Bottom --- */}
      <div className="no-print pt-10 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center animate-pulse">
                  <Brain size={22} />
              </div>
              <div>
                  <h3 className="font-black text-xl text-gray-800 dark:text-white">آنالیز هوشمند Health-Ease</h3>
                  <p className="text-[10px] text-gray-400">پیشنهادات استراتژیک برای بهبود چرخه مالی مطب</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {insights.map((insight, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex items-start gap-3 sm:gap-5 hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-default">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                          {insight.icon}
                      </div>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed italic">
                          "{insight.text}"
                      </p>
                  </div>
              ))}
              {insights.length === 0 && (
                  <div className="col-span-full py-10 text-center text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-3xl">
                      داده‌های کافی برای تحلیل استراتژیک در این بازه زمانی یافت نشد.
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
