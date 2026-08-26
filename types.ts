
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type AppModule = 'appointments' | 'patients' | 'finances' | 'services' | 'insurances' | 'reports';

export interface ModulePermissions extends Record<PermissionAction, boolean> {
  fields: Record<string, Record<PermissionAction, boolean>>;
}

export type UserPermissions = Record<AppModule, ModulePermissions>;

export interface UserSettings {
  smsOnNewAppointment: boolean;
  smsOnCancellation: boolean;
  showFinancialsOnDashboard: boolean;
  compactMode: boolean;
  autoRecognizeHandwriting: boolean;
  defaultVisitHandwriting: boolean;
  showVisitStopwatch: boolean;
}

export interface User {
  username: string;
  fullName: string;
  role: 'doctor' | 'secretary';
  phoneNumber?: string;
  email?: string;
  token?: string;
  password?: string;
  allowedDoctorIds?: number[];
  permissions?: UserPermissions;
  settings?: UserSettings;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface ServiceRestriction extends TimeRange {
  reason_ids: string[];
}

export interface DailySchedule {
  start: string;
  end: string;
  breaks: TimeRange[];
  serviceRestrictions?: ServiceRestriction[];
  is_working: boolean;
}

export interface DoctorPermissions {
  allowServicePriceEdit: boolean;
  allowAppointmentDelete: boolean;
  allowManualDiscount: boolean;
  allowOvertime?: boolean;
}

export interface Doctor {
  id: number;
  name: string;
  phone_number: string;
  specialty: string;
  medical_council_number: string;
  schedule: Record<string, DailySchedule>;
  booking_window_days?: number;
  permissions: DoctorPermissions;
  maxBookingPercent?: number;
  penaltyConfig?: {
    percent: number;
    maxAmount: number;
  };
}

export interface Insurance {
  id: string;
  name: string;
  coverage_percent: number;
  doctor_id?: number;
}

export interface Patient {
  uuid: string;
  name: string;
  phone_number: string;
  id_number: string;
  notes?: string;
  insurance_id?: string;
  insurance_code?: string;
  medical_history?: string[];
  has_outstanding_penalty?: boolean;
  sms_blocked?: boolean;
  no_sms?: boolean;
}

export interface AppointmentReason {
  uuid: string;
  title: string;
  duration: number;
  price: number;
  doctor_id: number;
}

export type AppointmentStatus = '0' | '1' | '2' | '3' | '4' | 'pending' | 'present' | 'in_visit' | 'finished' | 'absent' | 'cancelled' | 'interrupted' | 'forfeited';

export interface AppointmentItem {
  reason_id: string;
  quantity: number;
}

export interface Appointment {
  uuid: string;
  patient_id: string;
  doctor_id: number;
  services: AppointmentItem[];
  status: AppointmentStatus;
  for_date: string;
  discount: number;
  created_at: string;
  recurring_id?: string; 
  recurring_title?: string;
  history?: string;
  history_draw?: string;
  diagnosis?: string;
  diagnosis_draw?: string;
  actions?: string;
  actions_draw?: string;
  // Day Board Operational Fields
  is_protected?: boolean;
  is_urgent?: boolean;
  is_double_booked?: boolean;
  is_walkin?: boolean;
  is_returning?: boolean;
  is_forfeited?: boolean;
  actual_arrival_at?: string | null;
  visit_started_at?: string | null;
  visit_ended_at?: string | null;
  cancellation_type?: 'patient' | 'clinic';
  cancellation_reason?: string;
  interrupt_reason?: string;
  priority_order?: number;
}

export interface DoctorSmsTemplate {
  uuid: string;
  doctor_id: number;
  title: string;
  text: string;
  triggerType: 'before_appointment' | 'after_appointment' | 'specific_date' | 'event_based';
  offsetValue?: number;
  offsetUnit?: 'hours' | 'days' | 'weeks';
  specificDate?: string;
  event?: 'on_booking' | 'on_cancel' | 'on_no_show';
  enabled: boolean;
}

export interface Payment {
  uuid: string;
  amount: number;
  discount?: number;
  patient_id: string;
  doctor_id?: number;
  appointment_uuid?: string;
  installment_uuid?: string;
  date: string;
  description?: string;
  receipt_image?: string; 
  quantity?: number;
  payment_method?: 'pos' | 'cash' | 'card_to_card' | 'debt' | 'insurance' | 'other';
  reference_number?: string;
  payer_name?: string;
}

export interface Installment {
  uuid: string;
  patient_id: string;
  doctor_id?: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  receipt_image?: string;
  doctor_id?: number;
  status: 'paid' | 'pending';
}

export interface MedicalImage {
  uuid: string;
  patient_id: string;
  type: 'radiology' | 'ct-scan' | 'mri' | 'sonography' | 'pathology' | 'other';
  date: string;
  description?: string;
  image_data: string;
  created_at: string;
}

export interface Stats {
  confirmed: number;
  cancelled: number;
  absent: number;
  revenue: number;
}

export interface AuditLog {
  id: string;
  user_name: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SECURITY';
  entity: string;
  description: string;
  timestamp: string;
  metadata?: any;
}
