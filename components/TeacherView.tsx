
import React, { useState, useMemo, useEffect } from 'react';
import { ExamEnvelope, EnvelopeStatus, Teacher, Student } from '../types';
import { QrCode, ClipboardCheck, Send, Camera, User, CheckCircle2, XCircle, Activity, ShieldCheck, GraduationCap, MapPin, Clock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TeacherViewProps {
  envelopes: ExamEnvelope[];
  currentUser: Teacher;
  onUpdateStatus: (envId: string, status: EnvelopeStatus, teacherName: string) => void;
  onUpdateAttendance: (envId: string, studentId: string, status: 'present' | 'absent') => void;
}

const TeacherView: React.FC<TeacherViewProps> = ({ envelopes, currentUser, onUpdateStatus, onUpdateAttendance }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'attendance' | 'submit'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<ExamEnvelope | null>(null);

  // تحديث حالة المعلم عند فتح لجنة
  const autoInitializeAttendance = async (env: ExamEnvelope) => {
    const hasPending = env.students.some(s => s.status === 'pending');
    if (hasPending) {
      const allPresent = env.students.map(s => ({ ...s, status: 'present' as const }));
      await updateDoc(doc(db, 'envelopes', env.id), { students: allPresent });
    }
  };

  const startCommittee = async (committeeId: string) => {
    setIsScanning(true);
    setTimeout(async () => {
      setIsScanning(false);
      const env = envelopes.find(e => e.committee === committeeId);
      if (env) {
        setSelectedEnv(env);
        onUpdateStatus(env.id, EnvelopeStatus.RECEIVED_BY_TEACHER, currentUser.name);
        await autoInitializeAttendance(env);
        setActiveTab('attendance');
      } else {
        alert("عذراً، هذه اللجنة غير متوفرة حالياً.");
      }
    }, 800);
  };

  const groupedStudents = useMemo(() => {
    if (!selectedEnv) return {};
    return selectedEnv.students.reduce((acc, student) => {
      const grade = student.grade || 'غير محدد';
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);
      return acc;
    }, {} as Record<string, Student[]>);
  }, [selectedEnv]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32 animate-in fade-in" dir="rtl">
      {activeTab === 'scan' && (
        <div className="bg-slate-900 min-h-[700px] rounded-[65px] overflow-hidden flex flex-col p-12 text-white shadow-3xl border border-white/5 relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 to-transparent"></div>
          
          <div className="text-center space-y-4 mb-12 relative z-10">
            <h2 className="text-4xl font-black tracking-tighter">بوابة الملاحظين</h2>
            <div className="bg-blue-500/20 backdrop-blur-xl inline-flex items-center gap-3 px-6 py-2 rounded-full border border-blue-500/30">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-bold tracking-tight text-blue-100">أهلاً، أستاذ {currentUser.name}</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative z-10">
            <button onClick={() => startCommittee("1")} className="w-72 h-72 border-2 border-dashed border-white/20 rounded-[60px] flex flex-col items-center justify-center gap-6 group transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-12 h-12 text-blue-500" />
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">امسح باركود المظروف</p>
              {isScanning && <div className="absolute inset-0 bg-slate-900 rounded-[60px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
            </button>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl rounded-[48px] p-8 border border-white/10 relative z-10">
            <p className="text-[10px] text-center font-black text-slate-500 mb-6 tracking-[0.4em] uppercase">لجانك المكلف بها اليوم</p>
            <div className="grid grid-cols-2 gap-4">
               {envelopes.filter(e => e.teacherId === currentUser.id).map(e => (
                 <button key={e.id} onClick={() => startCommittee(e.committee)} className="bg-white/5 hover:bg-blue-600 p-5 rounded-[28px] text-right space-y-1 transition-all border border-white/5 group">
                    <p className="text-[10px] font-black text-blue-400 group-hover:text-blue-100">لجنة رقم {e.committee}</p>
                    <p className="font-black text-sm">{e.venue}</p>
                 </button>
               ))}
               {envelopes.filter(e => e.teacherId === currentUser.id).length === 0 && (
                 <p className="col-span-2 text-center text-slate-500 font-bold text-xs py-4 italic">لا يوجد تكليفات مسجلة حالياً</p>
               )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && selectedEnv && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
           <div className="bg-white rounded-[55px] shadow-2xl overflow-hidden border border-slate-100">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tighter">لجنة {selectedEnv.committee}</h2>
                    <div className="flex items-center gap-3 opacity-60 text-xs font-bold">
                       <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedEnv.venue}</span>
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedEnv.startTime} - {selectedEnv.endTime}</span>
                    </div>
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">الغياب المرصود</p>
                    <p className="text-3xl font-black text-red-500">{selectedEnv.students.filter(s => s.status === 'absent').length}</p>
                 </div>
              </div>

              <div className="p-8 space-y-8">
                 <div className="flex items-center gap-3 p-5 bg-green-50 text-green-700 rounded-3xl text-[11px] font-black border border-green-100">
                    <CheckCircle2 className="w-5 h-5" /> النظام يفترض حضور الجميع تلقائياً. المس الطالب الغائب فقط.
                 </div>

                 {Object.keys(groupedStudents).map(grade => (
                    <div key={grade} className="space-y-4">
                       <div className="flex items-center gap-3 px-2">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                          <h3 className="font-black text-slate-800 tracking-tighter">{grade}</h3>
                          <div className="flex-1 h-px bg-slate-100"></div>
                       </div>
                       <div className="grid gap-3">
                          {groupedStudents[grade].map(student => (
                             <div 
                               key={student.id} 
                               onClick={() => onUpdateAttendance(selectedEnv.id, student.id, student.status === 'present' ? 'absent' : 'present')}
                               className={`p-5 rounded-[30px] flex items-center justify-between border-2 cursor-pointer transition-all duration-300 transform active:scale-95 ${student.status === 'present' ? 'bg-white border-green-500/10 shadow-sm' : 'bg-red-50 border-red-500/30'}`}
                             >
                                <div className="flex items-center gap-4">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${student.status === 'present' ? 'bg-green-500 text-white' : 'bg-red-600 text-white animate-pulse'}`}>
                                      {student.status === 'present' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                   </div>
                                   <div className="text-right">
                                      <p className={`font-black text-lg leading-tight ${student.status === 'present' ? 'text-slate-800' : 'text-red-900'}`}>{student.name}</p>
                                      <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">مقعد: <span className="text-blue-600">#{student.id}</span></p>
                                   </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${student.status === 'present' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-white shadow-sm'}`}>
                                   {student.status === 'present' ? 'حاضر' : 'غائب'}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Navigation Dock */}
      <div className="fixed bottom-10 left-10 right-10 h-24 bg-white/80 backdrop-blur-3xl rounded-[50px] shadow-2xl border border-white/50 flex items-center justify-around px-8 z-50">
        {[
          { id: 'scan', icon: QrCode, label: 'المظروف' },
          { id: 'attendance', icon: ClipboardCheck, label: 'التحضير' },
          { id: 'submit', icon: Send, label: 'إرسال' }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all ${activeTab === item.id ? 'bg-slate-900 text-white -translate-y-8 shadow-2xl' : 'text-slate-400'}`}
          >
            <item.icon className="w-6 h-6" />
            {activeTab === item.id && <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TeacherView;
