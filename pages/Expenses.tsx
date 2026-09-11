
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate } from '../utils/helpers';
import { 
  Search, Plus, Trash2, Edit, X, Receipt, Tag, FileText, 
  Upload, Image as ImageIcon, Stethoscope, ChevronDown, 
  CheckSquare, Square, MinusSquare, DollarSign, Calendar, CheckCircle, Clock, CheckCircle2, Filter, Coins
} from 'lucide-react';
import { Expense } from '../types';
import { PersianDatePicker } from '../components/PersianDatePicker';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const EXPENSE_CATEGORIES = [
  'اجاره و رهن',
  'حقوق و دستمزد',
  'اقلام مصرفی پزشکی',
  'قبوض (آب، برق، گاز)',
  'تعمیرات و نگهداری',
  'تجهیزات سرمایه‌ای',
  'تبلیغات و مارکتینگ',
  'سایر موارد'
];

const QUICK_EXPENSE_TEMPLATES = [
  { title: 'خرید دستکش نیتریل، ماسک و گاز استریل', category: 'اقلام مصرفی پزشکی', defaultAmount: '3500000' },
  { title: 'مواد ترمیمی، کامپوزیت و بی‌حسی دندانپزشکی', category: 'اقلام مصرفی پزشکی', defaultAmount: '12500000' },
  { title: 'شارژ سامانه پیامک نوبت‌دهی و اینترنت', category: 'قبوض (آب، برق، گاز)', defaultAmount: '1800000' },
  { title: 'سرویس دوره‌ای اتوکلاو و کمپرسور', category: 'تعمیرات و نگهداری', defaultAmount: '3200000' },
  { title: 'حقوق و دستمزد منشی و پرسنل پذیرش', category: 'حقوق و دستمزد', defaultAmount: '20000000' },
  { title: 'قبوض آب، برق صنعتی و گاز مطب', category: 'قبوض (آب، برق، گاز)', defaultAmount: '2400000' },
  { title: 'ژل‌ها و محلول‌های مزوتراپی و فیلر', category: 'اقلام مصرفی پزشکی', defaultAmount: '16000000' },
  { title: 'اقلام پذیرایی و رفاهی مراجعین', category: 'سایر موارد', defaultAmount: '1400000' }
];

