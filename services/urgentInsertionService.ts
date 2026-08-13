import { Doctor, Patient, Appointment, AppointmentItem, AppointmentReason } from '../types';
import { format24hTime } from '../utils/helpers';

export interface DisplacedPatientInfo {
  appointmentUuid: string;
  patientName: string;
  patientPhone?: string;
  currentScheduledTime: string;
  newScheduledTime: string;
  delayMinutes: number;
}

export interface UrgentInsertionPreviewResult {
  proposedTime: string;
  proposedDate: string;
  insertionDuration: number;
  displacedPatients: DisplacedPatientInfo[];
  totalDisplacedCount: number;
  expectedCumulativeDelayMinutes: number;
  exceedsWorkingHours: boolean;
  overtimeMinutes: number;
  doctorEndWorkingTime: string;
  latestNewEndTime: string;
  isOvertimeAllowed: boolean;
  canConfirm: boolean;
  warningMessage?: string;
}

export async function previewUrgentInsertion(params: {
  doctor: Doctor;
  services: AppointmentItem[];
  allReasons: AppointmentReason[];
  allAppointments: Appointment[];
  patients: Patient[];
  forDate?: string;
}): Promise<UrgentInsertionPreviewResult> {
  // Simulate network call delay for preview endpoint
  await new Promise(resolve => setTimeout(resolve, 250));

  const { doctor, services, allReasons, allAppointments, patients } = params;
  const now = new Date();
  const todayStr = params.forDate || now.toISOString().split('T')[0];

  const totalDuration = services.reduce((sum, item) => {
    const r = allReasons.find(res => res.uuid === item.reason_id);
    return sum + ((r?.duration || 0) * item.quantity);
  }, 0) || 15;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateObj = new Date(todayStr);
  const dayKey = dayNames[dateObj.getDay()];
  const schedule = doctor.schedule?.[dayKey];

  const docStartStr = schedule?.start || "08:00";
  const docEndStr = schedule?.end || "22:00";

  const docStart = new Date(`${todayStr}T${docStartStr}:00`);
  const docEnd = new Date(`${todayStr}T${docEndStr}:00`);

  let proposedDateTime = new Date(now);
  if (proposedDateTime < docStart) {
    proposedDateTime = new Date(docStart);
  } else {
    const remainder = proposedDateTime.getMinutes() % 5;
    if (remainder !== 0) {
      proposedDateTime.setMinutes(proposedDateTime.getMinutes() + (5 - remainder));
    }
    proposedDateTime.setSeconds(0);
    proposedDateTime.setMilliseconds(0);
  }

  const proposedTimeStr = format24hTime(proposedDateTime);
  const insertionEndTime = new Date(proposedDateTime.getTime() + totalDuration * 60000);

  const doctorTodayAppts = allAppointments.filter(a =>
    a.doctor_id === doctor.id &&
    a.for_date.startsWith(todayStr) &&
    a.status !== '2' &&
    a.status !== 'cancelled'
  ).sort((a, b) => new Date(a.for_date).getTime() - new Date(b.for_date).getTime());

  const displacedPatients: DisplacedPatientInfo[] = [];
  let maxNewEndTime = new Date(insertionEndTime);

  for (const apt of doctorTodayAppts) {
    const aptStart = new Date(apt.for_date);
    const aptDuration = apt.services.reduce((sum, serv) => {
      const r = allReasons.find(res => res.uuid === serv.reason_id);
      return sum + ((r?.duration || 0) * serv.quantity);
    }, 0) || 15;
    const aptEnd = new Date(aptStart.getTime() + aptDuration * 60000);

    if (aptEnd > proposedDateTime) {
      let newStart: Date;
      if (aptStart >= proposedDateTime) {
        newStart = new Date(aptStart.getTime() + totalDuration * 60000);
      } else {
        newStart = new Date(insertionEndTime);
      }

      const newEnd = new Date(newStart.getTime() + aptDuration * 60000);
      if (newEnd > maxNewEndTime) {
        maxNewEndTime = newEnd;
      }

      const pat = patients.find(p => p.uuid === apt.patient_id);
      const delayMins = Math.round((newStart.getTime() - aptStart.getTime()) / 60000);

      displacedPatients.push({
        appointmentUuid: apt.uuid,
        patientName: pat?.name || 'بیمار ناشناس',
        patientPhone: pat?.phone_number || '',
        currentScheduledTime: format24hTime(aptStart),
        newScheduledTime: format24hTime(newStart),
        delayMinutes: Math.max(0, delayMins)
      });
    }
  }

  const totalDisplacedCount = displacedPatients.length;
  const expectedCumulativeDelayMinutes = displacedPatients.reduce((sum, p) => sum + p.delayMinutes, 0);

  const exceedsWorkingHours = maxNewEndTime > docEnd;
  const overtimeMinutes = exceedsWorkingHours
    ? Math.round((maxNewEndTime.getTime() - docEnd.getTime()) / 60000)
    : 0;

  const isOvertimeAllowed = !!(doctor.permissions?.allowOvertime || (doctor as any).allowOvertime);
  const canConfirm = !exceedsWorkingHours || isOvertimeAllowed;

  let warningMessage: string | undefined;
  if (exceedsWorkingHours) {
    warningMessage = `ثبت این نوبت اورژانسی باعث تجاوز از ساعات کاری پزشک (پایان شیفت: ${format24hTime(docEnd)}) تا ساعت ${format24hTime(maxNewEndTime)} (${overtimeMinutes} دقیقه اضافه کاری) می‌شود.`;
  }

  return {
    proposedTime: proposedTimeStr,
    proposedDate: todayStr,
    insertionDuration: totalDuration,
    displacedPatients,
    totalDisplacedCount,
    expectedCumulativeDelayMinutes,
    exceedsWorkingHours,
    overtimeMinutes,
    doctorEndWorkingTime: format24hTime(docEnd),
    latestNewEndTime: format24hTime(maxNewEndTime),
    isOvertimeAllowed,
    canConfirm,
    warningMessage
  };
}
