
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Gavel, Check, Lock, Unlock, ChevronDown, ShieldAlert, Save } from 'lucide-react';
import { Doctor, DoctorPermissions } from '../types';

export const DoctorRules = () => {
  const { doctors, updateDoctor } = useData();
  const { user } = useAuth();
  
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');
  const [permissions, setPermissions] = useState<DoctorPermissions | null>(null);

  const selectedDoctor = doctors.find(d => d.id === parseInt(selectedDoctorId));

  useEffect(() => {
      if (selectedDoctor) {
          // Initialize permissions if missing in old data, or use existing
          setPermissions(selectedDoctor.permissions || {
              allowServicePriceEdit: true,
              allowAppointmentDelete: true,
              allowManualDiscount: true
          });
      }
  }, [selectedDoctorId, doctors]);

  const handleToggle = (key: keyof DoctorPermissions) => {
      if (permissions) {
          setPermissions(prev => prev ? ({ ...prev, [key]: !prev[key] }) : null);
      }
  };

  const handleSave = () => {
      if (selectedDoctor && permissions) {
          updateDoctor(selectedDoctor.id, { permissions });
          alert(`قوانین مربوط به ${selectedDoctor.name} با موفقیت بروزرسانی شد.`);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <Gavel size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">قوانین و دسترسی‌ها</h2>
                <p className="text-gray-500 mt-1">تعیین حدود اختیارات منشی برای هر پزشک</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar / Doctor Selection */}
          <div className="lg:col-span-1">
              <div className="glass-card p-6 rounded-3xl sticky top-24">
                  <label className="text-sm font-bold text-gray-700 block mb-2">انتخاب پزشک</label>
                  <div className="relative">
                      <Stethoscope className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <select
                          className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary-500 appearance-none cursor-pointer font-medium"
                          value={selectedDoctorId}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                      >
                          {allowedDoctors.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  
                  {selectedDoctor && (
                      <div className="mt-6 text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-gray-400 text-2xl font-bold border-4 border-white shadow-sm mb-3">
                              {selectedDoctor.name.charAt(0)}
                          </div>
                          <h3 className="font-bold text-gray-800">{selectedDoctor.name}</h3>
                          <p className="text-sm text-primary-600">{selectedDoctor.specialty}</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Permissions Form */}
          <div className="lg:col-span-2">
              <div className="glass-card rounded-3xl overflow-hidden">
                  <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex items-center gap-2 text-purple-800">
                      <ShieldAlert size={20} />
                      <span className="font-bold text-sm">لیست مجوزهای قابل تنظیم</span>
                  </div>
                  
                  {permissions ? (
                      <div className="p-6 space-y-4">
                          {/* Rule 1: Edit Price */}
                          <div className={`p-4 rounded-xl border transition-all ${permissions.allowServicePriceEdit ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${permissions.allowServicePriceEdit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                          {permissions.allowServicePriceEdit ? <Unlock size={20} /> : <Lock size={20} />}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-800">ویرایش تعرفه خدمات</h4>
                                          <p className="text-xs text-gray-500 mt-1">امکان تغییر قیمت خدمات هنگام تعریف یا ویرایش</p>
                                      </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={permissions.allowServicePriceEdit}
                                        onChange={() => handleToggle('allowServicePriceEdit')}
                                      />
                                      <div className="w-11 h-6 bg-gray-200 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-5 peer-checked:after:border-white"></div>
                                  </label>
                              </div>
                          </div>

                          {/* Rule 2: Delete Appointment */}
                          <div className={`p-4 rounded-xl border transition-all ${permissions.allowAppointmentDelete ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${permissions.allowAppointmentDelete ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                          {permissions.allowAppointmentDelete ? <Unlock size={20} /> : <Lock size={20} />}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-800">حذف نوبت‌ها</h4>
                                          <p className="text-xs text-gray-500 mt-1">امکان حذف کامل یک نوبت از تقویم کاری</p>
                                      </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={permissions.allowAppointmentDelete}
                                        onChange={() => handleToggle('allowAppointmentDelete')}
                                      />
                                      <div className="w-11 h-6 bg-gray-200 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-5 peer-checked:after:border-white"></div>
                                  </label>
                              </div>
                          </div>

                          {/* Rule 3: Manual Discount */}
                          <div className={`p-4 rounded-xl border transition-all ${permissions.allowManualDiscount ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${permissions.allowManualDiscount ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                          {permissions.allowManualDiscount ? <Unlock size={20} /> : <Lock size={20} />}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-800">اعمال تخفیف دستی</h4>
                                          <p className="text-xs text-gray-500 mt-1">امکان ثبت تخفیف روی هزینه نوبت‌ها</p>
                                      </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={permissions.allowManualDiscount}
                                        onChange={() => handleToggle('allowManualDiscount')}
                                      />
                                      <div className="w-11 h-6 bg-gray-200 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-5 peer-checked:after:border-white"></div>
                                  </label>
                              </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
                              <button 
                                  onClick={handleSave}
                                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all font-bold"
                              >
                                  <Save size={20} />
                                  <span>ذخیره تغییرات</span>
                              </button>
                          </div>
                      </div>
                  ) : (
                      <div className="p-8 text-center text-gray-400">
                          لطفا یک پزشک را انتخاب کنید
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
