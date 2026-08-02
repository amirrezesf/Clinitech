
import React, { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useData } from '../context/DataContext';
import { updateSecretary, deleteSecretary, registerUser, createDefaultPermissions } from '../store/authSlice';
import { User, UserPermissions, AppModule, PermissionAction } from '../types';
import { 
    Users, UserPlus, Shield, Trash2, Edit, X, Check, Search, Phone, 
    ShieldCheck, Database, LayoutGrid, UserCheck, PlusCircle, 
    ChevronDown, ChevronUp, SlidersHorizontal, Activity, Lock,
    Eye, Plus, Save, Settings2
} from 'lucide-react';
import clsx from 'clsx';

const MODULES: { id: AppModule; label: string; icon: any }[] = [
    { id: 'appointments', label: 'مدیریت نوبت‌ها', icon: LayoutGrid },
    { id: 'patients', label: 'پرونده بیماران', icon: Users },
    { id: 'finances', label: 'امور مالی (درآمد/هزینه)', icon: Database },
    { id: 'services', label: 'خدمات و تعرفه‌ها', icon: SlidersHorizontal },
    { id: 'insurances', label: 'بیمه‌های طرف قرارداد', icon: ShieldCheck },
    { id: 'reports', label: 'گزارشات و حسابداری', icon: Activity },
];

const ACTIONS: { id: PermissionAction; label: string; icon: any }[] = [
    { id: 'read', label: 'مشاهده', icon: Eye },
    { id: 'create', label: 'ایجاد', icon: Plus },
    { id: 'update', label: 'ویرایش', icon: Edit },
    { id: 'delete', label: 'حذف', icon: Trash2 },
];

const MODULE_FIELDS: Record<AppModule, { id: string; label: string }[]> = {
    appointments: [
        { id: 'patient_phone', label: 'اطلاعات تماس بیمار' },
        { id: 'appointment_time', label: 'زمان‌بندی نوبت' },
        { id: 'service_type', label: 'سرویس‌های انتخابی' },
        { id: 'status_change', label: 'وضعیت حضور و غیاب' },
    ],
    patients: [
        { id: 'id_number', label: 'کد ملی بیمار' },
        { id: 'phone_number', label: 'شماره همراه بیمار' },
        { id: 'medical_history', label: 'سوابق پزشکی' },
        { id: 'private_notes', label: 'یادداشت‌های محرمانه' },
    ],
    finances: [
        { id: 'payment_amount', label: 'مبالغ پرداختی' },
        { id: 'discount_edit', label: 'تخفیفات دستی' },
        { id: 'receipt_image', label: 'تصاویر فیش بانکی' },
        { id: 'profit_reports', label: 'گزارش سود و زیان' },
    ],
    services: [
        { id: 'price_edit', label: 'قیمت‌گذاری خدمات' },
        { id: 'duration_edit', label: 'زمان تخمینی ویزیت' },
        { id: 'service_activation', label: 'وضعیت فعال بودن خدمت' },
    ],
    insurances: [
        { id: 'coverage_percent', label: 'درصد پوشش سازمان' },
        { id: 'insurance_name', label: 'نام سازمان بیمه‌گر' },
    ],
    reports: [
        { id: 'excel_export', label: 'خروجی اکسل داده‌ها' },
        { id: 'financial_summary', label: 'خلاصه حسابداری' },
        { id: 'audit_logs', label: 'لاگ‌های فعالیت سیستم' },
    ]
};

