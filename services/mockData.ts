
import { Doctor, Patient, AppointmentReason, Appointment, Payment, Installment, DailySchedule, Insurance, Expense, AuditLog } from '../types';

const defaultDaySchedule: DailySchedule = {
  start: "09:00",
  end: "17:00",
  breaks: [],
  is_working: false
};

const workingDaySchedule: DailySchedule = {
  start: "08:00",
  end: "22:00",
  is_working: true,
  breaks: [{ start: "13:00", end: "14:00" }]
};

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: 1,
    name: "دکتر سارا احمدی",
    phone_number: "09121111111",
    specialty: "متخصص قلب",
    medical_council_number: "۱۲۳۴۵",
    booking_window_days: 30,
    maxBookingPercent: 100,
    schedule: {
      "Saturday": { ...workingDaySchedule },
      "Sunday": { ...workingDaySchedule },
      "Monday": { ...workingDaySchedule },
      "Tuesday": { ...workingDaySchedule },
      "Wednesday": { ...workingDaySchedule },
      "Thursday": { ...workingDaySchedule },
      "Friday": { ...workingDaySchedule }
    },
    permissions: {
        allowServicePriceEdit: true,
        allowAppointmentDelete: true,
        allowManualDiscount: true
    },
    penaltyConfig: {
        percent: 15,
        maxAmount: 100000
    }
  },
  {
    id: 2,
    name: "دکتر علی رضایی",
    phone_number: "09122222222",
    specialty: "دندانپزشک",
    medical_council_number: "۶۷۸۹۰",
    booking_window_days: 60,
    maxBookingPercent: 80,
    schedule: {
      "Saturday": { ...workingDaySchedule },
      "Sunday": { ...workingDaySchedule },
      "Monday": { ...workingDaySchedule },
      "Tuesday": { ...workingDaySchedule },
      "Wednesday": { ...workingDaySchedule },
      "Thursday": { ...workingDaySchedule },
      "Friday": { ...workingDaySchedule }
    },
    permissions: {
        allowServicePriceEdit: false,
        allowAppointmentDelete: true,
        allowManualDiscount: false
    },
    penaltyConfig: {
        percent: 20,
        maxAmount: 200000
    }
  },
  {
    id: 3,
    name: "دکتر مریم جلالی",
    phone_number: "09123333333",
    specialty: "متخصص پوست و مو",
    medical_council_number: "۵۴۳۲۱",
    booking_window_days: 45,
    maxBookingPercent: 90,
    schedule: {
      "Saturday": { ...workingDaySchedule },
      "Sunday": { ...workingDaySchedule },
      "Monday": { ...workingDaySchedule },
      "Tuesday": { ...workingDaySchedule },
      "Wednesday": { ...workingDaySchedule },
      "Thursday": { ...workingDaySchedule },
      "Friday": { ...workingDaySchedule }
    },
    permissions: {
        allowServicePriceEdit: true,
        allowAppointmentDelete: false,
        allowManualDiscount: true
    },
    penaltyConfig: {
        percent: 10,
        maxAmount: 50000
    }
  }
];

export const MOCK_INSURANCES: Insurance[] = [
  { id: 'ins-1', name: 'تامین اجتماعی', coverage_percent: 30 },
  { id: 'ins-2', name: 'خدمات درمانی (سلامت)', coverage_percent: 30 },
  { id: 'ins-3', name: 'نیروهای مسلح', coverage_percent: 70 },
  { id: 'ins-4', name: 'آزاد', coverage_percent: 0 },
];

