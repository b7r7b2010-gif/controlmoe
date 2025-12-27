
import React from 'react';
import { ExamEnvelope, Student } from '../types';
import { Calendar, CheckCircle2, PhoneCall, Phone, UserX } from 'lucide-react';

interface CounselorViewProps {
  envelopes: ExamEnvelope[];
}

const CounselorView: React.FC<CounselorViewProps> = ({ envelopes }) => {
  const absentStudents = envelopes.flatMap(env => 
    env.students
      .filter(s => s.status === 'absent')
      .map(s => ({ ...s, committee: env.committee, subject: env.subject }))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <div className="bg-white p-10 rounded-[48px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6 text-right">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center shadow-inner">
             <UserX className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800">متابعة غياب الطلاب</h2>
            <p className="text-slate-400 font-bold mt-1 tracking-tight">قائمة الطلاب الغائبين المطلوب التواصل مع أولياء أمورهم</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 px-8 flex items-center gap-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="font-black text-slate-800 tracking-tighter">{new Date().toLocaleDateString('ar-SA')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {absentStudents.length === 0 ? (
          <div className="lg:col-span-2 bg-white p-20 rounded-[48px] shadow-sm border border-slate-100 text-center space-y-6">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800">انضباط تام!</h3>
              <p className="text-slate-400 font-bold">لم يتم رصد أي حالات غياب في اللجان النشطة حتى الآن.</p>
            </div>
          </div>
        ) : (
          absentStudents.map(student => (
            <div key={student.id} className="bg-white p-8 rounded-[40px] border border-red-50 shadow-sm hover:shadow-xl transition-all flex items-center justify-between group overflow-hidden relative">
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center text-red-500 font-black text-3xl shadow-inner group-hover:bg-red-500 group-hover:text-white transition-all duration-500">
                  {student.classroom || student.id.substring(0, 1)}
                </div>
                <div className="text-right space-y-1">
                  <p className="font-black text-slate-800 text-xl leading-none">{student.name}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">رقم الجلوس: <span className="text-red-500">#{student.id}</span></p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">لجنة {student.committee}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 relative z-10">
                <p className="text-sm font-black text-slate-700 tracking-[0.15em]">{student.phone || 'بدون رقم'}</p>
                <a 
                  href={`tel:${student.phone}`} 
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-black shadow-lg transition transform active:scale-95 ${student.phone ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-200 cursor-not-allowed pointer-events-none text-slate-400'}`}
                >
                  <PhoneCall className="w-5 h-5" />
                  اتصال بولي الأمر
                </a>
              </div>
              <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 -translate-x-10 -translate-y-10 rounded-full"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CounselorView;
