"use client"; // ضروري لأننا سنستخدم useEffect في المتصفح

import { useEffect, useState } from "react";
// تأكد أن المسار صحيح لملف الفايربيس الخاص بك
// إذا كان الملف داخل مجلد lib ومجلد lib بجانب app، استخدم ../lib/firebase
import { db } from "../lib/firebase"; 

export default function Home() {
  const [status, setStatus] = useState("جارِ فحص الاتصال بقاعدة البيانات...");
  const [color, setColor] = useState("black");

  useEffect(() => {
    // هذا الفحص البسيط يتأكد فقط أن كائن قاعدة البيانات تم تحميله بدون أخطاء
    if (db) {
      console.log("🔥 Firebase DB Instance Loaded:", db);
      setStatus("✅ الاتصال بـ Firebase ناجح! (الإصدارات متطابقة)");
      setColor("green");
    } else {
      setStatus("❌ فشل الاتصال بقاعدة البيانات");
      setColor("red");
    }
  }, []);

  return (
    <div style={{ padding: "50px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>نظام إدارة الاختبارات الذكي</h1>
      <div style={{ 
        marginTop: "20px", 
        padding: "20px", 
        border: "2px solid #ccc", 
        borderRadius: "10px",
        backgroundColor: "#f9f9f9"
      }}>
        <h3>حالة النظام:</h3>
        <p style={{ fontWeight: "bold", color: color, fontSize: "18px" }}>
          {status}
        </p>
      </div>
    </div>
  );
}