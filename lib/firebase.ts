import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// إعدادات Firebase الخاصة بالمشروع
const firebaseConfig = {
  apiKey: "AIzaSyCwfY__wRN6EPmDkgAiw_79DkNUHleOsek",
  authDomain: "controlmoe-6aaef.firebaseapp.com",
  projectId: "controlmoe-6aaef",
  storageBucket: "controlmoe-6aaef.firebasestorage.app",
  messagingSenderId: "99694536274",
  appId: "1:99694536274:web:4a96ab9319b522524e218b"
};

/**
 * تهيئة تطبيق Firebase باستخدام نمط Singleton.
 * يضمن هذا الكود عدم محاولة إعادة تهيئة التطبيق في حال كان مهيأً مسبقاً.
 */
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * تهيئة Firestore صراحة كما هو مطلوب وتصديرها.
 */
const db = getFirestore(app);

export { app, db };