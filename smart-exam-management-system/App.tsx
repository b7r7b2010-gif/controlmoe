
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import AdminView from './components/AdminView';
import TeacherView from './components/TeacherView';
import LoginView from './components/LoginView';
import CounselorView from './components/CounselorView';
import { UserRole, ExamEnvelope, EnvelopeStatus, Notification, Teacher } from './types';
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { DEFAULT_ENVELOPES, DEFAULT_TEACHERS } from './constants';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [envelopes, setEnvelopes] = useState<ExamEnvelope[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Seed database initially if empty
  const seedDatabase = useCallback(async () => {
    const envSnap = await getDocs(collection(db, 'envelopes'));
    if (envSnap.empty) {
      for (const env of DEFAULT_ENVELOPES) {
        await setDoc(doc(db, 'envelopes', env.id), env);
      }
      for (const teacher of DEFAULT_TEACHERS) {
        await setDoc(doc(db, 'teachers', teacher.id), teacher);
      }
    }
  }, []);

  useEffect(() => {
    seedDatabase().then(() => {
      const unsubEnvelopes = onSnapshot(collection(db, 'envelopes'), (snapshot) => {
        setEnvelopes(snapshot.docs.map(doc => doc.data() as ExamEnvelope));
        setLoading(false);
      });

      const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(10));
      const unsubNotifications = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification)));
      });

      return () => {
        unsubEnvelopes();
        unsubNotifications();
      };
    });
  }, [seedDatabase]);

  const handleLogin = async (id: string, selectedRole: UserRole) => {
    if (selectedRole === 'TEACHER') {
      const q = query(collection(db, 'teachers'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const teacherData = snap.docs[0].data() as Teacher;
        setCurrentUser(teacherData);
        setRole('TEACHER');
        setIsLoggedIn(true);
      } else {
        alert("رقم المعلم غير موجود في النظام. يرجى التأكد من الاستيراد أولاً.");
      }
    } else {
      // For Admin/Manager/Counselor we use demo logic or fixed IDs
      setCurrentUser({ id, name: selectedRole === 'MANAGER' ? 'مدير المدرسة' : 'الموظف المسؤول' });
      setRole(selectedRole);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const addNotification = useCallback(async (message: string, type: 'alert' | 'info') => {
    await addDoc(collection(db, 'notifications'), {
      message,
      timestamp: new Date().toLocaleTimeString('ar-SA'),
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  }, []);

  const updateEnvelopeStatus = useCallback(async (envId: string, status: EnvelopeStatus, teacherName: string) => {
    const envRef = doc(db, 'envelopes', envId);
    await updateDoc(envRef, { 
      status, 
      teacherName, 
      updatedAt: new Date().toISOString(),
      teacherId: currentUser?.id
    });
    addNotification(`تحديث: ${status} في لجنة ${envId}`, 'info');
  }, [addNotification, currentUser]);

  const updateAttendance = useCallback(async (envId: string, studentId: string, status: 'present' | 'absent') => {
    const env = envelopes.find(e => e.id === envId);
    if (!env) return;
    const updatedStudents = env.students.map(s => s.id === studentId ? { ...s, status } : s);
    await updateDoc(doc(db, 'envelopes', envId), { students: updatedStudents });
    if (status === 'absent') {
      const student = env.students.find(s => s.id === studentId);
      addNotification(`غياب فوري: الطالب ${student?.name} في لجنة ${env.committee}`, 'alert');
    }
  }, [envelopes, addNotification]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0086d1] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[#1a2b3c] font-bold">جاري المزامنة مع السحابة...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return <LoginView onLogin={handleLogin} />;

  return (
    <Layout role={role} onLogout={handleLogout}>
      {role === 'MANAGER' || role === 'CONTROL' ? (
        <AdminView role={role} envelopes={envelopes} notifications={notifications} />
      ) : role === 'COUNSELOR' ? (
        <CounselorView envelopes={envelopes} />
      ) : (
        <TeacherView 
          envelopes={envelopes} 
          currentUser={currentUser}
          onUpdateStatus={updateEnvelopeStatus} 
          onUpdateAttendance={updateAttendance} 
        />
      )}
    </Layout>
  );
};

export default App;
