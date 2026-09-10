
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Doctor, Patient, AppointmentReason, Appointment, Payment, Installment, Insurance, Expense, AuditLog, MedicalImage, DoctorSmsTemplate } from '../types';
import { api } from '../services/api';
import { MOCK_DOCTORS, MOCK_APPOINTMENTS, MOCK_PATIENTS, MOCK_REASONS, MOCK_PAYMENTS, MOCK_INSURANCES, MOCK_EXPENSES, MOCK_INSTALLMENTS, MOCK_AUDIT_LOGS } from '../services/mockData';
import { useAppSelector } from '../hooks/redux';

interface DataContextType {
  doctors: Doctor[];
  patients: Patient[];
  reasons: AppointmentReason[]; 
  allReasons: AppointmentReason[]; 
  appointments: Appointment[]; 
  allAppointments: Appointment[]; 
  payments: Payment[];
  installments: Installment[];
  insurances: Insurance[]; 
  allInsurances: Insurance[]; 
  expenses: Expense[];
  medicalImages: MedicalImage[];
  doctorSmsTemplates: DoctorSmsTemplate[];
  auditLogs: AuditLog[];
  
  loading: boolean;
  
  addAppointment: (apt: Appointment) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  swapAppointments: (id1: string, id2: string) => Promise<void>;
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  addInstallment: (installment: Installment) => Promise<void>;
  updateInstallment: (id: string, updates: Partial<Installment>) => Promise<void>;
  addDoctor: (doctor: Doctor) => Promise<void>;
  updateDoctor: (id: number, updates: Partial<Doctor>) => Promise<void>;
  addReason: (reason: AppointmentReason) => Promise<void>;
  updateReason: (id: string, updates: Partial<AppointmentReason>) => Promise<void>;
  deleteReason: (id: string) => Promise<void>;
  addInsurance: (insurance: Insurance) => Promise<void>;
  updateInsurance: (id: string, updates: Partial<Insurance>) => Promise<void>;
  deleteInsurance: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addMedicalImage: (img: MedicalImage) => Promise<void>;
  deleteMedicalImage: (id: string) => Promise<void>;
  
  addSmsTemplate: (template: DoctorSmsTemplate) => Promise<void>;
  updateSmsTemplate: (id: string, updates: Partial<DoctorSmsTemplate>) => Promise<void>;
  deleteSmsTemplate: (id: string) => Promise<void>;