export const MOCK_PATIENTS: Patient[] = [
  {
    uuid: "p1",
    name: "محمد محمدی",
    phone_number: "09351234567",
    id_number: "0012345678",
    notes: "سابقه فشار خون - حساسیت به پنی‌سیلین",
    insurance_id: 'ins-1',
    insurance_code: '12345678'
  },
  {
    uuid: "p2",
    name: "زهرا کریمی",
    phone_number: "09361234567",
    id_number: "0087654321",
    insurance_id: 'ins-4'
  },
  {
    uuid: "p3",
    name: "رضا نوروزی",
    phone_number: "09191234567",
    id_number: "1234567890",
    insurance_id: 'ins-3',
    insurance_code: '98765432'
  },
  {
    uuid: "p4",
    name: "حسین ابراهیمی",
    phone_number: "02188776655",
    id_number: "0054321987",
    notes: "شماره ثابت منزل - عدم دریافت پیامک",
    insurance_id: 'ins-1',
    insurance_code: '55443322'
  },
  {
    uuid: "p5",
    name: "فاطمه حسینی",
    phone_number: "09129876543",
    id_number: "0078965412",
    notes: "مسدودی پیامک‌های تبلیغاتی و خدماتی (Blacklist)",
    insurance_id: 'ins-2',
    insurance_code: '99887766',
    sms_blocked: true
  }
];

export const MOCK_REASONS: AppointmentReason[] = [
  { uuid: "r1", title: "ویزیت قلب", duration: 15, price: 150000, doctor_id: 1 },
  { uuid: "r2", title: "اکوکاردیوگرافی", duration: 30, price: 800000, doctor_id: 1 },
  { uuid: "r3", title: "تست ورزش", duration: 20, price: 450000, doctor_id: 1 },
  { uuid: "r4", title: "هولتر مانیتورینگ", duration: 15, price: 600000, doctor_id: 1 },
  { uuid: "r5", title: "ویزیت دندانپزشکی", duration: 20, price: 200000, doctor_id: 2 },
  { uuid: "r6", title: "عصب کشی", duration: 60, price: 1500000, doctor_id: 2 },
  { uuid: "r7", title: "جرم گیری", duration: 30, price: 700000, doctor_id: 2 },
  { uuid: "r8", title: "ویزیت پوست", duration: 15, price: 180000, doctor_id: 3 },
  { uuid: "r9", title: "لیزر درمانی", duration: 30, price: 950000, doctor_id: 3 },
  { uuid: "r10", title: "بوتاکس", duration: 20, price: 1200000, doctor_id: 3 }
];

const today = new Date();
const setTime = (hours: number, minutes: number) => {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
};

const nowMs = Date.now();
const minutesAgo = (mins: number) => new Date(nowMs - mins * 60000).toISOString();

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    uuid: "a-completed-1",
    patient_id: "p1",
    doctor_id: 1,
    services: [{ reason_id: "r1", quantity: 1 }],
    status: '0', // completed
    for_date: setTime(9, 0),
    actual_arrival_at: minutesAgo(65),
    visit_started_at: minutesAgo(60),
    visit_ended_at: minutesAgo(35),
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-invisit-1",
    patient_id: "p2",
    doctor_id: 1,
    services: [{ reason_id: "r1", quantity: 1 }, { reason_id: "r2", quantity: 1 }],
    status: '3', // in_visit
    for_date: setTime(9, 30),
    actual_arrival_at: minutesAgo(35),
    visit_started_at: minutesAgo(12),
    is_protected: true,
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-present-1",
    patient_id: "p3",
    doctor_id: 1,
    services: [{ reason_id: "r1", quantity: 1 }],
    status: '4', // present (waiting in clinic)
    for_date: setTime(10, 15),
    actual_arrival_at: minutesAgo(10),
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-pending-1",
    patient_id: "p1",
    doctor_id: 1,
    services: [{ reason_id: "r3", quantity: 1 }],
    status: '1', // pending / scheduled
    for_date: setTime(11, 0),
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-pending-2",
    patient_id: "p2",
    doctor_id: 1,
    services: [{ reason_id: "r2", quantity: 1 }],
    status: '1', // pending / scheduled
    for_date: setTime(11, 45),
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-urgent-1",
    patient_id: "p3",
    doctor_id: 1,
    services: [{ reason_id: "r1", quantity: 1 }],
    status: '4', // present (urgent)
    for_date: setTime(12, 30),
    actual_arrival_at: minutesAgo(5),
    is_urgent: true,
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-recurring-1",
    patient_id: "p1",
    doctor_id: 1,
    services: [{ reason_id: "r1", quantity: 1 }],
    status: '1', // pending
    for_date: setTime(16, 0),
    discount: 0,
    created_at: new Date().toISOString(),
    recurring_id: "rec-ortho-101",
    recurring_title: "درمان جامع ارتودنسی"
  },
  {
    uuid: "a-pending-3",
    patient_id: "p2",
    doctor_id: 1,
    services: [{ reason_id: "r3", quantity: 1 }, { reason_id: "r4", quantity: 1 }],
    status: '1', // pending
    for_date: setTime(17, 15),
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-manual-1",
    patient_id: "p4", // landline phone (02188776655)
    doctor_id: 1,
    services: [{ reason_id: "r1", quantity: 1 }],
    status: '1', // pending
    for_date: setTime(18, 0),
    discount: 0,
    created_at: new Date().toISOString()
  },
  {
    uuid: "a-manual-2",
    patient_id: "p5", // SMS blacklisted
    doctor_id: 1,
    services: [{ reason_id: "r2", quantity: 1 }],
    status: '1', // pending
    for_date: setTime(18, 45),
    discount: 0,
    created_at: new Date().toISOString()
  }
];

