
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProfessorType, FeedbackPoint } from "../types";
import { PROFESSOR_CONFIGS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("Gemini API key is missing. Please set GEMINI_API_KEY in your .env file.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeReport(
    reportText: string,
    profType: ProfessorType
  ): Promise<{ text: string; feedbacks: FeedbackPoint[] }> {
    const config = PROFESSOR_CONFIGS[profType];

    const prompt = `以下のレポートの文章を分析し、理系論文の作法や論理構成の観点から添削してください。
    
    【レポート内容】:
    ${reportText}
    
    大学教授の視点で、このレポートの「穴（論理の飛躍、不適切な表現、表記ゆれ、根拠の欠如など）」を3〜5点、鋭く指摘してください。
    それぞれの指摘について、「どこの文章が（originalText）」「どのように修正すべきか（suggestion）」を含めてJSON形式で出力してください。
    
    口調は以下の設定を厳守してください:
    ${config.systemPrompt}`;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        thinkingConfig: { thinkingBudget: 2000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallComment: { type: Type.STRING, description: "教授からの総評。淡々と厳しい口調で。" },
            feedbacks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: "指摘の短いタイトル" },
                  comment: { type: Type.STRING, description: "具体的な指摘理由と内容" },
                  originalText: { type: Type.STRING, description: "レポート内の問題のある箇所の抜粋（一字一句違わず抜き出すこと）" },
                  suggestion: { type: Type.STRING, description: "修正後の具体的な推奨案" },
                  holeType: { type: Type.STRING, description: "論理の飛躍、不適切な語彙、表記ゆれなど" }
                },
                required: ["id", "title", "comment", "originalText", "suggestion"]
              }
            }
          },
          required: ["overallComment", "feedbacks"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      text: result.overallComment,
      feedbacks: result.feedbacks
    };
  }

  async generateProfessorVoice(text: string, profType: ProfessorType): Promise<string> {
    const config = PROFESSOR_CONFIGS[profType];
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `落ち着いたトーンで、少し厳しめに話してください：${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.voice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Voice generation failed");
    return base64Audio;
  }

  async getCounterResponse(
    history: { role: string; text: string }[],
    userMessage: string,
    profType: ProfessorType
  ): Promise<{ text: string; audio: string }> {
    const config = PROFESSOR_CONFIGS[profType];
    const prompt = `
      これまでの議論の流れ:
      ${history.map(m => `${m.role}: ${m.text}`).join('\n')}
      
      学生からの反論: "${userMessage}"
      
      教授として、この反論をさらに論破するか、一理ある場合は嫌味ったらしく認めつつ別の穴を指摘してください。
      絶対に優しくなりすぎないでください。
      
      設定: ${config.systemPrompt}
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const replyText = response.text || "黙りなさい。";
    const audio = await this.generateProfessorVoice(replyText, profType);

    return { text: replyText, audio };
  }
}

export const gemini = new GeminiService();
