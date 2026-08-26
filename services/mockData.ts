
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
  }
];

export const MOCK_PAYMENTS: Payment[] = MOCK_APPOINTMENTS
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
        description: 'پرداخت ویزیت'
    };
  });

export const MOCK_INSTALLMENTS: Installment[] = [];
export const MOCK_EXPENSES: Expense[] = [];
export const MOCK_AUDIT_LOGS: AuditLog[] = [];