export const MOCK_PAYMENTS: Payment[] = [
  ...MOCK_APPOINTMENTS
    .filter(apt => apt.status === '0')
    .map(apt => {
      const totalPrice = apt.services.reduce((sum, s) => {
          const reason = MOCK_REASONS.find(r => r.uuid === s.reason_id);
          return sum + ((reason?.price || 0) * s.quantity);
      }, 0);
      
      return {
          uuid: `pay-${apt.uuid}`,
          amount: totalPrice - apt.discount,
          appointment_uuid: apt.uuid,
          patient_id: apt.patient_id,
          doctor_id: apt.doctor_id,
          date: apt.for_date,
          payment_method: 'pos' as const,
          reference_number: '10984572',
          description: 'پرداخت ویزیت و خدمات'
      };
    }),
  {
    uuid: 'pay-inst-down-1',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 1500000,
    date: new Date(Date.now() - 35 * 86400000).toISOString(),
    payment_method: 'pos' as const,
    reference_number: '88432190',
    description: 'پیش‌پرداخت طرح اقساط ارتودنسی و درمان جامع'
  },
  {
    uuid: 'pay-inst-1',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 1200000,
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    payment_method: 'pos' as const,
    reference_number: '77651234',
    installment_uuid: 'inst-p1-1',
    description: 'وصول قسط اول ارتودنسی و براکت‌گذاری'
  },
  {
    uuid: 'pay-inst-2',
    patient_id: 'p2',
    doctor_id: 2,
    amount: 900000,
    date: new Date(Date.now() - 20 * 86400000).toISOString(),
    payment_method: 'card_to_card' as const,
    reference_number: '66549812',
    installment_uuid: 'inst-p2-1',
    description: 'وصول قسط اول عصب‌کشی و ترمیم تخصصی'
  },
  {
    uuid: 'pay-direct-p3',
    patient_id: 'p3',
    doctor_id: 1,
    amount: 650000,
    discount: 50000,
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
    payment_method: 'pos' as const,
    reference_number: '55431109',
    description: 'پرداخت نقدی با دستگاه پوز بابت جرم‌گیری و بروساژ'
  },
  {
    uuid: 'pay-direct-p1-extra',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 450000,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    payment_method: 'cash' as const,
    reference_number: 'REC-9941',
    description: 'دریافت نقدی بابت ویزیت کنترل دوره‌ای ارتودنسی و تعویض کش'
  }
];

