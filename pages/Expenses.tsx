
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatJalaliDate } from '../utils/helpers';
import { 
  Search, Plus, Trash2, Edit, X, Receipt, Tag, FileText, 
  Upload, Image as ImageIcon, Stethoscope, ChevronDown, 
  CheckSquare, Square, MinusSquare, DollarSign, Calendar, CheckCircle, Clock, CheckCircle2, Filter
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

export const Expenses = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, doctors } = useData();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
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
        if (filterStatus !== 'all') {
            if (e.status !== filterStatus) return false;
        }
        const matchesSearch = e.title.includes(search) || e.category.includes(search);
        return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, filterDoctorId, filterStatus]);

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

      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
         {allowedDoctors.length > 1 && (
            <div className="relative w-full md:w-56">
                <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none appearance-none font-medium dark:text-white" value={filterDoctorId} onChange={(e) => setFilterDoctorId(e.target.value)}>
                    <option value="all">همه پزشکان</option>
                    {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
         )}
         
         <div className="relative w-full md:w-48">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none appearance-none font-medium dark:text-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">همه وضعیت‌ها</option>
                <option value="paid">پرداخت شده</option>
                <option value="pending">در انتظار پرداخت</option>
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
         </div>

         <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="جستجوی در فاکتورها و دسته‌بندی‌ها..." className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white" value={search} onChange={(e) => setSearch(e.target.value)} />
         </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-4 w-10">
                    <button onClick={toggleSelectAll} className="text-primary-600">
                        {selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0 ? <CheckSquare size={20}/> : selectedIds.length > 0 ? <MinusSquare size={20}/> : <Square size={20} className="text-gray-300" />}
                    </button>
                </th>
                <th className="px-6 py-4 font-semibold">عنوان هزینه</th>
                <th className="px-6 py-4 font-semibold">مبلغ</th>
                <th className="px-6 py-4 font-semibold">دسته‌بندی</th>
                <th className="px-6 py-4 font-semibold text-center">وضعیت</th>
                <th className="px-6 py-4 font-semibold">تاریخ</th>
                <th className="px-6 py-4 font-semibold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredExpenses.length > 0 ? filteredExpenses.map((expense) => (
                <tr key={expense.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 group transition-colors ${selectedIds.includes(expense.id) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}>
                  <td className="px-4 py-4 text-center">
                    <button onClick={() => toggleSelect(expense.id)} className={selectedIds.includes(expense.id) ? "text-primary-600" : "text-gray-300 hover:text-primary-400"}>
                        {selectedIds.includes(expense.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{expense.title}</div>
                      {expense.doctor_id && (
                          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Stethoscope size={10} />
                              {doctors.find(d => d.id === expense.doctor_id)?.name}
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4 font-black text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black border border-gray-200 dark:border-gray-600">
                          <Tag size={10} />
                          {expense.category}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                      <span className={clsx(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border",
                          expense.status === 'paid' 
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" 
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      )}>
                          {expense.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {expense.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dir-ltr text-right">{formatJalaliDate(expense.date)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(expense)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit size={18} /></button>
                        <button onClick={() => { if(confirm('حذف شود؟')) deleteExpense(expense.id); }} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400 italic font-bold">هزینه‌ای یافت نشد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-gray-800 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom-10 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-red-500/20">{selectedIds.length}</div>
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
