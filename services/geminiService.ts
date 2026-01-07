
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProfessorType, FeedbackPoint } from "../types";
import { PROFESSOR_CONFIGS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
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
        
        大学教授の視点で、この研究の「穴（論理の飛躍、データの不備、前提の誤りなど）」を3〜5点、鋭く指摘してください。
        また、それぞれの指摘がスライドのどのあたり（座標は概算で良い）に関連するかをJSON形式で出力してください。
        
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
      contents: { parts: contents },
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
                  slideIndex: { type: Type.INTEGER, description: "0-indexed slide index" },
                  title: { type: Type.STRING, description: "指摘の短いタイトル" },
                  comment: { type: Type.STRING, description: "具体的な指摘内容" },
                  holeType: { type: Type.STRING, description: "論理の飛躍、統計的不備など" },
                  coordinates: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER, description: "左上X (0-100)" },
                      y: { type: Type.NUMBER, description: "左上Y (0-100)" },
                      w: { type: Type.NUMBER, description: "幅 (0-100)" },
                      h: { type: Type.NUMBER, description: "高さ (0-100)" }
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
      
      教授として、この反論を論破するか、一理ある場合は嫌味ったらしく認めつつ別の穴を指摘してください。
      
      【重要】
      ・返答は100文字以内で、極めて簡潔に行ってください。冗長な解説は不要です。
      ・鋭く、一言で学生を黙らせるようなキレのある言葉を選んでください。
      
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