  logAction: (action: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  getPatientName: (id: string) => string;
  getReasonTitle: (id: string) => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const user = useAppSelector(state => state.auth.user);
  const [loading, setLoading] = useState(true);
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [reasons, setReasons] = useState<AppointmentReason[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [medicalImages, setMedicalImages] = useState<MedicalImage[]>([]);
  const [doctorSmsTemplates, setDoctorSmsTemplates] = useState<DoctorSmsTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            await new Promise(r => setTimeout(r, 500));
            
            setDoctors(MOCK_DOCTORS);
            setPatients(MOCK_PATIENTS);
            setReasons(MOCK_REASONS);
            setAppointments(MOCK_APPOINTMENTS);
            setPayments(MOCK_PAYMENTS);
            setInstallments(MOCK_INSTALLMENTS);
            setInsurances(MOCK_INSURANCES);
            
            // Handle Expenses with Persistence & Defaults
            let storedExpenses: Expense[] = [];
            try {
              storedExpenses = JSON.parse(localStorage.getItem('clinic_expenses') || '[]');
            } catch {
              storedExpenses = [];
            }
            if (!storedExpenses || storedExpenses.length === 0) {
              storedExpenses = MOCK_EXPENSES;
              localStorage.setItem('clinic_expenses', JSON.stringify(MOCK_EXPENSES));
            }
            setExpenses(storedExpenses);
            setMedicalImages(JSON.parse(localStorage.getItem('medical_images') || '[]'));
            
            // Handle Templates with Defaults
            let storedTemplates = JSON.parse(localStorage.getItem('doctor_sms_templates') || '[]');
            if (storedTemplates.length === 0) {
                const defaults: DoctorSmsTemplate[] = [];
                MOCK_DOCTORS.forEach(doc => {
                    defaults.push(
                        { uuid: `def-1-${doc.id}`, doctor_id: doc.id, title: 'تایید رزرو نوبت', text: 'بیمار گرامی {patient_name}، نوبت شما برای تاریخ {date} ساعت {time} نزد {doctor_name} با موفقیت ثبت شد.', triggerType: 'event_based', event: 'on_booking', enabled: true },
                        { uuid: `def-2-${doc.id}`, doctor_id: doc.id, title: 'یادآوری ۲۴ ساعت قبل', text: 'یادآوری: نوبت شما فردا ساعت {time} می‌باشد. در صورت عدم حضور لطفا اطلاع دهید.', triggerType: 'before_appointment', offsetValue: 1, offsetUnit: 'days', enabled: true },
                        { uuid: `def-3-${doc.id}`, doctor_id: doc.id, title: 'پیگیری پس از درمان', text: 'بیمار عزیز، امیدواریم روند بهبودی شما به خوبی طی شود. در صورت بروز درد شدید تماس بگیرید.', triggerType: 'after_appointment', offsetValue: 2, offsetUnit: 'days', enabled: false },
                        { uuid: `def-4-${doc.id}`, doctor_id: doc.id, title: 'اطلاع‌رسانی غیبت', text: '{patient_name} عزیز، متاسفانه امروز در مطب حضور نداشتید. جهت رزرو مجدد با شماره مطب تماس بگیرید.', triggerType: 'event_based', event: 'on_no_show', enabled: true }
                    );
                });
                storedTemplates = defaults;
                localStorage.setItem('doctor_sms_templates', JSON.stringify(defaults));
            }
            setDoctorSmsTemplates(storedTemplates);
            setAuditLogs(MOCK_AUDIT_LOGS);
        } catch (e) {
            console.error("Failed to load initial data", e);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        fetchData();
    }
  }, [user]);

  const allowedDoctorIds = useMemo(() => user?.allowedDoctorIds || [], [user]);

  const logAction = async (action: Omit<AuditLog, 'id' | 'timestamp'>) => {
      const newLog: AuditLog = { ...action, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
      setAuditLogs(prev => [newLog, ...prev]);
  };

  const addAppointment = async (apt: Appointment) => {
    setAppointments(prev => [...prev, apt]);
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.uuid === id ? { ...a, ...updates } : a));
  };

  const swapAppointments = async (id1: string, id2: string) => {
    setAppointments(prev => {
        const index1 = prev.findIndex(a => a.uuid === id1);
        const index2 = prev.findIndex(a => a.uuid === id2);
        if (index1 === -1 || index2 === -1) return prev;
        const newAppointments = [...prev];
        const date1 = newAppointments[index1].for_date;
        const date2 = newAppointments[index2].for_date;
        newAppointments[index1] = { ...newAppointments[index1], for_date: date2 };
        newAppointments[index2] = { ...newAppointments[index2], for_date: date1 };
        return newAppointments;
    });
  };

  const addPatient = async (patient: Patient) => {
    setPatients(prev => [...prev, patient]);
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.uuid === id ? { ...p, ...updates } : p));
  };

  const deletePatient = async (id: string) => {
    setPatients(prev => prev.filter(p => p.uuid !== id));
  };

  const addPayment = async (payment: Payment) => {
    setPayments(prev => [payment, ...prev]);
  };

  const addInstallment = async (installment: Installment) => {
      setInstallments(prev => [...prev, installment]);
  };

  const updateInstallment = async (id: string, updates: Partial<Installment>) => {
      setInstallments(prev => prev.map(i => i.uuid === id ? { ...i, ...updates } : i));
  };

  const addDoctor = async (doctor: Doctor) => {
    setDoctors(prev => [...prev, doctor]);
  };

  const updateDoctor = async (id: number, updates: Partial<Doctor>) => {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const addReason = async (reason: AppointmentReason) => {
    setReasons(prev => [...prev, reason]);
  };

  const updateReason = async (id: string, updates: Partial<AppointmentReason>) => {
    setReasons(prev => prev.map(r => r.uuid === id ? { ...r, ...updates } : r));
  };

  const deleteReason = async (id: string) => {
    setReasons(prev => prev.filter(r => r.uuid !== id));
  };

  const addInsurance = async (insurance: Insurance) => {
    setInsurances(prev => [...prev, insurance]);
  };

  const updateInsurance = async (id: string, updates: Partial<Insurance>) => {
    setInsurances(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const deleteInsurance = async (id: string) => {
    setInsurances(prev => prev.filter(i => i.id !== id));
  };

  const addExpense = async (expense: Expense) => {
    setExpenses(prev => {
      const next = [expense, ...prev];
      localStorage.setItem('clinic_expenses', JSON.stringify(next));
      return next;
    });
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      localStorage.setItem('clinic_expenses', JSON.stringify(next));
      return next;
    });
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem('clinic_expenses', JSON.stringify(next));
      return next;
    });
  };

  const addMedicalImage = async (img: MedicalImage) => {
      const newList = [...medicalImages, img];
      setMedicalImages(newList);
      localStorage.setItem('medical_images', JSON.stringify(newList));
  };

  const deleteMedicalImage = async (id: string) => {
      const newList = medicalImages.filter(i => i.uuid !== id);
      setMedicalImages(newList);
      localStorage.setItem('medical_images', JSON.stringify(newList));
  };

  const addSmsTemplate = async (template: DoctorSmsTemplate) => {
      const newList = [...doctorSmsTemplates, template];
      setDoctorSmsTemplates(newList);
      localStorage.setItem('doctor_sms_templates', JSON.stringify(newList));
  };

  const updateSmsTemplate = async (id: string, updates: Partial<DoctorSmsTemplate>) => {
      const newList = doctorSmsTemplates.map(t => t.uuid === id ? { ...t, ...updates } : t);
      setDoctorSmsTemplates(newList);
      localStorage.setItem('doctor_sms_templates', JSON.stringify(newList));
  };

  const deleteSmsTemplate = async (id: string) => {
      const newList = doctorSmsTemplates.filter(t => t.uuid !== id);
      setDoctorSmsTemplates(newList);
      localStorage.setItem('doctor_sms_templates', JSON.stringify(newList));
  };

  const getPatientName = (id: string) => patients.find(p => p.uuid === id)?.name || 'نامشخص';
  const getReasonTitle = (id: string) => reasons.find(r => r.uuid === id)?.title || '';

  // Fix: Add missing filtered data variables derived from allowedDoctorIds
  const filteredReasons = useMemo(() => {
    if (!user) return [];
    return reasons.filter(r => allowedDoctorIds.includes(r.doctor_id));
  }, [reasons, allowedDoctorIds, user]);

  const filteredAppointments = useMemo(() => {
    if (!user) return [];
    return appointments.filter(a => allowedDoctorIds.includes(a.doctor_id));
  }, [appointments, allowedDoctorIds, user]);

  const filteredInsurances = useMemo(() => {
    if (!user) return [];
    return insurances.filter(i => !i.doctor_id || allowedDoctorIds.includes(i.doctor_id));
  }, [insurances, allowedDoctorIds, user]);

  return (
    <DataContext.Provider value={{
      doctors, patients, reasons: filteredReasons, allReasons: reasons,
      appointments: filteredAppointments, allAppointments: appointments, 
      payments, installments, insurances: filteredInsurances, allInsurances: insurances,
      expenses, medicalImages, doctorSmsTemplates, auditLogs, loading,
      addAppointment, updateAppointment, swapAppointments, addPatient, updatePatient, deletePatient,
      addPayment, addInstallment, updateInstallment, addDoctor, updateDoctor,
      addReason, updateReason, deleteReason, addInsurance, updateInsurance, deleteInsurance,
      addExpense, updateExpense, deleteExpense, addMedicalImage, deleteMedicalImage,
      addSmsTemplate, updateSmsTemplate, deleteSmsTemplate, logAction, getPatientName, getReasonTitle
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};
