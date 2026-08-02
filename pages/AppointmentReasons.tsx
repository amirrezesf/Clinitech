
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/helpers';
import { Search, Plus, Trash2, Edit, X, Stethoscope, Clock, Coins, Check, ChevronDown, Lock } from 'lucide-react';
import { AppointmentReason } from '../types';

export const AppointmentReasons = () => {
  const { allReasons, addReason, updateReason, deleteReason, doctors } = useData();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Form State
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('15');
  const [price, setPrice] = useState('');
  const [formDoctorId, setFormDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');

  // Filter Logic
  const filteredReasons = allReasons.filter(r => {
      const matchSearch = r.title.includes(search);
      if (!matchSearch) return false;

      // Doctor Filter
      if (filterDoctorId !== 'all') {
          return r.doctor_id === parseInt(filterDoctorId);
      }
      return true; // Show all if filter is 'all'
  });

  const handleEditClick = (reason: AppointmentReason) => {
    setEditingId(reason.uuid);
    setTitle(reason.title);
    setDuration(reason.duration.toString());
    setPrice(reason.price.toString());
    setFormDoctorId(reason.doctor_id.toString());
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setTitle('');
    setDuration('15');
    setPrice('');
    // Default to filtered doctor, or first allowed doctor if 'all' is selected
    setFormDoctorId(filterDoctorId !== 'all' ? filterDoctorId : allowedDoctors[0]?.id.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !duration || !price || !formDoctorId) return;

    if (editingId) {
        updateReason(editingId, {
            title,
            duration: parseInt(duration),
            price: parseInt(price),
            doctor_id: parseInt(formDoctorId)
        });
    } else {
        const newReason: AppointmentReason = {
            uuid: `r-${Date.now()}`,
            title,
            duration: parseInt(duration),
            price: parseInt(price),
            doctor_id: parseInt(formDoctorId)
        };
        addReason(newReason);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('آیا از حذف این خدمت اطمینان دارید؟')) {
          deleteReason(id);
      }
  };

  // Helper to check permission
  const canEditPrice = (doctorId: number) => {
      const doc = doctors.find(d => d.id === doctorId);
      return doc?.permissions?.allowServicePriceEdit ?? true; // Default to true if undefined
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">خدمات و تعرفه‌ها</h2>
           <p className="text-gray-500 mt-1">مدیریت لیست خدمات و قیمت‌گذاری برای پزشکان</p>
        </div>
        <button 
            onClick={handleAddNew}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all"
        >
            <Plus size={20} />
            <span>تعریف خدمت جدید</span>
        </button>
      </div>

       <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
          {/* Doctor Filter */}
          {allowedDoctors.length > 1 && (
             <div className="relative w-full md:w-56">
                 <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <select
                     className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none cursor-pointer"
                     value={filterDoctorId}
                     onChange={(e) => setFilterDoctorId(e.target.value)}
                 >
                     <option value="all">همه پزشکان</option>
                     {allowedDoctors.map(d => (
                         <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                 </select>
                 <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
             </div>
          )}

          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
               type="text" 
               placeholder="جستجوی نام خدمت..." 
               className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReasons.map(reason => {
              const docName = doctors.find(d => d.id === reason.doctor_id)?.name || 'ناشناس';
              const isEditable = canEditPrice(reason.doctor_id);

              return (
                <div key={reason.uuid} className="glass-card p-6 rounded-2xl border hover:border-primary-200 transition-all group relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                            <Stethoscope size={24} />
                        </div>
                        <div className="flex gap-2">
                            {isEditable ? (
                                <button 
                                    onClick={() => handleEditClick(reason)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Edit size={18} />
                                </button>
                            ) : (
                                <div className="p-2 text-gray-300" title="ویرایش محدود شده توسط پزشک">
                                    <Lock size={18} />
                                </div>
                            )}
                            
                            {isEditable && (
                                <button 
                                    onClick={() => handleDelete(reason.uuid)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{reason.title}</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Coins size={16} className="text-gray-400" />
                            <span className="text-sm">هزینه: <span className="font-bold text-gray-800">{formatCurrency(reason.price)}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock size={16} className="text-gray-400" />
                            <span className="text-sm">مدت زمان: <span className="font-bold text-gray-800">{reason.duration} دقیقه</span></span>
                        </div>
                        {allowedDoctors.length > 1 && (
                            <div className="flex items-center gap-2 text-gray-500 pt-2 border-t border-gray-100 mt-2">
                                <Stethoscope size={14} className="text-gray-400" />
                                <span className="text-xs">{docName}</span>
                            </div>
                        )}
                    </div>
                </div>
              );
          })}
          
          {filteredReasons.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                  خدمتی با این مشخصات یافت نشد.
              </div>
          )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in !mt-0">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
               <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                   <h3 className="text-lg font-bold text-gray-800">
                       {editingId ? 'ویرایش خدمت' : 'تعریف خدمت جدید'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
               </div>
               
               <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block mb-1">مربوط به پزشک</label>
                      <div className="relative">
                          <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <select
                              required
                              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 appearance-none"
                              value={formDoctorId}
                              onChange={(e) => setFormDoctorId(e.target.value)}
                              disabled={!!editingId && !canEditPrice(parseInt(formDoctorId))}
                          >
                              {allowedDoctors.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                   </div>

                   <div>
                       <label className="text-sm font-medium text-gray-700 block mb-1">عنوان خدمت</label>
                       <input 
                          required 
                          type="text" 
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
                          placeholder="مثلا: ویزیت متخصص"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="text-sm font-medium text-gray-700 block mb-1">هزینه (تومان)</label>
                       <input 
                          required 
                          type="number" 
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
                          placeholder="مثلا: 150000"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          readOnly={!!editingId && !canEditPrice(parseInt(formDoctorId))} // Also lock input if editing
                       />
                       {!!editingId && !canEditPrice(parseInt(formDoctorId)) && (
                           <p className="text-xs text-red-500 mt-1">امکان تغییر قیمت توسط پزشک محدود شده است.</p>
                       )}
                   </div>
                   <div>
                       <label className="text-sm font-medium text-gray-700 block mb-1">مدت زمان تقریبی (دقیقه)</label>
                       <input 
                          required 
                          type="number" 
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
                          placeholder="15"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                       />
                   </div>
                   
                   <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold mt-2 shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2">
                       <Check size={20} />
                       {editingId ? 'ذخیره تغییرات' : 'افزودن خدمت'}
                   </button>
               </form>
           </div>
        </div>
      )}
    </div>
  );
};
