
export enum ProfessorType {
  NECHONECHO = 'ねちょねちょ型 (粘着質な粗探し)',
  STATISTICS = '統計命型 (データ・検定重視)',
  PASSIONATE = '情熱的鬼教授 (本質と社会意義重視)',
  THEORETICAL = '理論ガチ勢 (モデルと定義重視)'
}

export interface FeedbackPoint {
  id: string;
  title: string;
  comment: string;
  originalText: string;
  suggestion: string;
  holeType: string;
}

export interface ReportSession {
  reportText: string;
  professorType: ProfessorType;
  feedbacks: FeedbackPoint[];
}

export interface Message {
  role: 'professor' | 'user';
  text: string;
  audio?: string; // base64
}
