
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
        
        【重要：発表態度の批評】
        もし「プレゼン書き起こし」が存在する場合、スライドの内容だけでなく、話し方、口癖（えー、あのー等）、声のトーン、説明の構成といった「発表態度」についても厳しく批評に含めてください。
        
        【プレゼン書き起こし】: ${transcript || "なし"}
        
        大学教授の視点で、この研究の「穴」および「発表の未熟な点」を3〜5点、鋭く指摘してください。
        
        【重要：スライド番号の指定ルール】
        各指摘がどのスライドに関するものか、必ず「slideIndex」で指定してください。
        1枚目のスライドなら slideIndex: 0、2枚目なら slideIndex: 1 としてください。
        話し方そのものへの指摘（スライドに依存しないもの）は、最も関連の深いスライド、あるいは0枚目に紐づけてください。
        
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
            overallComment: { type: Type.STRING, description: "教授からの総評。スライドの内容と発表態度の両方に触れつつ、威厳を持って。簡潔に。" },
            feedbacks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  slideIndex: { type: Type.INTEGER, description: "指摘対象のスライド番号。0から始まる数値。" },
                  title: { type: Type.STRING },
                  comment: { type: Type.STRING },
                  holeType: { type: Type.STRING, description: "論理の飛躍、データの不備、話し方の未熟さ、等" },
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
