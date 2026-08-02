
import { GoogleGenAI } from "@google/genai";

export const recognizeHandwriting = async (base64Image: string): Promise<string> => {
  // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Strip data URI prefix
  const parts = base64Image.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const imageData = parts[1];

  try {
    // Fix: Follow strictly the multi-part content structure guideline: contents: { parts: [...] }
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageData,
            },
          },
          {
            text: "استخراج متن فارسی از تصویر دست‌نویس پزشکی. فقط متن نهایی را برگردان بدون هیچ توضیح اضافه یا سلام و احوالپرسی.",
          },
        ],
      },
      config: {
        temperature: 0.1, // دقت بالاتر برای OCR
      }
    });

    // Fix: Use the .text property directly instead of response.text() as per guidelines
    return response.text || '';
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    
    // اگر خطای RPC یا شبکه رخ داد، پیامی به زبان فارسی نمایش بده
    if (error.message?.includes('xhr error') || error.message?.includes('500')) {
      throw new Error("اختلال در ارتباط با سرور هوش مصنوعی. لطفا حجم ورودی را کمتر کرده یا دوباره تلاش کنید.");
    }
    
    throw new Error("خطا در بازخوانی متن. لطفا دست‌خط خود را واضح‌تر بنویسید.");
  }
};
