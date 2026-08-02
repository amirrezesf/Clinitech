
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Mail, Phone, Shield, ArrowRight, Smartphone } from 'lucide-react';
import { User as UserType } from '../types';
import { useAppDispatch } from '../hooks/redux';
import { registerUser } from '../store/authSlice';

export const Register = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    role: 'doctor' as 'doctor' | 'secretary'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generatePassword = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    setLoading(true);

    // Generate random password
    const tempPassword = generatePassword();

    const newUser: UserType = {
        fullName: formData.fullName,
        username: formData.username,
        password: tempPassword,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role
    };

    try {
      const resultAction = await dispatch(registerUser(newUser));
      
      if (registerUser.fulfilled.match(resultAction)) {
        alert(`کاربر جدید با موفقیت ایجاد شد.\n\nرمز عبور موقت به شماره ${formData.phoneNumber} ارسال شد: ${tempPassword}`);
        navigate('/login');
      } else {
        if (resultAction.payload) {
            setError(resultAction.payload as string);
        } else {
            setError('خطایی رخ داد.');
        }
      }
    } catch (err) {
      setError('خطایی در ثبت نام رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-2xl p-8 rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-300 my-8">
        <div className="flex items-center gap-4 mb-8">
             <Link to="/login" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors">
                <ArrowRight size={24} />
             </Link>
             <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ایجاد حساب کاربری</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">اطلاعات همکار جدید را وارد کنید</p>
             </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300">نام کامل</label>
                 <div className="relative">
                   <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input 
                     type="text" 
                     className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400"
                     value={formData.fullName}
                     onChange={e => setFormData({...formData, fullName: e.target.value})}
                     required
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300">نام کاربری</label>
                 <div className="relative">
                   <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input 
                     type="text" 
                     className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr"
                     value={formData.username}
                     onChange={e => setFormData({...formData, username: e.target.value})}
                     required
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300">نقش سیستم</label>
                 <div className="relative">
                   <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <select 
                     className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all appearance-none cursor-pointer placeholder-gray-400"
                     value={formData.role}
                     onChange={e => setFormData({...formData, role: e.target.value as any})}
                   >
                     <option value="doctor">پزشک</option>
                     <option value="secretary">منشی</option>
                   </select>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300">شماره موبایل</label>
                 <div className="relative">
                   <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input 
                     type="tel" 
                     className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr"
                     value={formData.phoneNumber}
                     onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                     required
                   />
                 </div>
               </div>

               <div className="space-y-2 md:col-span-2">
                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300">ایمیل (اختیاری)</label>
                 <div className="relative">
                   <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input 
                     type="email" 
                     className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:border-primary-500 rounded-xl outline-none transition-all placeholder-gray-400 dir-ltr"
                     value={formData.email}
                     onChange={e => setFormData({...formData, email: e.target.value})}
                   />
                 </div>
               </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800 dark:text-blue-200">
             <Smartphone size={20} className="shrink-0 mt-0.5" />
             <p>
                 پس از ثبت نام، رمز عبور موقت به صورت خودکار تولید و برای کاربر پیامک خواهد شد.
             </p>
          </div>

          <div className="pt-4">
            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                    <>
                        <UserPlus size={20} />
                        <span>ثبت کاربر و ارسال رمز</span>
                    </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
