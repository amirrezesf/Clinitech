
// In a real app, use 'date-fns-jalali' or 'moment-jalaali'
export const formatJalaliDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  // Simulating Jalali conversion for demo purposes
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
};

export const formatJalaliTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
};

export const statusLabels: Record<string, { label: string; color: string }> = {
  '0': { label: 'پایان یافته', color: 'bg-green-100 text-green-800 border-green-200' },
  '1': { label: 'در انتظار مراجع', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  '2': { label: 'غایب', color: 'bg-red-100 text-red-800 border-red-200' },
  '3': { label: 'در حال ویزیت', color: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' },
  '4': { label: 'حاضر در مطب', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' },
};
