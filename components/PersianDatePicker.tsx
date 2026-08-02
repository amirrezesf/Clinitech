
import React from 'react';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { Calendar } from 'lucide-react';

interface Props {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  mapDays?: (object: { date: DateObject; today: DateObject; selectedDate: DateObject | DateObject[]; currentMonth: DateObject; isSameDate: (arg1: DateObject, arg2: DateObject) => boolean }) => React.HTMLAttributes<HTMLDivElement> | void;
}

export const PersianDatePicker = ({ value, onChange, placeholder, className, label, mapDays }: Props) => {
  // value is expected to be YYYY-MM-DD string (Gregorian) or empty
  const dateValue = value ? new Date(value) : undefined;

  return (
    <div className="w-full">
        {label && <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>}
        <div className="relative w-full">
            <DatePicker
                value={dateValue}
                onChange={(dateObject: any) => {
                    if (dateObject?.isValid) {
                        // Convert back to Gregorian YYYY-MM-DD for app logic
                        const date = dateObject.toDate();
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        onChange(`${year}-${month}-${day}`);
                    } else {
                        onChange('');
                    }
                }}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                containerStyle={{ width: '100%' }}
                zIndex={9000}
                mapDays={mapDays}
                render={(val: any, openCalendar: any) => {
                    return (
                        <div 
                            onClick={openCalendar} 
                            className={`flex items-center gap-2 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:border-primary-500 transition-colors ${className}`}
                        >
                            <Calendar size={18} className="text-gray-400" />
                            <span className={`text-sm ${val ? 'text-gray-800' : 'text-gray-400'}`}>
                                {val || placeholder || 'انتخاب تاریخ'}
                            </span>
                        </div>
                    )
                }}
            />
        </div>
    </div>
  );
};
