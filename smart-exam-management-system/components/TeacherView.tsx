
import React, { useState, useMemo } from 'react';
import { ExamEnvelope, EnvelopeStatus, Teacher, Student } from '../types';
import { QrCode, ClipboardCheck, Send, Camera, User, CheckCircle2, XCircle, Activity, ShieldCheck, GraduationCap } from 'lucide-react';

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

  const committees = Array.from({ length: 15 }, (_, i) => i + 1);

  const simulateScan = (committeeId: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const env = envelopes.find(e => e.committee === committeeId);
      if (env) {
        setSelectedEnv(env);
        onUpdateStatus(env.id, EnvelopeStatus.RECEIVED_BY_TEACHER, currentUser.name);
        setActiveTab('attendance');
      } else {
        alert("لم يتم العثور على لجنة بهذا الرقم.");
      }
    }, 1000);
  };

  // Grouping students by grade for visual separation
  const groupedStudents = useMemo(() => {
    if (!selectedEnv) return {};
    return selectedEnv.students.reduce((acc, student) => {
      if (!acc[student.grade]) acc[student.grade] = [];
      acc[student.grade].push(student);
      return acc;
    }, {} as Record<string, Student[]>);
  }, [selectedEnv]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700" dir="rtl">
      {activeTab === 'scan' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 min-h-[750px] rounded-[60px] overflow-hidden flex flex-col p-12 text-white shadow-3xl relative border border-white/10">
          <div className="text-center space-y-6 mb-16 relative z-10">
            <h2 className="text-4xl font-black tracking-tight">استلام المظروف</h2>
            <div className="bg-white/10 backdrop-blur-md inline-flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <p className="text-lg font-black">أهلاً، أستاذ {currentUser.name}</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center mb-16 relative">
            <div className="w-80 h-80 border-2 border-blue-500/30 rounded-[64px] relative overflow-hidden flex items-center justify-center bg-white/5 backdrop-blur-2xl group shadow-2xl">
              <Camera className="w-24 h-24 text-blue-500/20 group-hover:text-blue-500/40 transition-all duration-700" />
              {isScanning && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center">
                  <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-3xl rounded-[48px] p-10 border border-white/10 shadow-2xl">
            <p className="text-[10px] text-center font-black text-slate-500 mb-8 tracking-[0.4em] uppercase">الاختيار اليدوي للجان</p>
            <div className="grid grid-cols-2 gap-5">
              {committees.slice(0, 10).map(num => (
                <button key={num} onClick={() => simulateScan(num.toString())} className="bg-white/5 hover:bg-blue-600 hover:text-white p-6 rounded-[32px] flex items-center justify-center gap-4 text-sm font-black transition-all border border-white/5 shadow-lg">لجنة {num}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && selectedEnv && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
           <div className="bg-white rounded-[50px] shadow-2xl border border-white overflow-hidden">
             <div className="bg-gradient-to-r from-[#0086d1] to-[#00a8ff] p-10 text-white relative">
                <div className="relative z-10 flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black">لجنة {selectedEnv.committee} - {selectedEnv.subject}</h2>
                    <p className="opacity-90 font-bold text-sm">{selectedEnv.period} | {selectedEnv.venue}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl font-black text-xs border border-white/20">
                     {selectedEnv.students.filter(s => s.status === 'absent').length} غياب
                  </div>
                </div>
             </div>
             <div className="p-8 space-y-8 bg-slate-50/50">
                <div className="flex items-center gap-3 p-5 bg-blue-50 text-blue-800 rounded-3xl text-[11px] font-black border border-blue-100 shadow-sm">
                   <Activity className="w-5 h-5 animate-pulse" /> التحضير مفرز تلقائياً حسب الصف لضمان دقة استلام الأوراق.
                </div>
                
                {Object.keys(groupedStudents).map(grade => (
                  <div key={grade} className="space-y-4">
                    {/* Grade Divider */}
                    <div className="flex items-center gap-4 px-2">
                      <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center text-blue-600"><GraduationCap className="w-6 h-6" /></div>
                      <h3 className="font-black text-slate-800 text-lg">{grade}</h3>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    <div className="space-y-4">
                      {groupedStudents[grade].map(student => (
                        <div key={student.id} className="bg-white p-6 rounded-[32px] flex items-center justify-between border border-slate-100 transition-all hover:shadow-xl group">
                           <div className="flex items-center gap-5">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${student.status === 'present' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}><User className="w-6 h-6" /></div>
                              <div className="text-right">
                                <p className="font-black text-slate-800 text-lg leading-tight">{student.name}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1">رقم الجلوس: <span className="text-blue-600 font-black">#{student.id}</span></p>
                              </div>
                           </div>
                           <div className="flex gap-3">
                              <button onClick={() => onUpdateAttendance(selectedEnv.id, student.id, 'present')} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[10px] font-black transition-all ${student.status === 'present' ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border hover:bg-slate-100'}`}><CheckCircle2 className="w-4 h-4" /> حاضر</button>
                              <button onClick={() => onUpdateAttendance(selectedEnv.id, student.id, 'absent')} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[10px] font-black transition-all ${student.status === 'absent' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border hover:bg-slate-100'}`}><XCircle className="w-4 h-4" /> غائب</button>
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

      {activeTab === 'submit' && selectedEnv && (
        <div className="bg-white p-14 rounded-[60px] shadow-3xl border border-white text-center space-y-12 animate-in slide-in-from-bottom-12 duration-700">
           <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto text-white shadow-2xl animate-bounce"><Send className="w-16 h-16 -mr-2" /></div>
           <div className="space-y-4">
             <h3 className="text-4xl font-black text-slate-800">إقفال اللجنة</h3>
             <p className="text-slate-400 font-bold text-lg max-w-sm mx-auto leading-relaxed">تأكد من فرز الأوراق حسب المرحلة (أول، ثاني، ثالث) قبل تسليم المظروف.</p>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div className="bg-green-50 p-8 rounded-[40px] border border-green-100"><p className="text-[10px] text-green-600 font-black mb-2 uppercase tracking-widest">إجمالي الحضور</p><p className="text-5xl font-black text-green-700">{selectedEnv.students.filter(s => s.status === 'present').length}</p></div>
              <div className="bg-red-50 p-8 rounded-[40px] border border-red-100"><p className="text-[10px] text-red-600 font-black mb-2 uppercase tracking-widest">إجمالي الغياب</p><p className="text-5xl font-black text-red-700">{selectedEnv.students.filter(s => s.status === 'absent').length}</p></div>
           </div>
           <button onClick={() => onUpdateStatus(selectedEnv.id, EnvelopeStatus.SUBMITTED_TO_CONTROL, currentUser.name)} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 rounded-[32px] text-2xl font-black shadow-2xl transition hover:scale-[1.02] active:scale-95">تأكيد الإرسال للكنترول</button>
        </div>
      )}

      <div className="fixed bottom-10 left-10 right-10 h-28 bg-white/70 backdrop-blur-3xl rounded-[55px] shadow-2xl border border-white/50 flex items-center justify-around px-10 z-50">
        {[
          { id: 'scan', icon: QrCode, label: 'مسح المظروف' },
          { id: 'attendance', icon: ClipboardCheck, label: 'كشف التحضير' },
          { id: 'submit', icon: Send, label: 'إقفال اللجنة' }
        ].map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-3 p-5 rounded-[40px] transition-all duration-700 ${activeTab === item.id ? 'bg-[#0086d1] text-white -translate-y-16 shadow-2xl scale-110' : 'text-slate-400 hover:scale-125'}`}><item.icon className="w-7 h-7" />{activeTab === item.id && <span className="text-[10px] font-black tracking-widest uppercase">{item.label}</span>}</button>
        ))}
      </div>
    </div>
  );
};

const AlertCircle = ({className}: {className?: string}) => <Activity className={className} />;

export default TeacherView;
