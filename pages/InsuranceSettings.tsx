
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Trash2, Edit, X, ShieldCheck, Percent, Check, Stethoscope, ChevronDown } from 'lucide-react';
import { Insurance } from '../types';

export const InsuranceSettings = () => {
  const { insurances, addInsurance, updateInsurance, deleteInsurance, doctors } = useData();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));

  // Form State
  const [name, setName] = useState('');
  const [coveragePercent, setCoveragePercent] = useState('30');
  const [formDoctorId, setFormDoctorId] = useState<string>(''); // Empty means "All/General"

  const filteredInsurances = insurances.filter(i => {
      const matchSearch = i.name.includes(search);
      if (!matchSearch) return false;

      // Filter by dropdown logic
      if (filterDoctorId !== 'all') {
          // Show shared (no doctor_id) OR specific to selected doctor
          return !i.doctor_id || i.doctor_id === parseInt(filterDoctorId);
      }
      return true;
  });

  const handleEditClick = (insurance: Insurance) => {
    setEditingId(insurance.id);
    setName(insurance.name);
    setCoveragePercent(insurance.coverage_percent.toString());
    setFormDoctorId(insurance.doctor_id ? insurance.doctor_id.toString() : '');
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setName('');
    setCoveragePercent('30');
    setFormDoctorId(''); // Default to General
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !coveragePercent) return;

    const docId = formDoctorId ? parseInt(formDoctorId) : undefined;

    if (editingId) {
        updateInsurance(editingId, {
            name,
            coverage_percent: parseInt(coveragePercent),
            doctor_id: docId
        });
    } else {
        const newInsurance: Insurance = {
            id: `ins-${Date.now()}`,
            name,
            coverage_percent: parseInt(coveragePercent),
            doctor_id: docId
        };
        addInsurance(newInsurance);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('آیا از حذف این بیمه اطمینان دارید؟')) {
          deleteInsurance(id);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">طرف قرارداد بیمه</h2>
           <p className="text-gray-500 mt-1">مدیریت شرکت‌های بیمه و درصد پوشش آن‌ها</p>
        </div>
        <button 
            onClick={handleAddNew}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all"
        >
            <Plus size={20} />
            <span>افزودن بیمه جدید</span>
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
               placeholder="جستجوی نام بیمه..." 
               className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInsurances.map(ins => (
              <div key={ins.id} className="glass-card p-6 rounded-2xl border hover:border-primary-200 transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <ShieldCheck size={24} />
                      </div>
                      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(ins)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                              <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ins.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{ins.name}</h3>
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                          <Percent size={16} className="text-gray-400" />
                          <span className="text-sm">پوشش بیمه: <span className="font-bold text-gray-800">{ins.coverage_percent}٪</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                          <Stethoscope size={16} className="text-gray-400" />
                          <span className="text-sm">
                              {ins.doctor_id 
                                ? doctors.find(d => d.id === ins.doctor_id)?.name 
                                : 'عمومی (همه پزشکان)'}
                          </span>
                      </div>
                  </div>
              </div>
          ))}
          
          {filteredInsurances.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                  موردی یافت نشد
              </div>
          )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
               <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                   <h3 className="text-lg font-bold text-gray-800">
                       {editingId ? 'ویرایش بیمه' : 'افزودن بیمه جدید'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400" /></button>
               </div>
               
               <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block mb-1">مربوط به پزشک</label>
                      <div className="relative">
                          <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <select
                              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 appearance-none"
                              value={formDoctorId}
                              onChange={(e) => setFormDoctorId(e.target.value)}
                          >
                              <option value="">عمومی (همه پزشکان)</option>
                              {allowedDoctors.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                   </div>

                   <div>
                       <label className="text-sm font-medium text-gray-700 block mb-1">نام بیمه</label>
                       <input 
                          required 
                          type="text" 
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
                          placeholder="مثلا: تامین اجتماعی"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="text-sm font-medium text-gray-700 block mb-1">درصد پوشش هزینه</label>
                       <input 
                          required 
                          type="number"
                          min="0"
                          max="100"
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
                          placeholder="مثلا: 30"
                          value={coveragePercent}
                          onChange={(e) => setCoveragePercent(e.target.value)}
                       />
                       <p className="text-xs text-gray-400 mt-1">مقدار 0 به معنی بیمه آزاد و 100 به معنی رایگان برای بیمار است.</p>
                   </div>
                   
                   <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold mt-2 shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2">
                       <Check size={20} />
                       {editingId ? 'ذخیره تغییرات' : 'افزودن'}
                   </button>
               </form>
           </div>
        </div>
      )}
    </div>
  );
};