export const Secretaries = () => {
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector(state => state.auth.user);
    const secretaries = useAppSelector(state => state.auth.secretaries);
    const { doctors } = useData();

    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSecretary, setEditingSecretary] = useState<User | null>(null);
    const [isFromPool, setIsFromPool] = useState(false);
    const [expandedModule, setExpandedModule] = useState<AppModule | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        phoneNumber: '',
        email: '',
        allowedDoctorIds: [] as number[],
        permissions: createDefaultPermissions(false)
    });

    const clinicPool = useMemo(() => {
        if (currentUser?.role !== 'doctor') return [];
        const doctorId = currentUser.allowedDoctorIds?.[0];
        return secretaries.filter(s => !s.allowedDoctorIds?.includes(doctorId || -1));
    }, [secretaries, currentUser]);

    const filteredSecretaries = secretaries.filter(s => {
        const matchesSearch = s.fullName.includes(search) || s.username.includes(search);
        if (currentUser?.role === 'doctor') {
            const doctorId = currentUser.allowedDoctorIds?.[0];
            return matchesSearch && s.allowedDoctorIds?.includes(doctorId || -1);
        }
        return matchesSearch;
    });

    const handleOpenAdd = () => {
        setEditingSecretary(null);
        setIsFromPool(false);
        setExpandedModule(null);
        setFormData({
            fullName: '',
            username: '',
            phoneNumber: '',
            email: '',
            allowedDoctorIds: currentUser?.role === 'doctor' ? [currentUser.allowedDoctorIds![0]] : doctors.map(d => d.id),
            permissions: createDefaultPermissions(false)
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (s: User) => {
        setEditingSecretary(s);
        setIsFromPool(false);
        setExpandedModule(null);
        setFormData({
            fullName: s.fullName,
            username: s.username,
            phoneNumber: s.phoneNumber || '',
            email: s.email || '',
            allowedDoctorIds: s.allowedDoctorIds || [],
            permissions: s.permissions || createDefaultPermissions(false)
        });
        setIsModalOpen(true);
    };

    const handleDelete = (username: string) => {
        if (confirm('آیا از حذف این منشی اطمینان دارید؟')) {
            dispatch(deleteSecretary(username));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            allowedDoctorIds: formData.allowedDoctorIds,
            permissions: formData.permissions
        };

        if (editingSecretary || isFromPool) {
            dispatch(updateSecretary({ ...editingSecretary!, ...finalData }));
            setIsModalOpen(false);
        } else {
            const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
            const result = await dispatch(registerUser({ 
                ...finalData, 
                username: formData.username, 
                role: 'secretary', 
                password: tempPassword 
            }));
            if (registerUser.fulfilled.match(result)) {
                alert(`منشی جدید ایجاد شد.\nرمز عبور: ${tempPassword}`);
                setIsModalOpen(false);
            }
        }
    };

    const toggleModulePermission = (moduleId: AppModule, actionId: PermissionAction) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: {
                    ...prev.permissions[moduleId],
                    [actionId]: !prev.permissions[moduleId][actionId]
                }
            }
        }));
    };

    const toggleFieldPermission = (moduleId: AppModule, fieldId: string, actionId: PermissionAction) => {
        const currentFieldPerms = formData.permissions[moduleId].fields[fieldId] || { create: false, read: false, update: false, delete: false };
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: {
                    ...prev.permissions[moduleId],
                    fields: {
                        ...prev.permissions[moduleId].fields,
                        [fieldId]: {
                            ...currentFieldPerms,
                            [actionId]: !currentFieldPerms[actionId]
                        }
                    }
                }
            }
        }));
    };

    const toggleFullRow = (moduleId: AppModule, fieldId: string, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: {
                    ...prev.permissions[moduleId],
                    fields: {
                        ...prev.permissions[moduleId].fields,
                        [fieldId]: { create: value, read: value, update: value, delete: value }
                    }
                }
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Users className="text-primary-600" size={28} /> مدیریت منشی‌ها
                    </h2>
                    <p className="text-gray-500 mt-1">تنظیم سطوح دسترسی پیشرفته به صورت تفکیک شده</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all font-bold"
                >
                    <UserPlus size={20} /> <span>افزودن منشی جدید</span>
                </button>
            </div>

            <div className="glass-card p-4 rounded-xl no-print">
                <div className="relative max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="جستجو بر اساس نام..." 
                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredSecretaries.map(sec => (
                    <div key={sec.username} className="glass-card p-6 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xl border border-primary-100 dark:border-primary-800">
                                    {sec.fullName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{sec.fullName}</h3>
                                    <p className="text-sm text-gray-500 dir-ltr text-right">@{sec.username}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenEdit(sec)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(sec.username)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14} className="text-primary-500" /> ماژول‌های مجاز
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {MODULES.map(m => {
                                    const perms = sec.permissions?.[m.id];
                                    const hasAny = perms && (perms.read || perms.create || perms.update || perms.delete);
                                    if (!hasAny) return null;
                                    return <span key={m.id} className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-[9px] rounded-md font-bold">{m.label}</span>;
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in !mt-0">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-5xl max-h-[95vh] shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <ShieldCheck className="text-primary-600" /> 
                                {editingSecretary ? 'ویرایش مجوزهای منشی' : 'ثبت منشی جدید'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-primary-600 border-b border-primary-100 dark:border-primary-900/30 pb-1 flex items-center gap-2"><Database size={16} /> اطلاعات هویتی</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 mr-1">نام کامل</label><input required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 dark:text-white font-bold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 mr-1">نام کاربری</label><input required disabled={!!editingSecretary} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-primary-500 disabled:opacity-50 dark:text-white dir-ltr text-right font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-primary-100 dark:border-primary-900/30 pb-2">
                                    <h4 className="text-sm font-black text-primary-600 flex items-center gap-2"><Lock size={16} /> مدیریت ماتریسی دسترسی‌ها (Matrix Permissions)</h4>
                                    <div className="flex gap-4 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                        <span className="flex items-center gap-1"><Eye size={12}/> مشاهده</span>
                                        <span className="flex items-center gap-1"><Plus size={12}/> ایجاد</span>
                                        <span className="flex items-center gap-1"><Edit size={12}/> ویرایش</span>
                                        <span className="flex items-center gap-1"><Trash2 size={12}/> حذف</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {MODULES.map(m => {
                                        const isExpanded = expandedModule === m.id;
                                        const perms = formData.permissions[m.id];
                                        return (
                                            <div key={m.id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                                                <div 
                                                    onClick={() => setExpandedModule(isExpanded ? null : m.id)}
                                                    className={clsx(
                                                        "px-6 py-4 flex items-center justify-between cursor-pointer transition-colors",
                                                        isExpanded ? "bg-primary-50 dark:bg-primary-900/20" : "bg-white dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-primary-600"><m.icon size={20} /></div>
                                                        <span className="font-black text-sm text-gray-800 dark:text-white">{m.label}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-2 rounded-xl shadow-inner border border-gray-100 dark:border-gray-600">
                                                            <span className="text-[10px] font-black text-gray-400 ml-2">دسترسی کلی:</span>
                                                            {ACTIONS.map((a) => (
                                                                <label key={a.id} className="relative flex items-center cursor-pointer group/chk" title={a.label}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="sr-only peer" 
                                                                        checked={perms[a.id]} 
                                                                        onChange={() => toggleModulePermission(m.id, a.id)} 
                                                                    />
                                                                    <div className="w-5 h-5 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-md peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-all flex items-center justify-center">
                                                                        <Check size={12} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <button type="button" className="p-1 text-gray-400 hover:text-gray-600 transition-all">
                                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="bg-gray-50/50 dark:bg-gray-900/30 p-6 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-1">
                                                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                            <table className="w-full text-right text-xs">
                                                                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-black border-b border-gray-200 dark:border-gray-700">
                                                                    <tr>
                                                                        <th className="px-6 py-3 font-black">فیلد اختصاصی</th>
                                                                        {ACTIONS.map(a => (
                                                                            <th key={a.id} className="px-4 py-3 text-center">{a.label}</th>
                                                                        ))}
                                                                        <th className="px-4 py-3 text-center w-16">انتخاب کل</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                    {MODULE_FIELDS[m.id].map(field => {
                                                                        const fieldPerms = perms.fields[field.id] || { create: false, read: false, update: false, delete: false };
                                                                        const allSelected = fieldPerms.create && fieldPerms.read && fieldPerms.update && fieldPerms.delete;
                                                                        
                                                                        return (
                                                                            <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group/tr">
                                                                                <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{field.label}</td>
                                                                                {ACTIONS.map(a => (
                                                                                    <td key={a.id} className="px-4 py-4 text-center">
                                                                                        <label className="inline-flex items-center cursor-pointer">
                                                                                            <input 
                                                                                                type="checkbox" 
                                                                                                className="sr-only peer" 
                                                                                                checked={fieldPerms[a.id]} 
                                                                                                onChange={() => toggleFieldPermission(m.id, field.id, a.id)} 
                                                                                            />
                                                                                            <div className="w-6 h-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center transition-all peer-checked:bg-primary-600 peer-checked:border-primary-600 group-hover/tr:border-primary-200">
                                                                                                <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                                            </div>
                                                                                        </label>
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-4 py-4 text-center bg-gray-50/50 dark:bg-gray-900/30">
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => toggleFullRow(m.id, field.id, !allSelected)}
                                                                                        className={clsx(
                                                                                            "p-1.5 rounded-lg transition-all border",
                                                                                            allSelected ? "bg-primary-50 border-primary-200 text-primary-600" : "bg-white dark:bg-gray-800 text-gray-300 border-gray-200 dark:border-gray-600"
                                                                                        )}
                                                                                    >
                                                                                        <Settings2 size={14} />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </form>

                        <div className="px-10 py-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4 bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all font-bold">انصراف</button>
                            <button onClick={handleSubmit} className="px-12 py-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all font-black flex items-center gap-3 active:scale-[0.98]">
                                <Save size={22} /> <span>ذخیره نهایی دسترسی‌ها</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
