
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  Save, MessageSquare, Settings, Bell, CheckCircle, AlertTriangle, 
  Send, RefreshCw, Smartphone, Webhook, Shuffle, DollarSign, 
  Plus, Trash2, Edit, X, Calendar, Clock, ChevronDown, Stethoscope,
  Info, LayoutTemplate, Zap, History, Power, PowerOff
} from 'lucide-react';
import { DoctorSmsTemplate } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { PersianDatePicker } from '../components/PersianDatePicker';

export const SmsSettings = () => {
  const { doctors, doctorSmsTemplates, addSmsTemplate, updateSmsTemplate, deleteSmsTemplate } = useData();
  const { user } = useAuth();
  
  const allowedDoctors = doctors.filter(d => user?.allowedDoctorIds?.includes(d.id));
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(allowedDoctors[0]?.id.toString() || '');

  const [activeTab, setActiveTab] = useState<'config' | 'templates'>('templates');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DoctorSmsTemplate | null>(null);

  const [formData, setFormData] = useState<Partial<DoctorSmsTemplate>>({
      title: '', text: '', triggerType: 'before_appointment', offsetValue: 1, offsetUnit: 'days', specificDate: '', event: 'on_booking', enabled: true
  });

  const filteredTemplates = useMemo(() => {
      return doctorSmsTemplates.filter(t => t.doctor_id === parseInt(selectedDoctorId));
  }, [doctorSmsTemplates, selectedDoctorId]);

  const handleOpenAdd = () => {
      setEditingTemplate(null);
      setFormData({ title: '', text: '', triggerType: 'before_appointment', offsetValue: 1, offsetUnit: 'days', specificDate: '', event: 'on_booking', enabled: true });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (t: DoctorSmsTemplate) => {
      setEditingTemplate(t);
      setFormData({ ...t });
      setIsModalOpen(true);
  };

  const toggleTemplateStatus = async (template: DoctorSmsTemplate) => {
      const newStatus = !template.enabled;
      await updateSmsTemplate(template.uuid, { enabled: newStatus });
      toast.success(newStatus ? `قالب "${template.title}" فعال شد.` : `قالب "${template.title}" غیرفعال شد.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.text) {
          toast.error('لطفا عنوان و متن پیامک را وارد کنید.');
          return;
      }

      const templateData: DoctorSmsTemplate = {
          uuid: editingTemplate?.uuid || `sms-${Date.now()}`,
          doctor_id: parseInt(selectedDoctorId),
          title: formData.title!,
          text: formData.text!,
          triggerType: formData.triggerType as any,
          offsetValue: formData.offsetValue,
          offsetUnit: formData.offsetUnit as any,
          specificDate: formData.specificDate,
          event: formData.event as any,
          enabled: formData.enabled ?? true
      };

      if (editingTemplate) {
          await updateSmsTemplate(editingTemplate.uuid, templateData);
          toast.success('قالب پیامک بروزرسانی شد.');
      } else {
          await addSmsTemplate(templateData);
          toast.success('قالب پیامک جدید اضافه شد.');
      }
      setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
      if (confirm('آیا از حذف این قالب پیامک اطمینان دارید؟')) {
          await deleteSmsTemplate(id);
          toast.success('قالب حذف شد.');
      }
  };

  const availableVariables = [
      { key: '{patient_name}', label: 'نام بیمار' },
      { key: '{date}', label: 'تاریخ' },
      { key: '{time}', label: 'ساعت' },
      { key: '{doctor_name}', label: 'نام پزشک' },
      { key: '{clinic_name}', label: 'نام مطب' },
  ];

  const insertVariable = (variable: string) => {
      setFormData(prev => ({ ...prev, text: (prev.text || '') + ' ' + variable }));
  };

  const getTriggerLabel = (t: DoctorSmsTemplate) => {
      if (t.triggerType === 'before_appointment') return `${t.offsetValue} ${t.offsetUnit === 'days' ? 'روز' : t.offsetUnit === 'hours' ? 'ساعت' : 'هفته'} قبل از نوبت`;
      if (t.triggerType === 'after_appointment') return `${t.offsetValue} ${t.offsetUnit === 'days' ? 'روز' : 'ساعت'} بعد از نوبت`;
      if (t.triggerType === 'specific_date') return `در تاریخ خاص: ${t.specificDate}`;
      if (t.triggerType === 'event_based') {
          if (t.event === 'on_booking') return 'بلافاصله پس از ثبت نوبت';
          if (t.event === 'on_cancel') return 'هنگام لغو نوبت';
          if (t.event === 'on_no_show') return 'در صورت عدم حضور (No-Show)';
      }
      return 'نامشخص';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="text-primary-600" size={28} />
              اتوماسیون پیامکی پزشکان
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-bold">ارسال خودکار پیامک بر اساس رویدادها و زمان‌بندی‌ها</p>
        </div>
        
        {allowedDoctors.length > 1 && (
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-1.5 flex items-center gap-3">
                <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-xl"><Stethoscope size={20} /></div>
                <select className="bg-transparent pr-2 pl-8 py-1.5 text-sm font-black text-gray-700 dark:text-gray-200 outline-none appearance-none cursor-pointer" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                    {allowedDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
        )}
      </div>

      <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('templates')} className={clsx("px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2", activeTab === 'templates' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}><LayoutTemplate size={18} /> قالب‌های خودکار</button>
          <button onClick={() => setActiveTab('config')} className={clsx("px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2", activeTab === 'config' ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}><Settings size={18} /> تنظیمات درگاه</button>
      </div>

      {activeTab === 'templates' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-3">
                      <div className="p-1.5 bg-blue-600 text-white rounded-lg"><Zap size={20} /></div>
                      قوانین ارسال هوشمند
                  </h3>
                  <button onClick={handleOpenAdd} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all text-sm font-bold">
                      <Plus size={18} /> افزودن قانون جدید
                  </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredTemplates.length > 0 ? filteredTemplates.map(template => (
                      <div key={template.uuid} className={clsx("glass-card p-6 rounded-[2.5rem] border transition-all group relative overflow-hidden", template.enabled ? "border-primary-100 dark:border-primary-900/40 shadow-lg" : "border-gray-100 dark:border-gray-800 opacity-80 grayscale-[0.5]")}>
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className={clsx("p-3 rounded-2xl transition-colors", template.enabled ? "bg-primary-100 dark:bg-primary-900/50 text-primary-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400")}>
                                      {template.triggerType === 'event_based' ? <History size={24} /> : <Calendar size={24} />}
                                  </div>
                                  <div>
                                      <h4 className="font-black text-gray-800 dark:text-white">{template.title}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                              <Clock size={12} /> {getTriggerLabel(template)}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <label className="relative inline-flex items-center cursor-pointer" title={template.enabled ? 'غیرفعال کردن' : 'فعال کردن'}>
                                      <input 
                                          type="checkbox" 
                                          className="sr-only peer" 
                                          checked={template.enabled}
                                          onChange={() => toggleTemplateStatus(template)}
                                      />
                                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-5 peer-checked:after:border-white relative"></div>
                                      <span className="mr-2 text-[10px] font-black text-gray-500 uppercase hidden sm:block">
                                          {template.enabled ? 'روشن' : 'خاموش'}
                                      </span>
                                  </label>
                                  <button onClick={() => handleOpenEdit(template)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="ویرایش متن"><Edit size={18}/></button>
                                  <button onClick={() => handleDelete(template.uuid)} className="p-2.5 text-gray-300 hover:text-red-500 rounded-xl transition-all" title="حذف"><Trash2 size={18}/></button>
                              </div>
                          </div>

                          <div className={clsx("p-5 rounded-2xl border transition-all", template.enabled ? "bg-white dark:bg-gray-800/80 border-primary-50 dark:border-primary-900/20" : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800")}>
                              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">{template.text}</p>
                          </div>

                          <div className="mt-4 flex justify-between items-center px-1">
                              <div className="flex items-center gap-2">
                                <div className={clsx("w-2 h-2 rounded-full", template.enabled ? "bg-green-500 animate-pulse" : "bg-gray-300")}></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase">{template.enabled ? 'آماده ارسال خودکار' : 'غیرفعال شده'}</span>
                              </div>
                              <div className="text-[9px] font-black text-gray-300 uppercase">Template ID: {template.uuid.split('-')[1] || '---'}</div>
                          </div>
                      </div>
                  )) : (
                      <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/40 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
                          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-400 font-black">هنوز هیچ قالب پیامکی تعریف نشده است.</p>
                      </div>
                  )}
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="lg:col-span-1 space-y-6">
                  <div className="glass-card p-6 rounded-[2rem] border-t-4 border-primary-500">
                      <div className="flex items-center justify-between mb-6">
                          <h3 className="font-black text-gray-800 dark:text-white">وضعیت اعتبار</h3>
                          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-black"><CheckCircle size={10} /> متصل</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl flex justify-between items-center border border-gray-100 dark:border-gray-700 shadow-inner">
                          <span className="text-xs font-bold text-gray-500">مانده اعتبار (تومان)</span>
                          <span className="text-lg font-black text-gray-800 dark:text-white">۱۵۰,۰۰۰</span>
                      </div>
                      <button className="w-full mt-4 py-3 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-2"><DollarSign size={16} /> شارژ آنلاین پنل</button>
                  </div>
              </div>
              <div className="lg:col-span-2 glass-card p-8 rounded-[2rem]">
                  <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6 flex items-center gap-3"><Settings size={20} className="text-gray-400" /> تنظیمات درگاه پیامک کلینیک</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">ارائه‌دهنده سرویس</label><select className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold"><option>کاوه نگار (KavehNegar)</option><option>مگفا (Magfa)</option><option>SMS.ir</option></select></div>
                      <div className="space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">شماره خط فرستنده</label><input type="text" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold dir-ltr text-right" defaultValue="100020003000" /></div>
                      <div className="space-y-1 md:col-span-2"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">کلید دسترسی (API Key)</label><input type="password" className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white font-bold dir-ltr text-right" defaultValue="564A614E3268474C6543503D" /></div>
                  </div>
                  <div className="mt-8 flex justify-end"><button className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-primary-600/20 flex items-center gap-2 hover:bg-primary-700 transition-all"><Save size={20} /> ذخیره تنظیمات</button></div>
              </div>
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 !mt-0">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                  <div className="bg-primary-600 p-8 text-white relative shrink-0">
                      <button onClick={() => setIsModalOpen(false)} className="absolute top-6 left-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X size={20} /></button>
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><Zap size={32} /></div>
                          <div><h3 className="text-2xl font-black">{editingTemplate ? 'ویرایش قانون ارسال' : 'تعریف قانون جدید'}</h3><p className="opacity-80 text-sm mt-1 font-bold">زمان‌بندی و محتوای پیام را مشخص کنید</p></div>
                      </div>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Zap size={14} className="text-primary-500" /> عنوان قانون</label>
                              <input required className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary-500 outline-none transition-all dark:text-white font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">نوع محرک (Trigger)</label><div className="relative"><select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none appearance-none font-bold dark:text-white" value={formData.triggerType} onChange={e => setFormData({...formData, triggerType: e.target.value as any})}><option value="before_appointment">قبل از زمان نوبت</option><option value="after_appointment">بعد از انجام ویزیت</option><option value="specific_date">در تاریخ خاص (یک بار)</option><option value="event_based">بر اساس رویدادهای سیستم</option></select><ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div></div>
                              {formData.triggerType === 'before_appointment' || formData.triggerType === 'after_appointment' ? (<div className="flex gap-2"><div className="flex-1 space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">فاصله</label><input type="number" min="1" className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none font-black dark:text-white" value={formData.offsetValue} onChange={e => setFormData({...formData, offsetValue: parseInt(e.target.value)})} /></div><div className="flex-1 space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">واحد</label><select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white" value={formData.offsetUnit} onChange={e => setFormData({...formData, offsetUnit: e.target.value as any})}><option value="hours">ساعت</option><option value="days">روز</option><option value="weeks">هفته</option></select></div></div>) : formData.triggerType === 'specific_date' ? (<div className="space-y-1"><PersianDatePicker label="تاریخ ارسال" value={formData.specificDate || ''} onChange={d => setFormData({...formData, specificDate: d})} /></div>) : (<div className="space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">رویداد مربوطه</label><select className="w-full p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none font-bold dark:text-white" value={formData.event} onChange={e => setFormData({...formData, event: e.target.value as any})}><option value="on_booking">هنگام رزرو نوبت</option><option value="on_cancel">هنگام لغو نوبت</option><option value="on_no_show">ثبت عدم حضور (No-Show)</option></select></div>)}
                          </div>
                          <div className="space-y-1"><label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center justify-between"><span>متن پیامک</span><span className={clsx("font-bold", (formData.text?.length || 0) > 70 ? "text-amber-500" : "text-gray-400")}>{formData.text?.length || 0} کاراکتر (صفحه {Math.ceil((formData.text?.length || 0) / 70)})</span></label><textarea required className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[1.5rem] outline-none focus:border-primary-500 transition-all dark:text-white min-h-[120px] resize-none text-sm leading-relaxed" value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} /></div>
                          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">درج متغیرها:</label><div className="flex flex-wrap gap-2">{availableVariables.map(v => (<button key={v.key} type="button" onClick={() => insertVariable(v.key)} className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-[10px] font-black hover:bg-primary-50 hover:text-primary-600 transition-all shadow-sm">{v.label}</button>))}</div></div>
                      </div>
                      <div className="flex gap-4 pt-4 shrink-0"><button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-3"><CheckCircle size={24} /> <span>ثبت نهایی</span></button><button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all">انصراف</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
