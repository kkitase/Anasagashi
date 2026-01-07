
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProfessorType, FeedbackPoint } from "../types";
import { PROFESSOR_CONFIGS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  }

  async transcribeAudio(base64: string, mimeType: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType: mimeType
          }
        },
        {
          text: "この音声ファイルを正確に文字起こししてください。プレゼンの内容がわかるように出力してください。"
        }
      ]
    });
    return response.text || "";
  }

  async analyzeResearch(
    images: string[],
    transcript: string | undefined,
    profType: ProfessorType
  ): Promise<{ text: string; feedbacks: FeedbackPoint[] }> {
    const config = PROFESSOR_CONFIGS[profType];
    
    const contents = [
      {
        text: `以下の研究進捗スライド（画像）と、プレゼンの書き起こし（もしあれば）を分析してください。
        
        【プレゼン書き起こし】: ${transcript || "なし"}
        
        大学教授の視点で、この研究の「穴」を3〜5点、鋭く指摘してください。
        
        【重要：スライド番号の指定ルール】
        各指摘がどのスライドに関するものか、必ず「slideIndex」で指定してください。
        1枚目のスライドなら slideIndex: 0、2枚目なら slideIndex: 1 としてください。絶対に間違えないでください。
        
        口調は以下の設定を厳守してください:
        ${config.systemPrompt}`
      },
      ...images.map(img => ({
        inlineData: {
          mimeType: "image/png",
          data: img.split(',')[1] || img
        }
      }))
    ];

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: contents as any },
      config: {
        thinkingConfig: { thinkingBudget: 2000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallComment: { type: Type.STRING, description: "教授からの総評。威厳を持って。簡潔に。" },
            feedbacks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  slideIndex: { type: Type.INTEGER, description: "指摘対象のスライド番号。0から始まる数値。" },
                  title: { type: Type.STRING },
                  comment: { type: Type.STRING },
                  holeType: { type: Type.STRING },
                  coordinates: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      w: { type: Type.NUMBER },
                      h: { type: Type.NUMBER }
                    }
                  }
                },
                required: ["id", "slideIndex", "title", "comment"]
              }
            }
          },
          required: ["overallComment", "feedbacks"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // 各指摘事項にボイスを付ける
    const feedbacksWithVoice = await Promise.all(result.feedbacks.map(async (fb: any) => {
      const audio = await this.generateProfessorVoice(fb.comment, profType);
      return { ...fb, audio };
    }));

    return {
      text: result.overallComment,
      feedbacks: feedbacksWithVoice
    };
  }

  async generateProfessorVoice(text: string, profType: ProfessorType): Promise<string> {
    const config = PROFESSOR_CONFIGS[profType];
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `極めて威厳があり、学生が恐怖を感じるような冷徹で低い声で話してください：${text}` }] }],
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
      学生からの反論: "${userMessage}"
      返答は100文字以内で、威厳を持って学生を黙らせてください。
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
