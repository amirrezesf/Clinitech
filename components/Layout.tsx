
import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationDropdown } from './NotificationDropdown';
import { Menu, Search, ChevronDown, LogOut, User, Moon, Sun, Palette } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { logout } from '../store/authSlice';
import { toggleTheme } from '../store/themeSlice';
import clsx from 'clsx';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const themeMode = useAppSelector(state => state.theme.mode);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  const getTitle = () => {
    switch(location.pathname) {
      case '/': return 'داشبورد مدیریتی';
      case '/today': return 'نوبت‌های امروز';
      case '/calendar': return 'تقویم کاری';
      case '/appointments': return 'مدیریت نوبت‌ها';
      case '/patients': return 'بیماران';
      case '/profile': return 'پروفایل کاربری';
      case '/accounting': return 'حسابداری';
      case '/doctors': return 'پزشکان';
      case '/notifications': return 'اعلان‌های سیستم';
      case '/settings/secretaries': return 'مدیریت منشی‌ها';
      case '/settings/personalization': return 'شخصی‌سازی سیستم';
      default: return 'Health-Ease';
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300 w-full max-w-full">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggle={() => setSidebarOpen(!sidebarOpen)} 
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      
      <main className={clsx(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full max-w-full min-w-0",
        isCollapsed ? "md:mr-20" : "md:mr-64"
      )}>
        {/* Sticky Header */}
        <header className="h-16 sm:h-20 bg-white/85 dark:bg-gray-800/85 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between shadow-xs border-b border-gray-200/60 dark:border-gray-700/60 w-full max-w-full min-w-0">
           <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0">
               <Menu size={22} />
             </button>
             <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white truncate">{getTitle()}</h2>
           </div>

           <div className="flex items-center gap-1 sm:gap-4 shrink-0">
             {/* Search Bar - Hidden on mobile */}
             <div className="hidden lg:flex items-center bg-gray-100/50 dark:bg-gray-700/50 rounded-xl px-4 py-2 border border-gray-200/50 dark:border-gray-600/50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
               <Search size={18} className="text-gray-400 dark:text-gray-300 ml-2" />
               <input 
                  type="text" 
                  placeholder="جستجو در سامانه..." 
                  className="bg-transparent border-none focus:outline-none text-sm w-48 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500" 
               />
             </div>

             <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Theme Toggle */}
                <button 
                    onClick={() => dispatch(toggleTheme())}
                    className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    title={themeMode === 'light' ? 'حالت شب' : 'حالت روز'}
                >
                    {themeMode === 'light' ? <Moon size={18} className="sm:w-5 sm:h-5" /> : <Sun size={18} className="sm:w-5 sm:h-5" />}
                </button>

                <NotificationDropdown />
             </div>
             
             {/* Profile Dropdown */}
             <div className="relative" ref={dropdownRef}>
               <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-3 ps-1.5 sm:ps-4 border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 p-1 sm:p-1.5 rounded-xl transition-all group outline-none"
               >
                 <div className="text-left hidden sm:block">
                   <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-emerald-700 transition-colors">{user?.fullName || 'کاربر'}</p>
                   <p className="text-[10px] text-gray-500 dark:text-gray-400 dir-ltr text-right">{user?.role === 'doctor' ? 'پزشک متخصص' : 'مدیر داخلی'}</p>
                 </div>
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-300 p-0.5 shadow-sm shrink-0">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-600 font-bold text-xs sm:text-base">
                      {user?.fullName?.charAt(0) || 'U'}
                    </div>
                 </div>
                 <ChevronDown size={14} className={clsx("text-gray-400 transition-transform duration-300 sm:w-4 sm:h-4", isDropdownOpen && "rotate-180")} />
               </button>

               {/* Dropdown Menu */}
               {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 sm:hidden text-center bg-gray-50/50 dark:bg-gray-700/50">
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{user?.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dir-ltr">@{user?.username}</p>
                      </div>
                      
                      <Link 
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-gray-700"
                      >
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                             <User size={16} />
                          </div>
                          <span className="font-medium">پروفایل کاربری</span>
                      </Link>

                      <Link 
                        to="/settings/personalization"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-gray-700"
                      >
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                             <Palette size={16} />
                          </div>
                          <span className="font-medium">شخصی سازی</span>
                      </Link>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                      >
                          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                             <LogOut size={16} />
                          </div>
                          <span className="font-medium">خروج از حساب</span>
                      </button>
                  </div>
               )}
             </div>
           </div>
        </header>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto w-full max-w-full min-w-0 flex-1">
           {children}
        </div>
      </main>
    </div>
  );
};