export const Expenses = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, doctors } = useData();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [formDoctorId, setFormDoctorId] = useState<string>('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
        if (filterDoctorId !== 'all') {
            if (e.doctor_id && e.doctor_id !== parseInt(filterDoctorId)) return false;
            if (!e.doctor_id) return false; 
        }
        if (filterCategory !== 'all') {
            if (e.category !== filterCategory) return false;
        }
        if (filterStatus !== 'all') {
            if (e.status !== filterStatus) return false;
        }
        const matchesSearch = e.title.includes(search) || e.category.includes(search) || (e.description && e.description.includes(search));
        return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, filterDoctorId, filterCategory, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidAmount = filteredExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingAmount = filteredExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCount = filteredExpenses.length;
    return { totalAmount, paidAmount, pendingAmount, totalCount };
  }, [filteredExpenses]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) setSelectedIds([]);
    else setSelectedIds(filteredExpenses.map(e => e.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`آیا از حذف دائمی ${selectedIds.length} هزینه اطمینان دارید؟`)) return;
    const toastId = toast.loading('در حال حذف هزینه‌ها...');
    for (const id of selectedIds) {
        await deleteExpense(id);
    }
    setSelectedIds([]);
    toast.success('هزینه‌های انتخاب شده حذف شدند.', { id: toastId });
  };

  const handleEditClick = (expense: Expense) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setDate(expense.date.split('T')[0]);
    setCategory(expense.category);
    setDescription(expense.description || '');
    setFormDoctorId(expense.doctor_id ? expense.doctor_id.toString() : '');
    setStatus(expense.status || 'paid');
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription('');
    setFormDoctorId(allowedDoctors.length === 1 ? allowedDoctors[0].id.toString() : '');
    setStatus('paid');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !date) {
        toast.error('لطفا فیلدهای ستاره‌دار را پر کنید.');
        return;
    }

    const expenseData: Omit<Expense, 'id'> = {
        title,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        category,
        description,
        doctor_id: formDoctorId ? parseInt(formDoctorId) : undefined,
        status: status
    };

    if (editingId) {
        await updateExpense(editingId, expenseData);
        toast.success('هزینه با موفقیت ویرایش شد.');
    } else {
        await addExpense({
            id: `exp-${Date.now()}`,
            ...expenseData
        });
        toast.success('هزینه جدید ثبت شد.');
    }
    
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (expense: Expense) => {
    const newStatus = expense.status === 'paid' ? 'pending' : 'paid';
    await updateExpense(expense.id, { status: newStatus });
    toast.success(newStatus === 'paid' ? 'وضعیت به «پرداخت شده» تغییر یافت.' : 'وضعیت به «در انتظار پرداخت» تغییر یافت.');
  };

  const applyTemplate = (template: typeof QUICK_EXPENSE_TEMPLATES[0]) => {
    setTitle(template.title);
    setCategory(template.category);
    if (!amount) {
      setAmount(template.defaultAmount);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">مدیریت هزینه‌ها</h2>
           <p className="text-gray-500 dark:text-gray-400 mt-1">ثبت و پیگیری مخارج کلینیک و حقوق پرسنل</p>
        </div>
        <button onClick={handleAddNew} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all font-bold">
            <Plus size={20} />
            <span>ثبت هزینه جدید</span>
        </button>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0">
            <Receipt size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400">مجموع کل هزینه‌ها</p>
            <p className="text-base font-black text-gray-900 dark:text-white truncate">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400">پرداخت شده</p>
            <p className="text-base font-black text-green-600 dark:text-green-400 truncate">{formatCurrency(stats.paidAmount)}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400">در انتظار پرداخت</p>
            <p className="text-base font-black text-amber-600 dark:text-amber-400 truncate">{formatCurrency(stats.pendingAmount)}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400">تعداد فاکتورها</p>
            <p className="text-base font-black text-gray-900 dark:text-white">{stats.totalCount} مورد</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center">
         {allowedDoctors.length > 1 && (
            <div className="relative w-full md:w-48">
                <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none appearance-none font-medium dark:text-white text-xs" value={filterDoctorId} onChange={(e) => setFilterDoctorId(e.target.value)}>
                    <option value="all">همه پزشکان</option>
                    {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
         )}

         <div className="relative w-full md:w-52">
            <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select className="w-full pr-9 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none appearance-none font-medium dark:text-white text-xs" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">همه دسته‌بندی‌ها</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
         </div>
         
         <div className="relative w-full md:w-44">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select className="w-full pr-9 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none appearance-none font-medium dark:text-white text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">همه وضعیت‌ها</option>
                <option value="paid">پرداخت شده</option>
                <option value="pending">در انتظار پرداخت</option>
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
         </div>

         <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="جستجو در فاکتورها، شرح و دسته‌بندی..." className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
         </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
        {/* Table Top Bar */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-red-500" />
            <span className="text-xs font-black text-gray-800 dark:text-gray-200">فهرست هزینه‌های ثبت‌شده</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">
              {filteredExpenses.length} قلم هزینه
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
                <th className="px-3 py-3.5 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-primary-600 flex items-center justify-center mx-auto">
                    {selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0 ? (
                      <CheckSquare size={17} />
                    ) : selectedIds.length > 0 ? (
                      <MinusSquare size={17} />
                    ) : (
                      <Square size={17} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} className="text-gray-400" />
                    <span>عنوان و شرح هزینه</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Coins size={14} className="text-gray-400" />
                    <span>مبلغ هزینه</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Tag size={14} className="text-gray-400" />
                    <span>دسته‌بندی</span>
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    <span>وضعیت پرداخت</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    <span>تاریخ</span>
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
              {filteredExpenses.length > 0 ? filteredExpenses.map((expense) => {
                const isSelected = selectedIds.includes(expense.id);
                return (
                  <tr 
                    key={expense.id} 
                    className={clsx(
                      "transition-colors group",
                      isSelected 
                        ? "bg-red-50/30 dark:bg-red-950/20" 
                        : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                    )}
                  >
                    <td className="px-3 py-3.5 text-center">
                      <button 
                        onClick={() => toggleSelect(expense.id)} 
                        className={clsx(
                          "flex items-center justify-center mx-auto transition-colors",
                          isSelected ? "text-primary-600" : "text-gray-300 hover:text-primary-400 dark:text-gray-600"
                        )}
                      >
                        {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-gray-900 dark:text-white">
                          {expense.title}
                        </span>
                        {expense.doctor_id && (
                          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Stethoscope size={11} className="text-primary-500" />
                            <span>{doctors.find(d => d.id === expense.doctor_id)?.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-black text-xs text-red-600 dark:text-red-400 font-mono">
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-black border border-gray-200 dark:border-gray-700">
                        <Tag size={10} className="text-gray-400" />
                        <span>{expense.category}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button 
                        type="button"
                        onClick={() => handleToggleStatus(expense)}
                        title="کلیک برای تغییر وضعیت پرداخت"
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer",
                          expense.status === 'paid' 
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100" 
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                        )}
                      >
                        {expense.status === 'paid' ? (
                          <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                        )}
                        <span>{expense.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 text-[11px] font-bold dir-ltr justify-end">
                        <span>{formatJalaliDate(expense.date)}</span>
                        <Calendar size={11} className="text-gray-400" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleEditClick(expense)} 
                          className="p-1.5 text-gray-500 hover:text-blue-600 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-colors" 
                          title="ویرایش هزینه"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('آیا از حذف این هزینه اطمینان دارید؟')) deleteExpense(expense.id); }} 
                          className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 transition-colors" 
                          title="حذف هزینه"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt size={36} className="text-gray-300 dark:text-gray-600" />
                      <span className="text-gray-500 dark:text-gray-400 font-bold text-xs">
                        {search ? 'هزینه‌ای با این مشخصات یافت نشد.' : 'هنوز هیچ هزینه‌ای ثبت نشده است.'}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-800 text-white w-[94%] sm:w-auto max-w-2xl px-4 sm:px-8 py-3.5 sm:py-5 rounded-2xl sm:rounded-[2rem] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-10 animate-in slide-in-from-bottom-10 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-3 sm:gap-4 sm:border-l sm:border-white/10 sm:pl-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg shadow-red-500/20">{selectedIds.length}</div>
                  <div>
                    <span className="text-sm font-black block">هزینه انتخاب شده</span>
                    <span className="text-[10px] opacity-50 font-bold">آماده حذف گروهی</span>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={handleBulkDelete} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black transition-all shadow-lg shadow-red-600/20"><Trash2 size={16} /> حذف دائمی موارد انتخابی</button>
                  <button onClick={() => setSelectedIds([])} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>
          </div>
      )}

      {/* --- ADD / EDIT EXPENSE MODAL --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95">
                  <div className="bg-gradient-to-l from-red-600 to-red-500 p-8 text-white relative">
                      <button onClick={() => setIsModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Receipt size={32} />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black">{editingId ? 'ویرایش سند هزینه' : 'ثبت فاکتور هزینه جدید'}</h3>
                            <p className="opacity-80 text-sm mt-1 font-bold">مخارج جاری کلینیک را با دقت ثبت کنید.</p>
                          </div>
                      </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-8 space-y-6">
                      <div className="space-y-4">
                          {/* Quick Preset Templates */}
                          {!editingId && (
                            <div className="space-y-2 p-3 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                              <p className="text-[11px] font-black text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                <Tag size={12} />
                                <span>پیش‌فرض‌های پرتکرار کلینیک (انتخاب سریع):</span>
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {QUICK_EXPENSE_TEMPLATES.map((tmpl, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => applyTemplate(tmpl)}
                                    className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-[11px] font-bold transition-all"
                                  >
                                    {tmpl.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                  <FileText size={14} /> عنوان هزینه / شرح کوتاه *
                              </label>
                              <input 
                                  required
                                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-red-500 outline-none transition-all dark:text-white font-bold"
                                  placeholder="مثلا: فاکتور خرید مواد دندانپزشکی"
                                  value={title}
                                  onChange={e => setTitle(e.target.value)}
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                      <DollarSign size={14} /> مبلغ (تومان) *
                                  </label>
                                  <input 
                                      required
                                      type="number"
                                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-red-500 outline-none transition-all dark:text-white font-black"
                                      placeholder="0"
                                      value={amount}
                                      onChange={e => setAmount(e.target.value)}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                      <Tag size={14} /> دسته‌بندی
                                  </label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-red-500 outline-none transition-all appearance-none dark:text-white font-bold"
                                          value={category}
                                          onChange={e => setCategory(e.target.value)}
                                      >
                                          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                      <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <PersianDatePicker label="تاریخ فاکتور *" value={date} onChange={setDate} />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                      <Filter size={14} /> وضعیت پرداخت
                                  </label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-red-500 outline-none transition-all appearance-none dark:text-white font-bold"
                                          value={status}
                                          onChange={e => setStatus(e.target.value as 'paid' | 'pending')}
                                      >
                                          <option value="paid">پرداخت شده</option>
                                          <option value="pending">در انتظار پرداخت</option>
                                      </select>
                                      <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                  </div>
                              </div>
                          </div>
                          
                          <div className="space-y-1">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                  <Stethoscope size={14} /> مربوط به پزشک
                              </label>
                              <div className="relative">
                                  <select 
                                      className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-red-500 outline-none transition-all appearance-none dark:text-white font-bold"
                                      value={formDoctorId}
                                      onChange={e => setFormDoctorId(e.target.value)}
                                  >
                                      <option value="">هزینه عمومی (کلینیک)</option>
                                      {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                  </select>
                                  <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                  <ImageIcon size={14} /> توضیحات تکمیلی
                              </label>
                              <textarea 
                                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-red-500 outline-none transition-all dark:text-white min-h-[80px] resize-none text-sm"
                                  placeholder="جزئیات بیشتر یا شماره فاکتور را اینجا وارد کنید..."
                                  value={description}
                                  onChange={e => setDescription(e.target.value)}
                              />
                          </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                          <button 
                              type="submit"
                              className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all transform active:scale-[0.98]"
                          >
                              <CheckCircle size={24} />
                              <span>{editingId ? 'ثبت تغییرات نهایی' : 'تایید و ثبت سند هزینه'}</span>
                          </button>
                          <button 
                              type="button"
                              onClick={() => setIsModalOpen(false)}
                              className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                          >
                              انصراف
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
