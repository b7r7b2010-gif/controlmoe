import React, { useState, useEffect, useRef } from 'react';
import { ExamEnvelope, EnvelopeStatus, Notification, Teacher, UserRole, Student } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import { generateSmartReport } from '../services/geminiService';
import { 
  ClipboardList, Users, BookOpen, Scan, MapPin, 
  CheckCircle2, Calendar, QrCode, LayoutDashboard, 
  AlertCircle, Users2, Activity, Bell, FileSpreadsheet, Filter, Camera,
  Printer, Clock, Settings, X, Check, Info, Sparkles, GraduationCap, ToggleRight, ToggleLeft,
  Loader2, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ScheduleSession {
  id: string;
  date: string;
  period: 'الأولى' | 'الثانية';
  startTime: string;
  endTime: string;
  subject: string;
  isActive: boolean;
}

interface AdminViewProps {
  role: UserRole;
  envelopes: ExamEnvelope[];
  notifications: Notification[];
}

const AdminView: React.FC<AdminViewProps> = ({ role, envelopes, notifications }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'committees' | 'teachers' | 'students' | 'alerts'>(role === 'MANAGER' ? 'dashboard' : 'committees');
  const [dbTeachers, setDbTeachers] = useState<Teacher[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [smartReport, setSmartReport] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'teachers' | 'envelopes' | null>(null);
  
  const [startDate, setStartDate] = useState('2025-12-26');
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);

  useEffect(() => {
    if (activeTab === 'teachers') {
      getDocs(collection(db, 'teachers')).then(snap => setDbTeachers(snap.docs.map(doc => doc.data() as Teacher)));
    }
  }, [activeTab]);

  const handleSmartReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateSmartReport(envelopes);
      setSmartReport(report);
    } catch (error) {
      alert("تعذر إنشاء التقرير حالياً.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getGradeStyle = (grade: string) => {
    const g = grade.toLowerCase();
    if (g.includes('أول')) return 'border-blue-200 bg-blue-50 text-blue-700';
    if (g.includes('ثان')) return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    if (g.includes('ثالث')) return 'border-purple-200 bg-purple-50 text-purple-700';
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };

  const initSessions = (baseDate: string) => {
    const newSessions: ScheduleSession[] = [];
    const subjects = ['رياضيات', 'كفايات لغوية', 'لغة إنجليزية', 'كيمياء', 'فيزياء'];
    for (let i = 0; i < 5; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      newSessions.push({
        id: `s-${i}-1`, date: dateStr, period: 'الأولى', startTime: '07:30', endTime: '10:00', subject: subjects[i] || '', isActive: true
      });
      newSessions.push({
        id: `s-${i}-2`, date: dateStr, period: 'الثانية', startTime: '10:30', endTime: '12:30', subject: '', isActive: i === 0 
      });
    }
    setSessions(newSessions);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'teachers' | 'envelopes') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const batch = writeBatch(db);
        if (type === 'teachers') {
          jsonData.forEach((row: any) => {
            const id = String(row['رقم المعلم'] || row['رقم الموظف'] || '');
            const name = String(row['اسم المعلم'] || '');
            if (id && name) batch.set(doc(db, 'teachers', id), { id, name, phone: String(row['الجوال'] || ''), qrCode: `T_${id}`, committees: [] });
          });
        } else {
          const committeesMap = new Map<string, ExamEnvelope>();
          jsonData.forEach((row: any) => {
            const committeeNum = String(row['اللجنة'] || row['رقم اللجنة'] || '1');
            const student: Student = {
              id: String(row['رقم الجلوس'] || ''), name: String(row['اسم الطالب'] || ''), grade: String(row['الصف'] || ''), classroom: String(row['الفصل'] || ''), phone: String(row['رقم الجوال'] || ''), status: 'pending', photo: ''
            };
            if (!committeesMap.has(committeeNum)) {
              committeesMap.set(committeeNum, { id: `TEMP_${committeeNum}`, qrCode: `QR_${committeeNum}`, subject: 'بانتظار الجدولة', committee: committeeNum, venue: String(row['المقر'] || 'القاعة'), startTime: '--:--', endTime: '--:--', date: 'غير مجدول', status: 'بانتظار الجدولة', students: [student] });
            } else committeesMap.get(committeeNum)?.students.push(student);
          });
          committeesMap.forEach(env => batch.set(doc(db, 'envelopes', env.id), env));
        }
        await batch.commit();
        alert("تم استيراد البيانات!");
        if (type === 'envelopes') setShowScheduleModal(true);
      } catch (err) { alert("خطأ في قراءة الملف."); } finally { setIsImporting(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateEnvelopesFromSchedule = async () => {
    setIsImporting(true);
    try {
      const activeSessions = sessions.filter(s => s.isActive && s.subject);
      const templates = envelopes.filter(e => e.id.startsWith('TEMP_'));
      const batch = writeBatch(db);
      activeSessions.forEach(session => {
        templates.forEach(template => {
          const newId = `ENV_${session.id}_${template.committee}`;
          batch.set(doc(db, 'envelopes', newId), { ...template, id: newId, subject: session.subject, date: session.date, startTime: session.startTime, endTime: session.endTime, status: EnvelopeStatus.NOT_RECEIVED, period: `الفترة ${session.period}` });
        });
      });
      templates.forEach(t => batch.delete(doc(db, 'envelopes', t.id)));
      await batch.commit();
      setShowScheduleModal(false);
    } catch (error) { alert("خطأ في التوليد."); } finally { setIsImporting(false); }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 relative">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => importType && handleExcelUpload(e, importType)} />
      
      {/* Smart Report Modal */}
      {smartReport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setSmartReport(null)}></div>
          <div className="relative bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6" />
                <h2 className="text-xl font-black">التقرير الذكي لسير الاختبارات</h2>
              </div>
              <button onClick={() => setSmartReport(null)} className="hover:bg-white/10 p-2 rounded-xl transition"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-10 max-h-[70vh] overflow-y-auto markdown-content">
              {smartReport.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <div className="p-6 border-t flex justify-end gap-4 bg-slate-50">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-100"><Printer className="w-4 h-4" /> طباعة التقرير</button>
              <button onClick={() => setSmartReport(null)} className="px-8 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowScheduleModal(false)}></div>
          <div className="relative bg-[#f1f5f9] w-full max-w-5xl rounded-[32px] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1e293b] p-6 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <Settings className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-black">إعداد جدول الاختبارات</h2>
               </div>
               <button onClick={() => setShowScheduleModal(false)} className="hover:bg-white/10 p-2 rounded-xl transition"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                 <label className="text-xs font-black text-slate-500 block mb-3">تاريخ بداية الاختبارات</label>
                 <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); initSessions(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-6 font-bold" />
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-400 font-black border-b">
                    <tr><th className="p-4">التاريخ</th><th className="p-4">الفترة</th><th className="p-4">المادة</th><th className="p-4 text-center">تنشيط</th></tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className={!s.isActive ? 'opacity-40' : ''}>
                        <td className="p-4">{s.date}</td>
                        <td className="p-4">الفترة {s.period}</td>
                        <td className="p-4"><input type="text" value={s.subject} onChange={(e) => setSessions(prev => prev.map(x => x.id === s.id ? {...x, subject: e.target.value} : x))} className="bg-transparent border-b w-full" /></td>
                        <td className="p-4 text-center"><button onClick={() => setSessions(prev => prev.map(x => x.id === s.id ? {...x, isActive: !x.isActive} : x))}>{s.isActive ? <ToggleRight className="text-green-500" /> : <ToggleLeft />}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 bg-white border-t flex justify-center"><button onClick={generateEnvelopesFromSchedule} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black">اعتماد المظاريف</button></div>
          </div>
        </div>
      )}

      <aside className="lg:w-72 shrink-0">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-xl border border-white sticky top-24 p-3 space-y-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon className="w-5 h-5" /><span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-[#0086d1] to-[#00a8ff] rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black">مرحباً بك في لوحة القيادة</h2>
                    <p className="opacity-80 mt-2 font-bold">النظام الذكي يحلل البيانات لحظياً لضمان سير الاختبارات.</p>
                  </div>
                  <button 
                    onClick={handleSmartReport}
                    disabled={isGeneratingReport}
                    className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:scale-105 transition disabled:opacity-50"
                  >
                    {isGeneratingReport ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    توليد تقرير ذكي (Gemini)
                  </button>
                </div>
                <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'المظاريف المعتمدة', val: envelopes.filter(e => !e.id.startsWith('TEMP_')).length, color: 'bg-blue-600', icon: ClipboardList },
                { label: 'الطلاب المسجلين', val: envelopes.reduce((acc, e) => acc + e.students.length, 0), color: 'bg-indigo-600', icon: Users2 },
                { label: 'الحضور المباشر', val: envelopes.reduce((acc, e) => acc + e.students.filter(s => s.status === 'present').length, 0), color: 'bg-green-600', icon: Activity },
                { label: 'الغياب المرصود', val: envelopes.reduce((acc, e) => acc + e.students.filter(s => s.status === 'absent').length, 0), color: 'bg-red-600', icon: AlertCircle },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-white flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="text-right"><p className="text-[10px] text-slate-400 font-black mb-1 uppercase tracking-widest">{stat.label}</p><p className="text-4xl font-black text-slate-800">{stat.val}</p></div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${stat.color}`}><stat.icon className="w-7 h-7" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
           <div className="bg-white rounded-[48px] shadow-sm border border-white overflow-hidden">
              <div className="p-10 border-b flex justify-between items-center bg-slate-50/30">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800">سجل الطلاب والفرز العام</h2>
                    <p className="text-xs text-slate-400 font-bold mt-1 tracking-tight flex items-center gap-2"><GraduationCap className="w-4 h-4" /> فرز تلقائي حسب المرحلة</p>
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                       <tr><th className="p-8">رقم الجلوس</th><th className="p-8">اسم الطالب</th><th className="p-8">الصف</th><th className="p-8">اللجنة</th><th className="p-8">الحالة</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {envelopes.flatMap(env => env.students.map(s => (
                         <tr key={s.id} className="hover:bg-blue-50/10 transition-colors">
                            <td className="p-8 font-mono font-black text-blue-600">#{s.id}</td>
                            <td className="p-8 font-black text-slate-700">{s.name}</td>
                            <td className="p-8"><span className={`px-4 py-2 rounded-xl text-xs font-black border ${getGradeStyle(s.grade)}`}>{s.grade}</span></td>
                            <td className="p-8"><span className="bg-slate-100 px-4 py-2 rounded-xl font-black text-xs">لجنة {env.committee}</span></td>
                            <td className="p-8"><span className={`px-4 py-2 rounded-xl text-[10px] font-black ${s.status === 'present' ? 'bg-green-50 text-green-600' : s.status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>{s.status === 'present' ? 'حاضر' : s.status === 'absent' ? 'غائب' : 'لم يحضر'}</span></td>
                         </tr>
                       )))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'committees' && (
           <div className="space-y-8">
              <div className="bg-white/80 backdrop-blur-md p-10 rounded-[48px] shadow-sm border border-white flex flex-col lg:flex-row justify-between items-center gap-8">
                 <div className="text-right space-y-2">
                    <h2 className="text-3xl font-black text-slate-800">إدارة اللجان والجدولة</h2>
                    <p className="text-slate-400 font-medium tracking-tight">استورد ملف اللجان أولاً، ثم قم بإعداد الجدول.</p>
                 </div>
                 <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => { setImportType('envelopes'); fileInputRef.current?.click(); }} className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl text-sm font-black shadow-lg transition hover:-translate-y-1"><FileSpreadsheet className="w-5 h-5" /> استيراد اللجان</button>
                    {envelopes.some(e => e.id.startsWith('TEMP_')) && (
                      <button onClick={() => { initSessions(startDate); setShowScheduleModal(true); }} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black shadow-lg transition hover:-translate-y-1"><Calendar className="w-5 h-5" /> إعداد الجدول</button>
                    )}
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {envelopes.filter(e => !e.id.startsWith('TEMP_')).map(env => (
                   <div key={env.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="space-y-6">
                         <div className="flex justify-between items-center"><div className="bg-blue-600 text-white px-5 py-1.5 rounded-xl font-black text-xs">لجنة {env.committee}</div><QrCode className="text-slate-200 group-hover:text-blue-600 transition-colors w-8 h-8" /></div>
                         <div><h4 className="text-xl font-black text-slate-800">{env.subject}</h4><p className="text-[10px] text-slate-400 font-black mt-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> {env.venue} | {env.students.length} طالب</p></div>
                         <div className="flex gap-3"><div className={`flex-1 py-3 rounded-2xl text-center text-[10px] font-black border ${env.status === EnvelopeStatus.SUBMITTED_TO_CONTROL ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{env.status}</div><button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Printer className="w-5 h-5" /></button></div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const navItems = [
  { id: 'dashboard', label: 'لوحة المتابعة', icon: LayoutDashboard },
  { id: 'committees', label: 'اللجان والجدولة', icon: ClipboardList },
  { id: 'teachers', label: 'المعلمون', icon: Users },
  { id: 'students', label: 'الطلاب والفرز', icon: BookOpen },
  { id: 'alerts', label: 'التنبيهات', icon: Bell },
];

export default AdminView;