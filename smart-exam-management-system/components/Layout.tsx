
import React from 'react';
import { UserRole } from '../types';
import { Bell, LogOut, LayoutGrid } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout }) => {
  const roleDisplay = {
    MANAGER: { title: 'مدير المدرسة', label: 'إدارة عليا', color: '#ffcc00', short: 'مدير' },
    CONTROL: { title: 'مسؤول الكنترول', label: 'الكنترول', color: '#00b5ad', short: 'كنترول' },
    COUNSELOR: { title: 'المرشد الطلابي', label: 'التوجيه الطلابي', color: '#21ba45', short: 'مرشد' },
    TEACHER: { title: 'المعلم المراقب', label: 'لجنة المراقبة', color: '#0086d1', short: 'معلم' }
  }[role];

  return (
    <div className="min-h-screen bg-[#f4f7f9] flex flex-col" dir="rtl">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50 px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#007cc3] p-2 rounded-xl">
              <LayoutGrid className="text-white w-6 h-6" />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-black text-[#1a2b3c]">النظام الذكي</h1>
              <p className="text-[10px] text-gray-400 font-bold -mt-1 tracking-wider uppercase">إدارة الاختبارات</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-indigo-600 transition">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-3 border-r border-gray-100 pr-6">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-800 leading-none">{roleDisplay.title}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-widest uppercase">{roleDisplay.label}</p>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-black shadow-md"
                style={{ backgroundColor: roleDisplay.color }}
              >
                {roleDisplay.short}
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="text-red-400 hover:text-red-600 transition flex items-center gap-2"
              title="تسجيل الخروج"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
