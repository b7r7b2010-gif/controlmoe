
export type UserRole = 'MANAGER' | 'CONTROL' | 'COUNSELOR' | 'TEACHER';

export enum EnvelopeStatus {
  NOT_RECEIVED = 'في الانتظار',
  RECEIVED_BY_TEACHER = 'جاري الاختبار',
  SUBMITTED_TO_CONTROL = 'تم التسليم للكنترول'
}

export interface Student {
  id: string; // رقم الجلوس
  name: string;
  grade: string; // الصف
  classroom: string; // الفصل
  phone: string; // رقم الجوال
  status: 'present' | 'absent' | 'pending';
  photo: string;
}

export interface ExamEnvelope {
  id: string;
  qrCode: string;
  subject: string;
  committee: string; // رقم اللجنة
  venue: string; // المقر
  startTime: string;
  endTime: string;
  date: string;
  teacherId?: string;
  teacherName?: string;
  status: EnvelopeStatus | string;
  students: Student[];
  receivedAt?: string;
  submittedAt?: string;
  period?: string; // الفترة
}

export interface Teacher {
  id: string; // الرقم الوظيفي
  name: string;
  phone: string;
  qrCode: string;
  committees: string[];
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: 'alert' | 'info';
  read: boolean;
}
