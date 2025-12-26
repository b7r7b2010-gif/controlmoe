import {GoogleGenAI} from "@google/genai";
import { ExamEnvelope } from "../types";

/**
 * Generates an intelligent report on exam proceedings using Gemini.
 * Utilizes gemini-3-pro-preview for advanced reasoning and high-quality report generation.
 */
export async function generateSmartReport(envelopes: ExamEnvelope[]): Promise<string> {
  try {
    // Initialize Gemini API following strict guidelines for API key and client configuration
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    
    // Process and clean data for the model
    const dataSummary = envelopes.filter(e => !e.id.startsWith('TEMP_')).map(e => ({
      subject: e.subject,
      committee: e.committee,
      status: e.status,
      absentCount: e.students.filter(s => s.status === 'absent').length,
      presentCount: e.students.filter(s => s.status === 'present').length,
      totalStudents: e.students.length
    }));

    if (dataSummary.length === 0) {
      return "لا توجد بيانات كافية حالياً لإنشاء تقرير. يرجى التأكد من جدولة اللجان وبدء الاختبارات.";
    }

    // Call generateContent with the appropriate model and structured prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `بناءً على البيانات التالية لسير الاختبارات اليوم، قم بتوليد تقرير تحليلي شامل: ${JSON.stringify(dataSummary)}`,
      config: {
        systemInstruction: `أنت مستشار تعليمي خبير في إدارة الاختبارات. 
حلل البيانات المرفقة (اللجان، الغياب، حالة التسليم) وقدم تقريراً باللغة العربية يتميز بـ:
1. ملخص تنفيذي لسير العملية.
2. تحليل دقيق لحالات الغياب (النسب المئوية واللجان الأكثر تأثراً).
3. رصد لمدى سرعة إنجاز اللجان (بناءً على حالة المظاريف).
4. توصيات عملية فورية للمدير وللمرشد الطلابي.
استخدم تنسيقاً واضحاً ومباشراً.`,
        thinkingConfig: { thinkingBudget: 16384 },
      },
    });
    
    // Return the generated text using the .text property accessor as per SDK documentation
    return response.text || "حدث خطأ في معالجة التقرير الذكي.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، تعذر الاتصال بخدمة الذكاء الاصطناعي حالياً. يرجى التأكد من مفتاح API Key الخاص بك.";
  }
}