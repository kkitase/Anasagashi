
export enum ProfessorType {
  NECHINECHI = 'ねちねち型 (執拗な粗探し)',
  STATISTICS = '統計命型 (データ・検定重視)',
  PASSIONATE = '情熱的鬼教授 (本質と社会意義重視)',
  THEORETICAL = '理論ガチ勢 (モデルと定義重視)'
}

export interface FeedbackPoint {
  id: string;
  slideIndex: number;
  title: string;
  comment: string;
  holeType: string;
  coordinates?: { x: number; y: number; w: number; h: number };
}

export interface ResearchSession {
  slides: string[]; // base64 images
  transcript?: string;
  professorType: ProfessorType;
  feedbacks: FeedbackPoint[];
}

export interface Message {
  role: 'professor' | 'user';
  text: string;
  audio?: string; // base64
}