export const MOCK_INSTALLMENTS: Installment[] = [
  // Plan 1: محمد محمدی (Dr. 1) - Orthodontics 4 installments
  {
    uuid: 'inst-p1-1',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 1200000,
    due_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: 'paid',
    description: 'درمان جامع ارتودنسی (قسط ۱ از ۴)',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p1-2',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 1200000,
    due_date: new Date(Date.now() + 15 * 86400000).toISOString(),
    status: 'pending',
    description: 'درمان جامع ارتودنسی (قسط ۲ از ۴)',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p1-3',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 1200000,
    due_date: new Date(Date.now() + 45 * 86400000).toISOString(),
    status: 'pending',
    description: 'درمان جامع ارتودنسی (قسط ۳ از ۴)',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p1-4',
    patient_id: 'p1',
    doctor_id: 1,
    amount: 1200000,
    due_date: new Date(Date.now() + 75 * 86400000).toISOString(),
    status: 'pending',
    description: 'درمان جامع ارتودنسی (قسط ۴ از ۴)',
    created_at: new Date(Date.now() - 35 * 86400000).toISOString()
  },

  // Plan 2: زهرا کریمی (Dr. 2) - Dental Root Canal & Crown 3 installments
  {
    uuid: 'inst-p2-1',
    patient_id: 'p2',
    doctor_id: 2,
    amount: 900000,
    due_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    status: 'paid',
    description: 'عصب‌کشی تخصصی و روکش سرامیکی (قسط ۱ از ۳)',
    created_at: new Date(Date.now() - 50 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p2-2',
    patient_id: 'p2',
    doctor_id: 2,
    amount: 900000,
    due_date: new Date(Date.now() - 4 * 86400000).toISOString(), // Overdue
    status: 'pending',
    description: 'عصب‌کشی تخصصی و روکش سرامیکی (قسط ۲ از ۳)',
    created_at: new Date(Date.now() - 50 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p2-3',
    patient_id: 'p2',
    doctor_id: 2,
    amount: 900000,
    due_date: new Date(Date.now() + 26 * 86400000).toISOString(),
    status: 'pending',
    description: 'عصب‌کشی تخصصی و روکش سرامیکی (قسط ۳ از ۳)',
    created_at: new Date(Date.now() - 50 * 86400000).toISOString()
  },

  // Plan 3: رضا نوروزی (Dr. 3) - Skin / Laser package 2 installments
  {
    uuid: 'inst-p3-1',
    patient_id: 'p3',
    doctor_id: 3,
    amount: 850000,
    due_date: new Date(Date.now() + 8 * 86400000).toISOString(),
    status: 'pending',
    description: 'پکیج لیزر و جوانسازی پوست (قسط ۱ از ۲)',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p3-2',
    patient_id: 'p3',
    doctor_id: 3,
    amount: 850000,
    due_date: new Date(Date.now() + 38 * 86400000).toISOString(),
    status: 'pending',
    description: 'پکیج لیزر و جوانسازی پوست (قسط ۲ از ۲)',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },

  // Pay Later Promises (وعده پرداخت موکول به بعد / تسویه سررسید)
  {
    uuid: 'inst-p3-def-1',
    patient_id: 'p3',
    doctor_id: 1,
    amount: 450000,
    due_date: new Date(Date.now() + 3 * 86400000).toISOString(), // Due in 3 days
    status: 'pending',
    description: 'وعده پرداخت مابقی تست ورزش و اکوکاردیوگرافی (تحویل جواب آزمایش)',
    created_at: new Date().toISOString()
  },
  {
    uuid: 'inst-p4-def-1',
    patient_id: 'p4',
    doctor_id: 1,
    amount: 300000,
    due_date: new Date(Date.now() - 2 * 86400000).toISOString(), // Overdue by 2 days
    status: 'pending',
    description: 'وعده پرداخت مانده ویزیت و هولتر (موعد جلسه بعدی درمان)',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    uuid: 'inst-p5-def-1',
    patient_id: 'p5',
    doctor_id: 3,
    amount: 600000,
    due_date: new Date(Date.now() + 12 * 86400000).toISOString(), // Due in 12 days
    status: 'pending',
    description: 'وعده پرداخت مابقی هزینه بوتاکس و مزوتراپی',
    created_at: new Date().toISOString()
  }
];
export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'اجاره بهای ماهانه مطب و کلینیک',
    amount: 45000000,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    category: 'اجاره و رهن',
    description: 'پرداخت اجاره بهای طبقه سوم ساختمان پزشکان مرکزی (شهریور)',
    status: 'paid'
  },
  {
    id: 'exp-2',
    title: 'حقوق و دستمزد منشی و دستیار مطب',
    amount: 22500000,
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    category: 'حقوق و دستمزد',
    description: 'حقوق ماهانه خانم مهندس رحیمی و پرسنل پذیرش شیفت عصر',
    doctor_id: 1,
    status: 'paid'
  },
  {
    id: 'exp-3',
    title: 'خرید مواد مصرفی و ترمیمی دندانپزشکی',
    amount: 14800000,
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    category: 'اقلام مصرفی پزشکی',
    description: 'کامپوزیت ۳M، اسید اچ، باندینگ نسل ۸ و کارپول بی‌حسی لیدوکائین',
    doctor_id: 1,
    status: 'paid'
  },
  {
    id: 'exp-4',
    title: 'خرید پک‌های استریل، ماسک، سرسوزن و دستکش نیتریل',
    amount: 5600000,
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
    category: 'اقلام مصرفی پزشکی',
    description: 'تامین اقلام بهداشتی و ایمنی مصرفی ماهانه کلینیک',
    status: 'paid'
  },
  {
    id: 'exp-5',
    title: 'سرویس و کالیبراسیون دستگاه اتوکلاو و کمپرسور باد',
    amount: 3800000,
    date: new Date(Date.now() - 11 * 86400000).toISOString(),
    category: 'تعمیرات و نگهداری',
    description: 'تعویض فیلترهای هپا، سرویس پمپ خلاء و تست بیولوژیک اتوکلاو',
    status: 'paid'
  },
  {
    id: 'exp-6',
    title: 'قبض برق صنعتی و گاز مصرفی کلینیک',
    amount: 2450000,
    date: new Date(Date.now() - 14 * 86400000).toISOString(),
    category: 'قبوض (آب، برق، گاز)',
    description: 'شناسه قبض: ۹۲۸۳۷۴۱۰۲ - پرداخت آنلاین دوره تابستان',
    status: 'paid'
  },
  {
    id: 'exp-7',
    title: 'شارژ سامانه پیامک نوبت‌دهی و اینترنت فیبرنوری',
    amount: 1850000,
    date: new Date(Date.now() - 17 * 86400000).toISOString(),
    category: 'قبوض (آب، برق، گاز)',
    description: 'خرید ۵۰,۰۰۰ پیامک اطلاع‌رسانی یادآوری نوبت و اشتراک اینترنت ۳ ماهه',
    status: 'paid'
  },
  {
    id: 'exp-8',
    title: 'مواد مزوتراپی و ژل‌های هیالورونیک اسید',
    amount: 19500000,
    date: new Date(Date.now() - 20 * 86400000).toISOString(),
    category: 'اقلام مصرفی پزشکی',
    description: 'خرید برندهای معتبر فیلر و مزو دارای تاییدیه وزارت بهداشت',
    doctor_id: 3,
    status: 'paid'
  },
  {
    id: 'exp-9',
    title: 'دستگاه مانیتورینگ علائم حیاتی پرتابل',
    amount: 16000000,
    date: new Date(Date.now() + 4 * 86400000).toISOString(),
    category: 'تجهیزات سرمایه‌ای',
    description: 'پیش‌فاکتور خرید دستگاه سنجش اکسیژن و فشارسنج بیمارستانی (در انتظار تایید و واریز)',
    doctor_id: 2,
    status: 'pending'
  },
  {
    id: 'exp-10',
    title: 'چاپ بروشورهای سلامت دهان و دندان و اصلاح تابلوی ورودی',
    amount: 3200000,
    date: new Date(Date.now() + 7 * 86400000).toISOString(),
    category: 'تبلیغات و مارکتینگ',
    description: 'طراحی و چاپ ۲,۰۰۰ برگه آموزشی مراقبت پس از درمان برای مراجعین',
    status: 'pending'
  },
  {
    id: 'exp-11',
    title: 'اقلام پذیرایی و ملزومات رفاهی سالن انتظار',
    amount: 1350000,
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    category: 'سایر موارد',
    description: 'خرید چای، قهوه، دستمال کاغذی، شوینده و خوشبوکننده هوا',
    status: 'paid'
  }
];
export const MOCK_AUDIT_LOGS: AuditLog[] = [];
