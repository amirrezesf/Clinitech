
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CloudDownload, Calendar, Clock, Database, Layers, RefreshCcw, CheckCircle, AlertTriangle, ChevronDown, FileJson, Server } from 'lucide-react';

// Mock Data for Checkpoints
const MOCK_CHECKPOINTS = [
    { id: 'cp-1', date: '2023-10-25T14:30:00', size: '15 MB', type: 'auto', description: 'پشتیبان‌گیری خودکار روزانه' },
    { id: 'cp-2', date: '2023-10-24T18:00:00', size: '14.8 MB', type: 'manual', description: 'قبل از تغییر تعرفه‌ها' },
    { id: 'cp-3', date: '2023-10-20T09:00:00', size: '14.2 MB', type: 'auto', description: 'پشتیبان‌گیری خودکار هفتگی' },
    { id: 'cp-4', date: '2023-10-15T23:00:00', size: '13.9 MB', type: 'auto', description: 'پشتیبان‌گیری خودکار روزانه' },
    { id: 'cp-5', date: '2023-10-01T12:00:00', size: '12.5 MB', type: 'system', description: 'نسخه اولیه مهر ماه' },
];

export const RestoreCheckpoints = () => {
    const navigate = useNavigate();
    const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    };

    const handleAction = (id: string, mode: 'merge' | 'replace') => {
        setOpenMenuId(null);
        setSelectedCheckpoint(id);
        
        const message = mode === 'replace' 
            ? 'آیا از جایگزینی کامل اطلاعات اطمینان دارید؟\n\nهشدار: تمام اطلاعات فعلی حذف و با این نسخه جایگزین می‌شود.'
            : 'آیا از ادغام اطلاعات اطمینان دارید؟\n\nاطلاعات این نسخه به داده‌های فعلی اضافه خواهد شد.';

        if(!confirm(message)) {
            setSelectedCheckpoint(null);
            return;
        }

        setIsProcessing(true);
        // Simulate API
        setTimeout(() => {
            setIsProcessing(false);
            const now = new Date();
            const dateStr = new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).format(now);
            
            localStorage.setItem('last_restore_date', dateStr);
            alert(mode === 'replace' ? 'اطلاعات با موفقیت جایگزین شد.' : 'اطلاعات با موفقیت ادغام شد.');
            navigate('/settings/clinic');
        }, 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/settings/clinic')} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                    <ArrowRight size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CloudDownload className="text-primary-600" size={28} />
                        بازیابی اطلاعات از سرور
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">نسخه مورد نظر را جهت بازیابی انتخاب کنید</p>
                </div>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden shadow-lg bg-white/80">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Server size={20} />
                        <span className="font-bold">لیست نقاط بازیابی (Checkpoints)</span>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {MOCK_CHECKPOINTS.map((cp) => (
                        <div key={cp.id} className={`p-6 transition-colors hover:bg-gray-50 ${selectedCheckpoint === cp.id ? 'bg-primary-50' : ''}`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                        cp.type === 'auto' ? 'bg-blue-100 text-blue-600' : 
                                        cp.type === 'manual' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{cp.description}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {formatDate(cp.date)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {formatTime(cp.date)}
                                            </span>
                                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md text-xs">
                                                <FileJson size={12} />
                                                {cp.size}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative w-full md:w-auto">
                                    <button 
                                        onClick={() => setOpenMenuId(openMenuId === cp.id ? null : cp.id)}
                                        disabled={isProcessing}
                                        className="w-full md:w-auto px-6 py-2.5 bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 rounded-xl flex items-center justify-center gap-2 transition-all font-bold shadow-sm"
                                    >
                                        {isProcessing && selectedCheckpoint === cp.id ? (
                                            <span className="animate-pulse">در حال انجام...</span>
                                        ) : (
                                            <>
                                                <span>انتخاب برای بازیابی</span>
                                                <ChevronDown size={16} className={`transition-transform ${openMenuId === cp.id ? 'rotate-180' : ''}`} />
                                            </>
                                        )}
                                    </button>

                                    {openMenuId === cp.id && !isProcessing && (
                                        <div className="absolute top-full left-0 right-0 md:right-0 md:left-auto mt-2 w-full md:w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <button 
                                                onClick={() => handleAction(cp.id, 'merge')}
                                                className="w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-3 transition-colors border-b border-gray-50 group"
                                            >
                                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <Layers size={18} />
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-gray-800 group-hover:text-indigo-700">ادغام (Merge)</span>
                                                    <span className="text-[10px] text-gray-400 group-hover:text-indigo-400">افزودن به داده‌های فعلی</span>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => handleAction(cp.id, 'replace')}
                                                className="w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors group"
                                            >
                                                <div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-white group-hover:text-red-500 group-hover:shadow-sm transition-all">
                                                    <RefreshCcw size={18} />
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-gray-800 group-hover:text-red-700">جایگزینی (Replace)</span>
                                                    <span className="text-[10px] text-gray-400 group-hover:text-red-400">حذف کامل داده‌های فعلی</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-sm">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <p>
                    توجه: عملیات بازیابی ممکن است چند دقیقه طول بکشد. لطفا تا پایان عملیات صفحه را نبندید. 
                    در حالت "جایگزینی کامل"، تمام اطلاعات فعلی سیستم حذف شده و قابل برگشت نخواهد بود.
                </p>
            </div>
        </div>
    );
};
