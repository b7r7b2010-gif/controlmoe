
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExamEnvelope, EnvelopeStatus, Teacher, UserRole, Student } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, writeBatch, deleteDoc, onSnapshot, updateDoc, query, where, deleteField } from 'firebase/firestore';
import { 
  Users, QrCode, Sparkles, Trash2, Printer, Settings, Plus, 
  Table as TableIcon, FileText, Layers, CheckCircle2, 
  RefreshCw, Eye, FileSpreadsheet, Download, Trash, MoreVertical,
  ShieldCheck, Save, Edit3, MapPin, MessageCircle, Clock, Calendar as CalendarIcon,
  X, ChevronRight, GraduationCap, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

type AdminTab = 'students' | 'distribution' | 'invigilators' | 'printing';

interface ScheduleSlot {
  id: string;
  date: string;
  period: 'الفترة الأولى' | 'الفترة الثانية';
  from: string;
  to: string;
  subject: string;
}

const AdminView: React.FC<{ role: UserRole; envelopes: ExamEnvelope[] }> = ({ role, envelopes }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('invigilators');
  const [isProcessing, setIsProcessing] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Schedule State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([
    { id: '1', date: '', period: 'الفترة الأولى', from: '07:30', to: '10:00', subject: 'رياضيات' },
    { id: '2', date: '', period: 'الفترة الثانية', from: '10:30', to: '12:30', subject: 'كفايات لغوية' },
    { id: '3', date: '', period: 'الفترة الأولى', from: '07:30', to: '10:00', subject: 'لغة إنجليزية' },
  ]);

  const [importStep, setImportStep] = useState<'idle' | 'teacher_mapping' | 'student_mapping'>('idle');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [rawSheetData, setRawSheetData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time Sync
  useEffect(() => {
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(doc => doc.data() as Teacher));
    });
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => doc.data() as Student));
    });
    return () => { unsubTeachers(); unsubStudents(); };
  }, []);

  // Auto-calculate schedule dates
  useEffect(() => {
    const newSchedule = schedule.map((slot, index) => {
      const d = new Date(startDate);
      const dayOffset = Math.floor(index / 2);
      d.setDate(d.getDate() + dayOffset);
      return { ...slot, date: d.toISOString().split('T')[0] };
    });
    setSchedule(newSchedule);
  }, [startDate]);

  const activeCommittees = useMemo(() => 
    envelopes.filter(e => e.id.startsWith('COM_'))
      .sort((a, b) => parseInt(a.committee) - parseInt(b.committee)), 
  [envelopes]);

  // --- Functions ---
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'teachers' | 'students') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (data.length > 0) {
        setRawSheetData(data);
        setSheetHeaders(Object.keys(data[0] as object));
        setImportStep(type === 'teachers' ? 'teacher_mapping' : 'student_mapping');
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearAllTeachers = async () => {
    if (!window.confirm("سيتم حذف جميع المعلمين وتصفير التكليفات نهائياً. هل أنت متأكد؟")) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const tSnap = await getDocs(collection(db, 'teachers'));
      tSnap.docs.forEach(d => batch.delete(d.ref));
      
      const eSnap = await getDocs(collection(db, 'envelopes'));
      eSnap.docs.forEach(d => batch.update(d.ref, { teacherId: deleteField(), teacherName: deleteField() }));
      
      await batch.commit();
      alert("تم الحذف بنجاح.");
    } catch (e) { alert("حدث خطأ."); }
    finally { setIsProcessing(false); }
  };

  const processImport = async (type: 'teachers' | 'students') => {
    setIsProcessing(true);
    const batch = writeBatch(db);
    rawSheetData.forEach((row: any) => {
      const id = String(row[mapping.id] || '').trim();
      const name = String(row[mapping.name] || '').trim();
      if (id && name) {
        if (type === 'teachers') {
          batch.set(doc(db, 'teachers', id), { id, name, phone: String(row[mapping.phone] || ''), qrCode: id });
        } else {
          batch.set(doc(db, 'students', id), { id, name, grade: String(row[mapping.grade] || ''), classroom: String(row[mapping.classroom] || ''), status: 'pending' });
        }
      }
    });
    await batch.commit();
    setImportStep('idle');
    setIsProcessing(false);
  };

  const autoDistribute = async () => {
    if (students.length === 0) return alert("يرجى استيراد الطلاب أولاً.");
    setIsProcessing(true);
    const batch = writeBatch(db);
    const studentsPerCommittee = 20;
    const totalCommittees = Math.ceil(students.length / studentsPerCommittee);

    // Clear existing committees
    const oldEnvelopes = await getDocs(collection(db, 'envelopes'));
    oldEnvelopes.docs.forEach(d => batch.delete(d.ref));

    for (let i = 0; i < totalCommittees; i++) {
      const start = i * studentsPerCommittee;
      const committeeStudents = students.slice(start, start + studentsPerCommittee);
      const committeeId = `COM_${i + 1}`;
      
      batch.set(doc(db, 'envelopes', committeeId), {
        id: committeeId,
        committee: String(i + 1),
        qrCode: committeeId,
        status: EnvelopeStatus.NOT_RECEIVED,
        students: committeeStudents,
        venue: `قاعة ${i + 1}`,
        subject: 'سيتم تحديده من الجدول',
        startTime: '07:30',
        endTime: '10:00',
        date: startDate
      });
    }
    await batch.commit();
    setIsProcessing(false);
    alert(`تم توزيع ${students.length} طالب على ${totalCommittees} لجنة.`);
  };

  const applySchedule = async () => {
    if (activeCommittees.length === 0) return alert("يرجى توزيع اللجان أولاً.");
    setIsProcessing(true);
    const batch = writeBatch(db);
    const slot = schedule[0];
    activeCommittees.forEach(comm => {
      batch.update(doc(db, 'envelopes', comm.id), {
        date: slot.date,
        startTime: slot.from,
        endTime: slot.to,
        subject: slot.subject,
        period: slot.period
      });
    });
    await batch.commit();
    setIsProcessing(false);
    alert("تم تطبيق الجدول الزمني.");
  };

  return (
    <div className="space-y-10 max-w-[1500px] mx-auto pb-24" dir="rtl">
      
      {/* Tab Navigation */}
      <div className="bg-white/80 p-2 rounded-[35px] flex justify-center gap-2 backdrop-blur-2xl border border-white sticky top-20 z-40 shadow-xl shadow-slate-200/50">
        {[
          { id: 'students', label: 'الطلاب', icon: Users },
          { id: 'distribution', label: 'توزيع اللجان', icon: TableIcon },
          { id: 'invigilators', label: 'الملاحظين والجدول', icon: ShieldCheck },
          { id: 'printing', label: 'الطباعة', icon: Printer }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as AdminTab)}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${activeTab === t.id ? 'bg-[#00b5ad] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <t.icon className="w-5 h-5" />
            <span className="text-sm">{t.label}</span>
          </button>
        ))}
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-white p-12 rounded-[50px] shadow-3xl flex flex-col items-center gap-6">
            <RefreshCw className="w-12 h-12 text-[#00b5ad] animate-spin" />
            <p className="font-black text-slate-800 text-xl tracking-tighter">جاري تنفيذ الأوامر...</p>
          </div>
        </div>
      )}

      {/* Invigilators Tab (Schedule & Teachers) */}
      {activeTab === 'invigilators' && (
        <div className="space-y-12 animate-in fade-in">
           {/* Section 1: Schedule Configuration */}
           <div className="bg-white p-10 md:p-14 rounded-[55px] shadow-2xl border border-slate-100/50">
              <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-14">
                <div className="text-right space-y-3">
                   <h3 className="text-3xl font-black text-slate-800 tracking-tighter">تاريخ بداية الاختبارات</h3>
                   <p className="text-sm text-slate-400 font-bold">تغيير هذا التاريخ سيقوم بإعادة حساب تواريخ الجدول أدناه تلقائياً.</p>
                </div>
                <div className="relative w-full md:w-[400px]">
                   <CalendarIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-300" />
                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[30px] py-6 pr-16 pl-8 font-black text-2xl outline-none focus:border-[#00b5ad]" />
                </div>
              </div>

              <div className="rounded-[45px] border border-slate-100 overflow-hidden shadow-sm bg-white">
                 <table className="w-full text-right">
                    <thead className="bg-slate-50 font-black text-slate-500 text-sm">
                       <tr>
                          <th className="p-8 text-center">التاريخ</th>
                          <th className="p-8">الفترة</th>
                          <th className="p-8 text-center">من</th>
                          <th className="p-8 text-center">إلى</th>
                          <th className="p-8">المادة</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {schedule.map((slot, idx) => (
                          <tr key={slot.id} className="hover:bg-blue-50/20 transition-all">
                             <td className="p-8">
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                   <CalendarIcon className="w-5 h-5 text-slate-300" />
                                   <span className="font-black text-slate-600 text-lg">{new Date(slot.date).toLocaleDateString('ar-SA')}</span>
                                </div>
                             </td>
                             <td className="p-8 font-black text-slate-800 text-2xl">{slot.period}</td>
                             <td className="p-8">
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 justify-center">
                                   <Clock className="w-5 h-5 text-slate-300" />
                                   <input type="text" value={slot.from} className="bg-transparent border-none w-20 text-center font-black text-xl outline-none" onChange={e => {
                                      const n = [...schedule]; n[idx].from = e.target.value; setSchedule(n);
                                   }} />
                                   <span className="text-xs font-black text-slate-400">ص</span>
                                </div>
                             </td>
                             <td className="p-8">
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 justify-center">
                                   <Clock className="w-5 h-5 text-slate-300" />
                                   <input type="text" value={slot.to} className="bg-transparent border-none w-20 text-center font-black text-xl outline-none" onChange={e => {
                                      const n = [...schedule]; n[idx].to = e.target.value; setSchedule(n);
                                   }} />
                                   <span className="text-xs font-black text-slate-400">ص</span>
                                </div>
                             </td>
                             <td className="p-8">
                                <input type="text" value={slot.subject} placeholder="المادة..." className="w-full bg-transparent border-none font-bold text-slate-400 text-xl outline-none" onChange={e => {
                                    const n = [...schedule]; n[idx].subject = e.target.value; setSchedule(n);
                                }} />
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              <div className="flex justify-end gap-5 mt-10">
                 <button onClick={clearAllTeachers} className="bg-red-50 text-red-600 px-8 py-5 rounded-[24px] font-black flex items-center gap-4 hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 className="w-6 h-6" /> مسح المعلمين نهائياً
                 </button>
                 <button onClick={applySchedule} className="bg-slate-900 text-white px-14 py-5 rounded-[24px] font-black text-xl shadow-2xl">اعتماد المواعيد</button>
              </div>
           </div>

           {/* Section 2: Teacher List */}
           <div className="bg-white rounded-[55px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-10 bg-slate-50/30 flex justify-between items-center border-b border-slate-50">
                 <h2 className="text-3xl font-black text-slate-800 tracking-tighter">كادر الملاحظين ({teachers.length})</h2>
                 <button onClick={() => { setMapping({}); fileInputRef.current?.click(); }} className="bg-[#0086d1] text-white px-10 py-5 rounded-[24px] font-black shadow-lg flex items-center gap-4">
                   <FileSpreadsheet className="w-6 h-6" /> استيراد المعلمين
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={e => handleFileUpload(e, 'teachers')} />
              </div>

              {importStep === 'teacher_mapping' && (
                <div className="m-10 p-10 bg-blue-50 rounded-[40px] border-4 border-white shadow-xl space-y-10">
                   <h3 className="text-2xl font-black">مطابقة أعمدة المعلمين</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {['id', 'name', 'phone'].map(f => (
                         <div key={f} className="space-y-3">
                            <label className="text-xs font-black text-blue-400 uppercase tracking-widest">{f === 'id' ? 'الرقم الوظيفي' : f === 'name' ? 'الاسم' : 'الجوال'}</label>
                            <select className="w-full bg-white border-none rounded-2xl p-5 font-black text-slate-700 shadow-sm" onChange={e => setMapping({...mapping, [f]: e.target.value})}>
                               <option value="">-- اختر --</option>
                               {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                         </div>
                      ))}
                   </div>
                   <button onClick={() => processImport('teachers')} className="w-full bg-blue-600 text-white py-6 rounded-[24px] font-black text-xl">بدء الاستيراد</button>
                </div>
              )}

              <table className="w-full text-right">
                 <thead>
                    <tr className="bg-white border-b border-slate-50 font-black text-slate-400 text-[11px] uppercase tracking-widest">
                       <th className="p-10">المعلم</th>
                       <th className="p-10">الرقم الوظيفي</th>
                       <th className="p-10">التكليفات</th>
                       <th className="p-10">تواصل</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {teachers.map(t => (
                       <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-10 font-black text-xl text-slate-800">{t.name}</td>
                          <td className="p-10 font-black text-slate-400 text-lg">#{t.id}</td>
                          <td className="p-10">
                             <div className="flex flex-wrap gap-2">
                                {activeCommittees.filter(c => c.teacherId === t.id).map(c => (
                                   <span key={c.id} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black">لجنة {c.committee}</span>
                                ))}
                             </div>
                          </td>
                          <td className="p-10">
                             <button className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm"><MessageCircle className="w-6 h-6" /></button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="space-y-12 animate-in fade-in">
           <div className="bg-white p-12 rounded-[55px] shadow-2xl border border-slate-100 flex justify-between items-center">
              <div className="space-y-2">
                 <h2 className="text-4xl font-black text-slate-800 tracking-tighter">إدارة الطلاب ({students.length})</h2>
                 <p className="text-slate-400 font-bold">استورد قائمة الطلاب من ملف إكسل لتوزيعهم على اللجان</p>
              </div>
              <button onClick={() => { setMapping({}); fileInputRef.current?.click(); }} className="bg-blue-600 text-white px-10 py-5 rounded-[24px] font-black shadow-lg flex items-center gap-4">
                 <FileSpreadsheet className="w-6 h-6" /> استيراد الطلاب (Excel)
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={e => handleFileUpload(e, 'students')} />
           </div>

           {importStep === 'student_mapping' && (
             <div className="bg-white p-14 rounded-[55px] shadow-2xl border-4 border-blue-50 space-y-12">
                <h3 className="text-2xl font-black text-blue-900">تخطيط أعمدة ملف الطلاب</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   {['id', 'name', 'grade', 'classroom'].map(f => (
                      <div key={f} className="space-y-3">
                         <label className="text-xs font-black text-blue-400 uppercase tracking-widest">{f === 'id' ? 'رقم الجلوس' : f === 'name' ? 'الاسم' : f === 'grade' ? 'الصف' : 'الفصل'}</label>
                         <select className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-slate-700 outline-none" onChange={e => setMapping({...mapping, [f]: e.target.value})}>
                            <option value="">-- اختر --</option>
                            {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                         </select>
                      </div>
                   ))}
                </div>
                <button onClick={() => processImport('students')} className="w-full bg-blue-600 text-white py-6 rounded-[24px] font-black text-2xl shadow-xl">تأكيد الاستيراد</button>
             </div>
           )}

           <div className="bg-white rounded-[55px] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-right">
                 <thead className="bg-slate-50 font-black text-slate-400 text-[11px] uppercase tracking-widest">
                    <tr>
                       <th className="p-10">الطالب</th>
                       <th className="p-10">رقم الجلوس</th>
                       <th className="p-10">الصف / الفصل</th>
                       <th className="p-10">الحالة</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {students.map(s => (
                       <tr key={s.id} className="hover:bg-slate-50 transition-all">
                          <td className="p-10 font-black text-xl text-slate-800">{s.name}</td>
                          <td className="p-10 font-black text-slate-400 text-lg">#{s.id}</td>
                          <td className="p-10 font-bold text-slate-500">{s.grade} - {s.classroom}</td>
                          <td className="p-10">
                             <span className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-xs font-black">في الانتظار</span>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="space-y-12 animate-in fade-in">
           <div className="bg-white p-14 rounded-[60px] shadow-2xl border border-slate-50 text-center space-y-8">
              <div className="w-32 h-32 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-4 border-white"><TableIcon className="w-16 h-16"/></div>
              <div className="space-y-4">
                 <h2 className="text-4xl font-black text-slate-800 tracking-tighter">محرك التوزيع الذكي</h2>
                 <p className="text-slate-400 font-bold text-xl max-w-2xl mx-auto">سيقوم النظام بتوزيع {students.length} طالب على لجان الاختبار بمعدل 20 طالباً لكل لجنة مع إنشاء المظاريف آلياً.</p>
              </div>
              <div className="flex justify-center gap-6">
                 <button onClick={autoDistribute} className="bg-slate-900 text-white px-14 py-6 rounded-[30px] font-black text-xl shadow-2xl hover:scale-105 transition flex items-center gap-4">
                    <Sparkles className="w-6 h-6 text-yellow-400" /> بدء التوزيع الآلي
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeCommittees.map(comm => (
                 <div key={comm.id} className="bg-white p-8 rounded-[45px] shadow-sm border border-slate-100 space-y-6 hover:shadow-xl transition-all border-r-8 border-r-[#00b5ad]">
                    <div className="flex justify-between items-center">
                       <span className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-lg">لجنة {comm.committee}</span>
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{comm.id}</span>
                    </div>
                    <div className="space-y-3">
                       <p className="font-black text-xl text-slate-800">{comm.venue}</p>
                       <p className="text-slate-400 font-bold text-sm">عدد الطلاب: <span className="text-[#00b5ad]">{comm.students.length} طالب</span></p>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Clock className="w-5 h-5" /></div>
                       <p className="text-sm font-black text-slate-600">{comm.startTime} - {comm.endTime}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Printing Tab */}
      {activeTab === 'printing' && (
        <div className="space-y-12 animate-in fade-in">
           <div className="bg-white p-14 rounded-[60px] shadow-2xl border border-slate-100 text-center space-y-8">
              <div className="w-32 h-32 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto"><Printer className="w-16 h-16"/></div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter">مركز الطباعة والتقارير</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                 <button className="bg-blue-50 p-10 rounded-[40px] border-2 border-blue-100 flex flex-col items-center gap-6 hover:bg-blue-600 hover:text-white transition-all group">
                    <QrCode className="w-12 h-12 text-blue-600 group-hover:text-white" />
                    <span className="text-2xl font-black">ملصقات باركود اللجان</span>
                 </button>
                 <button className="bg-orange-50 p-10 rounded-[40px] border-2 border-orange-100 flex flex-col items-center gap-6 hover:bg-orange-600 hover:text-white transition-all group">
                    <FileText className="w-12 h-12 text-orange-600 group-hover:text-white" />
                    <span className="text-2xl font-black">كشوف تحضير الطلاب</span>
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AdminView;
