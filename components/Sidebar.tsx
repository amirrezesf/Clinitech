
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Stethoscope, 
  CreditCard, 
  Clock, 
  UserPlus,
  Menu,
  Settings,
  MessageSquare,
  Calculator,
  ShieldCheck,
  Receipt,
  UserCog,
  FileClock,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelRightClose,
  Activity,
  PlayCircle,
  Bell
} from 'lucide-react';
import clsx from 'clsx';
import { useAppSelector } from '../hooks/redux';

const NAV_SECTIONS = [
  {
    title: 'میز کار',
    items: [
      { icon: LayoutDashboard, label: 'داشبورد', path: '/' },
      { icon: PlayCircle, label: 'ویزیت جاری', path: '/doctor/visit', doctorOnly: true },
      { icon: Bell, label: 'اعلان‌های سیستم', path: '/notifications' },
      { icon: Clock, label: 'لیست نوبت‌ها', path: '/today' },
      { icon: CalendarDays, label: 'تقویم کاری', path: '/calendar' },
    ]
  },
  {
    title: 'پذیرش و بیماران',
    items: [
      { icon: UserPlus, label: 'نوبت جدید', path: '/appointment/new' },
      { icon: Users, label: 'پرونده بیماران', path: '/patients' },
    ]
  },
  {
    title: 'امور مالی',
    items: [
      { icon: CreditCard, label: 'صندوق و اقساط', path: '/payments' },
      { icon: Receipt, label: 'هزینه‌ها', path: '/expenses' },
      { icon: Calculator, label: 'گزارش حسابداری', path: '/accounting' },
    ]
  },
  {
    title: 'تنظیمات سیستم',
    items: [
      { icon: UserCog, label: 'تنظیمات پزشک', path: '/doctor/settings', doctorOnly: true },
      { icon: UserCog, label: 'پزشکان کلینیک', path: '/doctors' },
      { icon: ShieldAlert, label: 'مدیریت منشی‌ها', path: '/settings/secretaries', doctorOnly: true },
      { icon: Stethoscope, label: 'خدمات و تعرفه‌ها', path: '/settings/reasons' },
      { icon: ShieldCheck, label: 'بیمه‌های طرف قرارداد', path: '/settings/insurance' },
      { icon: MessageSquare, label: 'پنل پیامک', path: '/settings/sms' },
      { icon: FileClock, label: 'گزارش عملکرد', path: '/settings/audit-log', doctorOnly: true },
      { icon: Settings, label: 'اطلاعات مطب', path: '/settings/clinic' },
    ]
  }
];

interface SidebarProps {
  isOpen: boolean; // Mobile visible
  toggle: () => void; // Mobile toggle
  isCollapsed: boolean; // Desktop width state
  toggleCollapse: () => void; // Desktop width toggle
}

export const Sidebar = ({ isOpen, toggle, isCollapsed, toggleCollapse }: SidebarProps) => {
  const location = useLocation();
  const user = useAppSelector(state => state.auth.user);
  const isDoctor = user?.role === 'doctor';

  const isDesktopCollapsed = isCollapsed && !isOpen;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          "fixed top-0 right-0 z-50 h-full glass border-l border-white/40 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col",
          // Mobile state
          isOpen ? "translate-x-0 shadow-2xl w-64" : "translate-x-full md:translate-x-0",
          // Desktop state
          !isOpen && (isCollapsed ? "md:w-20" : "md:w-64")
        )}
      >
        {/* Header */}
        <div className={clsx(
          "flex h-20 items-center border-b border-white/30 dark:border-gray-700 shrink-0 px-4 transition-all duration-300",
          isDesktopCollapsed ? "justify-center" : "justify-between"
        )}>
          <Link to="/" className="flex items-center gap-3 overflow-hidden group/logo">
             <div className={clsx(
               "shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover/logo:scale-105 transition-transform duration-300",
               isDesktopCollapsed ? "mx-auto" : ""
             )}>
                <Activity size={24} strokeWidth={2.5} />
             </div>
             {!isDesktopCollapsed && (
               <h1 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-right-4 duration-500">
                 Health-Ease
               </h1>
             )}
          </Link>
          
          {/* Desktop Toggle Button */}
          {!isDesktopCollapsed && (
            <button 
              onClick={toggleCollapse} 
              className="hidden md:flex p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="جمع کردن منو"
            >
              <PanelRightClose size={20} />
            </button>
          )}

          {/* Mobile Close Button */}
          <button onClick={toggle} className="md:hidden text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <Menu size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-6 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {isDesktopCollapsed && (
            <button 
              onClick={toggleCollapse}
              className="w-full flex justify-center p-3 mb-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-2xl transition-all"
              title="گسترش منو"
            >
              <PanelLeftClose size={22} />
            </button>
          )}

          {NAV_SECTIONS.map((section, idx) => {
            const visibleItems = section.items.filter(item => {
                if (item.doctorOnly && !isDoctor) return false;
                return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                {!isDesktopCollapsed ? (
                  <h3 className="px-4 text-[10px] font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest animate-in fade-in">
                    {section.title}
                  </h3>
                ) : (
                  <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4 mx-2" />
                )}
                
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => window.innerWidth < 768 && toggle()}
                        className={clsx(
                          "flex items-center rounded-2xl transition-all duration-300 group relative",
                          isDesktopCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                          isActive 
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold shadow-sm" 
                            : "text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                        title={isDesktopCollapsed ? item.label : undefined}
                      >
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-l-full" />
                        )}
                        <Icon size={22} className={clsx("transition-transform group-hover:scale-110 shrink-0", isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-gray-500 group-hover:text-primary-500")} />
                        {!isDesktopCollapsed && (
                          <span className="text-sm whitespace-nowrap overflow-hidden animate-in slide-in-from-right-2">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        
        {/* Footer Info */}
        {!isDesktopCollapsed && (
          <div className="p-4 border-t border-white/20 dark:border-gray-700 text-[10px] text-gray-400 text-center animate-in fade-in">
             نسخه ۱.۰.۲
          </div>
        )}
      </aside>
    </>
  );
};
