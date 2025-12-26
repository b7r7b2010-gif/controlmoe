
import React from 'react';
import { ExamEnvelope, Student } from '../types';
import { Calendar, Search, CheckCircle2, AlertTriangle, PhoneCall } from 'lucide-react';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 text-right">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center">
             <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1a2b3c]">لوحة متابعة الغياب</h2>
            <p className="text-sm text-gray-400 font-medium">متابعة فورية للطلاب الغائبين والتواصل مع أولياء الأمور</p>
          </div>
        </div>
        <div className="relative">
          <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value="26/12/2025" className="bg-gray-50 border border-gray-200 rounded-2xl py-3 pr-12 pl-6 text-sm font-black w-48 outline-none focus:ring-4 focus:ring-blue-100" readOnly />
        </div>
      </div>

      <div className="bg-white p-12 rounded-[40px] shadow-sm border border-gray-100 text-center min-h-[400px] flex flex-col items-center justify-center space-y-6">
        {absentStudents.length === 0 ? (
          <>
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#1a2b3c]">لا يوجد غياب اليوم!</h3>
              <p className="text-gray-400 font-medium">جميع الطلاب حاضرون للاختبارات في التاريخ المحدد.</p>
            </div>
          </>
        ) : (
          <div className="w-full space-y-4">
            {absentStudents.map(student => (
              <div key={student.id} className="bg-red-50/50 border border-red-100 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 font-black">!</div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">{student.name}</p>
                    <p className="text-xs text-red-600 font-bold">غائب في لجنة {student.committee} - {student.subject}</p>
                  </div>
                </div>
                <button className="bg-white p-4 rounded-2xl text-green-600 shadow-sm hover:shadow-md transition">
                   <PhoneCall className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CounselorView;
