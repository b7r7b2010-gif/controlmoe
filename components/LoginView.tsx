
import React, { useState } from 'react';
import { UserRole } from '../types';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLogin: (id: string, role: UserRole) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<UserRole>('TEACHER');

  const roleNames: Record<UserRole, string> = {
    MANAGER: 'مدير المدرسة',
    CONTROL: 'مسؤول الكنترول',
    COUNSELOR: 'المرشد الطلابي',
    TEACHER: 'المعلم المراقب'
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-[40px] shadow-2xl shadow-blue-100 overflow-hidden flex flex-col md:flex-row max-w-5xl w-full border border-white">
        
        {/* Left Side: Form */}
        <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center relative">
          <button className="absolute top-8 right-8 text-gray-400 hover:text-blue-600 flex items-center gap-2 text-sm font-bold transition">
             تغيير الدور
             <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-black text-[#1a2b3c]">دخول {roleNames[role]}</h2>
            <p className="text-gray-400 text-sm font-medium">أدخل رقم {role === 'TEACHER' ? 'المعلم' : 'الهوية'} الخاص بك للوصول للنظام</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-black text-gray-700 block px-2">رقم {role === 'TEACHER' ? 'المعلم' : 'الموظف'}</label>
              <input 
                type="text" 
                placeholder="مثال: 1050"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-white border-2 border-blue-500/20 rounded-2xl py-4 px-6 text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition text-center font-bold tracking-widest placeholder:text-gray-300"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['MANAGER', 'CONTROL', 'COUNSELOR', 'TEACHER'] as UserRole[]).map((r) => (
                <button 
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 min-w-[100px] py-2 text-[10px] font-black rounded-lg transition ${role === r ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                  {roleNames[r]}
                </button>
              ))}
            </div>

            <button 
              onClick={() => onLogin(userId, role)}
              className="w-full bg-[#0086d1] hover:bg-[#007cc3] text-white py-5 rounded-2xl text-xl font-black shadow-xl shadow-blue-100 transition active:scale-95"
            >
              دخول النظام
            </button>
          </div>
        </div>

        {/* Right Side: Branded Banner */}
        <div className="hidden md:flex flex-1 bg-[#0086d1] text-white p-12 flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
          
          <div className="relative z-10 space-y-8">
            <div className="bg-white/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight">النظام الذكي</h1>
              <p className="text-xl font-bold opacity-80">بوابة إدارة الاختبارات المركزية</p>
            </div>

            <div className="h-[2px] w-32 bg-white/20 mx-auto"></div>

            <p className="text-sm font-medium leading-relaxed max-w-xs mx-auto opacity-90">
              نظام متكامل يربط الإدارة، الكنترول، التوجيه الطلابي، والمعلمين.
            </p>
          </div>

          <div className="absolute bottom-8 text-[10px] font-bold opacity-50 tracking-[0.2em] uppercase">
            نظام إدارة الاختبارات المتكامل
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
