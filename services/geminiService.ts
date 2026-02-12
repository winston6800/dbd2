
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDailyPepTalk = async (): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Give me a short, powerful, 3-sentence morning pep talk for a founder whose startup is 'Dead by Default'. Focus on the necessity of survival, the daily hunt for unique visitors, and the aggressive mindset required to shift from default-dead to default-alive.",
    config: {
      temperature: 0.9,
    }
  });
  return response.text || "Traffic is the lifeblood of your survival. Every visitor is a chance to stay alive. Ship it today or vanish.";
};

export interface VerificationResult {
  verified: boolean;
  reason: string;
  metricValue: string | null;
}

export const verifyDashboardScreenshot = async (base64Image: string): Promise<VerificationResult> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  
  const textPart = {
    text: `Analyze this screenshot of a startup dashboard (Google Analytics, Posthog, Stripe, Vercel, etc.). 
    Identify the 'Unique Visitors', 'Users', 'Active Sessions', or 'Total Traffic' metric.
    
    Return a JSON object with:
    { 
      "verified": boolean, 
      "metricValue": "The number or string found (e.g., '1,240')", 
      "reason": "Brief explanation (e.g., 'Found 1.2k Unique Visitors in GA header')" 
    }`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verified: { type: Type.BOOLEAN },
            metricValue: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["verified", "metricValue", "reason"]
        }
      }
    });
    
    const parsed = JSON.parse(response.text || '{"verified": false, "metricValue": null, "reason": "No response"}');
    return {
        verified: parsed.verified,
        metricValue: parsed.metricValue,
        reason: parsed.reason
    };
  } catch (e) {
    console.error("Verification error:", e);
    return { verified: false, metricValue: null, reason: "Verification failed to process." };
  }
};
